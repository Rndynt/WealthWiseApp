# Netlify Deployment Guide for FinanceFlow

## Overview
This guide explains how to deploy the FinanceFlow application to Netlify using serverless functions, following the same architecture as the TradingJournal project.

## Netlify Configuration

### Files Created/Modified
1. `netlify.toml` - Netlify configuration file
2. `netlify/functions/api.ts` - Serverless function handler
3. `build-netlify.sh` - Build script for deployment
4. `NETLIFY_DEPLOYMENT.md` - This deployment guide

### Build Process
The application uses a multi-step build process:
1. **Frontend Build**: `vite build` → outputs to `dist/public`
2. **Functions Build**: ESBuild bundles the API function → outputs to `netlify/functions`

## Deployment Steps

### 1. Prerequisites
- Netlify account
- GitHub repository connected to Netlify
- Environment variables configured in Netlify dashboard

### 2. Environment Variables
Configure these in your Netlify dashboard (Site settings > Environment variables):
```
DATABASE_URL=your_neon_database_url
SESSION_SECRET=your_session_secret_key  
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

**Important**: Make sure your DATABASE_URL is properly set. The build will fail if this environment variable is missing.

### 3. Build Commands
The netlify.toml file already configures the build settings. Make sure these are set in your Netlify dashboard:
- **Build command**: `npm ci && npm run build:frontend && npm run build:functions`
- **Publish directory**: `dist/public`
- **Functions directory**: `netlify/functions`

**Note**: Database migrations are handled separately - not during build time.

### 4. Alternative Build Script
Use the provided build script:
```bash
./build-netlify.sh
```

## Architecture

### Serverless Function Structure
```
netlify/functions/api.ts
├── Express.js app setup
├── Session middleware (cookie-based for serverless)
├── Route registration from server/routes
├── Error handling
└── Serverless-http wrapper
```

### Request Flow
```
User Request → Netlify Edge → Function → Express Routes → Database → Response
```

### URL Routing
- `/api/*` → `/.netlify/functions/api/:splat`
- `/*` → `/index.html` (SPA fallback)

## Key Features

### Session Management
- Cookie-based sessions for serverless compatibility
- 7-day session persistence
- Secure cookie configuration

### Static Assets
- Frontend assets served from Netlify CDN
- Optimized CSS and JS bundles
- Asset compression and caching

### Database Integration
- Neon PostgreSQL with connection pooling
- Drizzle ORM with serverless driver
- Migration support through build process

## Testing Deployment

### Local Testing
```bash
# Build the application
./build-netlify.sh

# Test locally with netlify-cli
netlify dev
```

### Production Verification
1. Check function logs in Netlify dashboard
2. Verify database connectivity
3. Test authentication flow
4. Confirm session persistence

## Common Issues

### Build Errors
- **Migration Error**: If you see "DATABASE_URL, ensure the database is provisioned", make sure the DATABASE_URL environment variable is set in Netlify dashboard
- **Dependencies**: Ensure all external dependencies are listed in esbuild externals
- **Environment Variables**: Check that all required environment variables are configured

### Database Migration
Run database migrations manually after deployment:
```bash
# In your local environment or via Netlify CLI
npm run db:push
```

### Runtime Errors
- Check Netlify function logs
- Verify session configuration
- Confirm API route registration

### Performance
- Monitor function cold starts
- Optimize bundle size if needed
- Use proper caching headers

## Monitoring

### Netlify Analytics
- Function execution time
- Error rates
- Request volume

### Application Metrics
- Database connection health
- Authentication success rate
- User session persistence

## Security Considerations

### Environment Variables
- Never commit secrets to repository
- Use Netlify's encrypted environment variables
- Rotate secrets regularly

### Session Security
- HTTPS-only cookies in production
- Proper CORS configuration
- Session timeout management

### Database Security
- Connection string encryption
- Query parameterization
- Access logging

## Maintenance

### Updates
1. Test changes locally
2. Deploy to staging first
3. Monitor function logs
4. Verify core functionality

### Scaling
- Netlify automatically scales functions
- Monitor database connection limits
- Consider function timeout limits

## Support
For issues specific to this deployment:
1. Check Netlify function logs
2. Review build output
3. Verify environment configuration
4. Test database connectivity