import { performance } from "node:perf_hooks";
import process from "node:process";

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3000",
    seatCode: "A1",
    requests: 50,
    concurrency: 20,
    uniqueIps: true,
  };

  for (const arg of argv) {
    const [key, rawValue] = arg.split("=");
    const value = rawValue ?? "";
    if (key === "--base-url") args.baseUrl = value;
    if (key === "--seat-code") args.seatCode = value;
    if (key === "--requests") args.requests = Number(value);
    if (key === "--concurrency") args.concurrency = Number(value);
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
  return `10.0.${Math.floor(index / 200) + 1}.${(index % 200) + 1}`;
}

async function runRequest(baseUrl, seatCode, index, uniqueIps) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/api/seats/hold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": uniqueIps ? makeIp(index) : "10.0.0.1",
    },
    body: JSON.stringify({
      seatCode,
      holdOwnerToken: crypto.randomUUID(),
    }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  return {
    status: response.status,
    latencyMs: Math.round(performance.now() - startedAt),
    error: typeof payload.error === "string" ? payload.error : null,
    requestId: response.headers.get("x-request-id"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queue = Array.from({ length: args.requests }, (_, index) => index);
  const results = [];

  async function worker() {
    while (queue.length) {
      const index = queue.shift();
      if (index === undefined) return;
      results.push(await runRequest(args.baseUrl, args.seatCode, index, args.uniqueIps));
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
    scenario: "seat-hold-contention",
    baseUrl: args.baseUrl,
    seatCode: args.seatCode,
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
