#!/bin/bash
# Build script for Netlify deployment

echo "🚀 Building FinanceFlow for Netlify..."

# Build frontend
echo "📦 Building frontend..."
npm run build:frontend

# Build Netlify functions
echo "⚡ Building Netlify functions..."
npm run build:functions

echo "✅ Netlify build completed!"
echo "📁 Frontend assets: dist/public"
echo "⚡ Netlify functions: netlify/functions"