#!/usr/bin/env node

// Script to start development server with proper Vite configuration for Replit
process.env.NODE_ENV = 'development';
process.env.VITE_ALLOWED_HOSTS = 'all';
process.env.DANGEROUSLY_DISABLE_HOST_CHECK = 'true';

import { spawn } from 'child_process';

const child = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    VITE_ALLOWED_HOSTS: 'all',
    DANGEROUSLY_DISABLE_HOST_CHECK: 'true'
  }
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});