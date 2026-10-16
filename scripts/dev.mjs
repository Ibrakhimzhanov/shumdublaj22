/* Разработка: поднимаем Vite и запускаем Electron на его адрес. */
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import electron from 'electron';

const server = await createServer({ server: { port: 5177, strictPort: true } });
await server.listen();
const url = server.resolvedUrls.local[0];
server.printUrls();

const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, SV_DEV: url }
});

child.on('close', async () => {
  await server.close();
  process.exit(0);
});
