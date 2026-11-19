import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { config } from '../config.js';

export const createLogger = ({ logDir = config.logDir } = {}) => ({
  async log(entry) {
    await mkdir(logDir, { recursive: true });
    const line = Buffer.from(`${JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    })}\n`);
    await pipeline(
      Readable.from([line]),
      createWriteStream(join(logDir, 'sync.log'), { flags: 'a' }),
    );
  },
});
