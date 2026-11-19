import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const webPort = process.env.NEXT_PORT ?? '3000';
const children = [
  spawn(process.execPath, ['--watch', 'server.js'], {
    cwd: projectRoot,
    stdio: 'inherit',
  }),
  spawn(
    process.execPath,
    [
      path.join('node_modules', 'next', 'dist', 'bin', 'next'),
      'dev',
      '-p',
      webPort,
    ],
    { cwd: projectRoot, stdio: 'inherit' },
  ),
];

let stopping = false;

const stop = (exitCode) => {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  children.forEach((child) => {
    if (child.exitCode === null) child.kill();
  });
};

children.forEach((child) => {
  child.on('error', (error) => {
    console.error('Could not start a development server:', error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
});

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
