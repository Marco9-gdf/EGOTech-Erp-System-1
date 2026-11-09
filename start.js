import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=====================================================');
console.log('  🚀 Launching Egotech Payroll & Attendance System  ');
console.log('=====================================================');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Start Server
console.log('📦 Starting Backend API (Port 5000)...');
const server = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true,
});

// 2. Start Client
console.log('💻 Starting React Vite Frontend (Port 3000)...');
const client = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\n🛑 Shutting down server and client...');
  server.kill();
  client.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
