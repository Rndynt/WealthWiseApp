#!/usr/bin/env node

// Patch to fix Vite host validation for Replit
const originalSetupVite = require('./server/vite.ts').setupVite;

// Override setupVite to disable host checking
require.cache[require.resolve('./server/vite.ts')].exports.setupVite = async function(app, server) {
  // Set environment variables before Vite starts
  process.env.DANGEROUSLY_DISABLE_HOST_CHECK = 'true';
  process.env.VITE_ALLOWED_HOSTS = 'all';
  
  // Patch Vite's dev server middleware to accept all hosts
  const originalMiddleware = require('vite').createServer;
  require('vite').createServer = function(config) {
    if (config && config.server) {
      config.server.allowedHosts = 'all';
      config.server.host = '0.0.0.0';
    }
    return originalMiddleware(config);
  };
  
  return originalSetupVite(app, server);
};

// Now start the server
require('./server/index.ts');