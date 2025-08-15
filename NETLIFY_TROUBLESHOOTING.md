# Netlify Deployment Troubleshooting

## Quick Fix for Current Error

The error you're seeing is because the build process is trying to run database migrations during deployment, but the DATABASE_URL environment variable isn't configured.

### Solution 1: Add Environment Variables
1. Go to your Netlify dashboard
2. Open your site settings
3. Go to "Environment variables"
4. Add these variables:
   ```
   DATABASE_URL=your_neon_database_connection_string
   SESSION_SECRET=your_session_secret_key
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=production
   ```

### Solution 2: Use Updated Build Configuration
The netlify.toml file has been updated to skip migrations during build. Push the updated code to your repository and redeploy.

## Step-by-Step Deployment

1. **Set Environment Variables in Netlify**
   - DATABASE_URL (your Neon database connection string)
   - SESSION_SECRET (any long random string)
   - JWT_SECRET (any long random string)

2. **Push Updated Code**
   The following files have been updated:
   - `netlify.toml` - Removed migration step from build
   - `build-netlify.sh` - Simplified build script
   - `NETLIFY_DEPLOYMENT.md` - Complete deployment guide

3. **Trigger New Deploy**
   - Go to Netlify dashboard
   - Click "Trigger deploy" → "Deploy site"

4. **Run Database Migration After Deploy**
   Once the site is deployed, run migrations separately:
   ```bash
   npm run db:push
   ```

## Common Issues

### "DATABASE_URL, ensure the database is provisioned"
- **Problem**: Environment variable not set
- **Solution**: Add DATABASE_URL to Netlify environment variables

### "vite: not found" Error
- **Problem**: DevDependencies not installed when NODE_ENV=production
- **Solution**: Fixed by using npx commands and moving vite to dependencies

### "Cannot find package 'vite'" Error
- **Problem**: Vite config importing dependencies that aren't available in production build
- **Solution**: Fixed by using NODE_ENV=production and post-processing asset paths with sed command

### Build Command Not Found
- **Problem**: Package.json scripts not found  
- **Solution**: Use npx commands directly in netlify.toml

### Function Bundle Too Large
- **Problem**: Netlify function bundle is over 50MB
- **Solution**: Already optimized with external dependencies in esbuild config

## Verification

After deployment, your app should be available at:
- Frontend: `https://your-site-name.netlify.app`
- API: `https://your-site-name.netlify.app/api/...`

Test the API by visiting:
`https://your-site-name.netlify.app/api/public/subscription-packages`