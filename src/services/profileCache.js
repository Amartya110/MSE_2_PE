import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, rename } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { config } from '../config.js';

export class ProfileCache {
  constructor({ cacheDir = config.cacheDir } = {}) {
    this.cacheDir = cacheDir;
  }

  async write(profile) {
    await mkdir(this.cacheDir, { recursive: true });
    const key = createHash('sha256')
      .update(`${profile.platform}:${profile.handle.toLowerCase()}`)
      .digest('hex');
    const json = Buffer.from(`${JSON.stringify(profile, null, 2)}\n`);
    const target = join(this.cacheDir, `${key}.json`);
    const temporary = join(this.cacheDir, `${key}.${randomUUID()}.tmp`);
    await pipeline(Readable.from([json]), createWriteStream(temporary, { flags: 'wx' }));
    await rename(temporary, target);
  }
}
