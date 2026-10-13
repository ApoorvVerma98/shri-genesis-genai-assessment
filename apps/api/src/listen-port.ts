/** Render and other PaaS set PORT; local dev uses API_PORT or 3001. */
export function resolveListenPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PORT ?? env.API_PORT ?? "3001";
  const port = Number(raw);
  return Number.isFinite(port) && port > 0 ? port : 3001;
}
