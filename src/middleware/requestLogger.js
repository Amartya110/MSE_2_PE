import { randomUUID } from 'node:crypto';

export const requestLogger = (request, response, next) => {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  request.requestId = requestId;
  response.setHeader('X-Request-ID', requestId);

  response.once('finish', () => {
    console.info(
      JSON.stringify({
        event: 'http.request',
        requestId,
        method: request.method,
        statusCode: response.statusCode,
        durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
      }),
    );
  });

  next();
};
