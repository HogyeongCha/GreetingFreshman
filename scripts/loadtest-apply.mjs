import { performance } from "node:perf_hooks";
import process from "node:process";

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3000",
    requests: 20,
    concurrency: 10,
    department: "공과대학",
    uniqueIps: true,
  };

  for (const arg of argv) {
    const [key, rawValue] = arg.split("=");
    const value = rawValue ?? "";
    if (key === "--base-url") args.baseUrl = value;
    if (key === "--requests") args.requests = Number(value);
    if (key === "--concurrency") args.concurrency = Number(value);
    if (key === "--department") args.department = value;
    if (key === "--unique-ips") args.uniqueIps = value !== "false";
  }

  return args;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[index]);
}

function makeIp(index) {
  return `10.1.${Math.floor(index / 200) + 1}.${(index % 200) + 1}`;
}

async function fetchSeats(baseUrl) {
  const response = await fetch(`${baseUrl}/api/seats`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load seats: ${response.status}`);
  }
  const data = await response.json();
  return data.seats
    .filter((seat) => seat.status === "AVAILABLE")
    .map((seat) => seat.seatCode);
}

async function holdSeat(baseUrl, seatCode, holdOwnerToken, ip) {
  const response = await fetch(`${baseUrl}/api/seats/hold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ seatCode, holdOwnerToken }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.holdId) {
    throw new Error(payload.error ?? `hold failed (${response.status})`);
  }
  return payload.holdId;
}

async function applySeat(baseUrl, payload, ip) {
  const response = await fetch(`${baseUrl}/api/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return {
    status: response.status,
    error: typeof data.error === "string" ? data.error : null,
    applicationId: data.applicationId ?? null,
    seatCode: data.seatCode ?? payload.seatCode ?? null,
  };
}

async function runScenario(baseUrl, seatCode, department, index, uniqueIps) {
  const ip = uniqueIps ? makeIp(index) : "10.1.0.1";
  const holdOwnerToken = crypto.randomUUID();
  const holdId = await holdSeat(baseUrl, seatCode, holdOwnerToken, ip);
  const startedAt = performance.now();
  const payload = {
    holdId,
    holdOwnerToken,
    name: `Load Test ${index + 1}`,
    studentId: `2026${String(index + 1).padStart(6, "0")}`,
    department,
    phone: `010${String(index + 1).padStart(8, "0")}`,
    schoolEmail: `loadtest${index + 1}@hanyang.ac.kr`,
    instagramId: `loadtest_${index + 1}`,
    consentPersonal: true,
    consentNotice: true,
  };
  const result = await applySeat(baseUrl, payload, ip);
  return {
    ...result,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const seats = await fetchSeats(args.baseUrl);
  if (seats.length < args.requests) {
    throw new Error(`Not enough available seats. Need ${args.requests}, found ${seats.length}.`);
  }

  const queue = seats.slice(0, args.requests).map((seatCode, index) => ({ seatCode, index }));
  const results = [];

  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      if (!job) return;
      results.push(await runScenario(args.baseUrl, job.seatCode, args.department, job.index, args.uniqueIps));
    }
  }

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: Math.min(args.concurrency, args.requests) }, () => worker()));
  const durationMs = Math.round(performance.now() - startedAt);

  const byStatus = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  const errors = results.reduce((acc, item) => {
    if (item.error) acc[item.error] = (acc[item.error] ?? 0) + 1;
    return acc;
  }, {});

  const latencies = results.map((item) => item.latencyMs);
  console.log(JSON.stringify({
    scenario: "hold-and-apply",
    baseUrl: args.baseUrl,
    requests: args.requests,
    concurrency: args.concurrency,
    uniqueIps: args.uniqueIps,
    durationMs,
    statusCounts: byStatus,
    errorCounts: errors,
    latency: {
      min: Math.min(...latencies),
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      max: Math.max(...latencies),
    },
    sample: results.slice(0, 5),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
