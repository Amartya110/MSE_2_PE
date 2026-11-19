import 'dotenv/config';
import { createApp } from './src/app.js';
import { createLogger } from './src/services/logger.js';
import { createProfileService } from './src/services/profileService.js';
import { createPlatformClients } from './src/platforms/index.js';
import { ProfileCache } from './src/services/profileCache.js';
import { connectDatabase, disconnectDatabase } from './src/db.js';
import { UserRepository } from './src/repositories/userRepository.js';
import { AuthService } from './src/auth/authService.js';
import { getJwtSecret } from './src/auth/tokens.js';
import { Judge0Client } from './src/services/judge0Client.js';
import { ExecutionService } from './src/services/executionService.js';

const logger = createLogger();
const profileCache = new ProfileCache();
const userRepository = new UserRepository();
const authService = new AuthService();
const executionService = new ExecutionService({
  judgeClient: new Judge0Client(),
  problemRepository: userRepository,
});
const profileService = createProfileService({
  clients: createPlatformClients(),
  profileCache,
  logger,
  userRepository,
});
const app = createApp({
  profileService,
  userRepository,
  authService,
  executionService,
});
const port = Number.parseInt(process.env.PORT ?? '4000', 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const start = async () => {
  getJwtSecret();
  await connectDatabase();
  const server = app.listen(port);
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
  } catch (error) {
    await disconnectDatabase();
    throw error;
  }
  console.log(`Unified profile API listening on http://localhost:${port}`);

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(async (error) => {
      if (error) {
        console.error('HTTP server shutdown failed:', error);
        process.exitCode = 1;
      }
      await disconnectDatabase();
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  server.on('error', (error) => {
    console.error('HTTP server failed:', error);
    process.exitCode = 1;
    shutdown();
  });
};

start().catch((error) => {
  console.error(
    JSON.stringify({
      event: 'api.startup_failed',
      errorName: error.name ?? 'Error',
      errorCode: error.code ?? 'STARTUP_FAILED',
    }),
  );
  process.exitCode = 1;
});
