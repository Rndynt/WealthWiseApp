#!/usr/bin/env node

// Start the application in production mode to bypass Vite host checking
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Starting FinanceFlow in production mode...');

// Build the application first
console.log('Building application...');
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: __dirname,
  stdio: 'inherit'
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('Build completed successfully. Starting server...');
    
    // Start the production server
    const serverProcess = spawn('node', ['dist/index.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      serverProcess.kill('SIGINT');
      process.exit(0);
    });
  } else {
    console.error('Build failed with code:', code);
    process.exit(1);
  }
});