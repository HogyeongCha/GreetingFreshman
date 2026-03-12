export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ?? requestUrl.protocol.replace(":", "");
  const expectedOrigin = `${protocol}://${host}`;

  if (origin !== expectedOrigin) {
    const error = new Error("Invalid origin");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}
