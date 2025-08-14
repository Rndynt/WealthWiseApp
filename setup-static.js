#!/usr/bin/env node

// Script to ensure static files are available for Replit hosting
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Setting up static files for Replit hosting...');

try {
  // Build the frontend
  console.log('Building frontend...');
  execSync('npm run build:frontend', { stdio: 'inherit' });
  
  // Ensure server/public directory exists
  const serverPublicDir = path.resolve('server', 'public');
  if (!fs.existsSync(serverPublicDir)) {
    fs.mkdirSync(serverPublicDir, { recursive: true });
  }
  
  // Copy built files to server/public
  console.log('Copying build files to server/public...');
  execSync('cp -r dist/public/* server/public/', { stdio: 'inherit' });
  
  console.log('Static files setup complete!');
} catch (error) {
  console.error('Error setting up static files:', error);
  process.exit(1);
}