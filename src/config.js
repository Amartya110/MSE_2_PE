export const config = {
  requestTimeoutMs: Number.parseInt(process.env.REQUEST_TIMEOUT_MS ?? '12000', 10),
  maxUpstreamResponseBytes: Number.parseInt(
    process.env.MAX_UPSTREAM_RESPONSE_BYTES ?? '5242880',
    10,
  ),
  codeChefApiBaseUrl:
    process.env.CODECHEF_API_BASE_URL ??
    'https://codechef-api.vercel.app/handle',
  logDir: process.env.LOG_DIR ?? './logs',
  cacheDir: process.env.CACHE_DIR ?? './cache',
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME ?? 'unified_cp_dsa_tracker',
};

for (const [name, value] of Object.entries({
  REQUEST_TIMEOUT_MS: config.requestTimeoutMs,
  MAX_UPSTREAM_RESPONSE_BYTES: config.maxUpstreamResponseBytes,
})) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}
