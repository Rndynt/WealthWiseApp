#!/bin/bash
# Build script for Netlify deployment

echo "🚀 Building FinanceFlow for Netlify..."

# Build frontend
echo "📦 Building frontend..."
npx vite build

# Build Netlify functions
echo "⚡ Building Netlify functions..."
npx esbuild netlify/functions/api.ts --bundle --platform=node --target=node18 \
  --external:@neondatabase/serverless \
  --external:express-session \
  --external:connect-pg-simple \
  --external:bcrypt \
  --external:jsonwebtoken \
  --external:ws \
  --format=esm \
  --outdir=netlify/functions

echo "✅ Netlify build completed!"
echo "📁 Frontend assets: dist/public"
echo "⚡ Netlify functions: netlify/functions"