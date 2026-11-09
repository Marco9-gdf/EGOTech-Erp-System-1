import { fileURLToPath } from 'node:url';

// Automatically detect if node:sqlite requires --experimental-sqlite (Node 22 LTS on Render/Linux)
let sqliteAvailable = false;
try {
  await import('node:sqlite');
  sqliteAvailable = true;
} catch (err) {
  if (err.code === 'ERR_UNKNOWN_BUILTIN_MODULE') {
    const { spawn } = await import('node:child_process');
    const child = spawn(
      process.execPath,
      ['--experimental-sqlite', ...process.execArgv, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --experimental-sqlite`.trim(),
        },
      }
    );
    child.on('exit', (code) => process.exit(code ?? 0));
    await new Promise(() => {});
  } else {
    throw err;
  }
}

let app;
if (sqliteAvailable) {
  const serverModule = await import('./server.js');
  app = serverModule.default;
}

export default app;
