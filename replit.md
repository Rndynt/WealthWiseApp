# FinanceFlow - Personal Finance Management Application

## Overview

FinanceFlow is a full-stack personal finance management application built with a modern tech stack. It features a React frontend with TypeScript, an Express.js backend, PostgreSQL database with Drizzle ORM, and comprehensive financial management capabilities including multi-workspace support, transaction tracking, budgeting, and collaboration features.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration for development and production
- **UI Components**: Radix UI primitives with custom theming

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **API Design**: RESTful API with structured error handling
- **Middleware**: Custom logging, CORS, and authentication middleware

### Database Architecture
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM with schema-first approach
- **Migration**: Drizzle Kit for database migrations
- **Connection**: Connection pooling with WebSocket support

## Key Components

### Authentication System
- JWT token-based authentication
- Secure password hashing with bcrypt
- Protected routes with middleware validation
- User registration and login endpoints

### Workspace Management
- Multi-workspace support (personal, family, business)
- Role-based access control (owner, editor, viewer)
- Workspace member management
- Hierarchical data organization

### Financial Data Models
- **Users**: Core user authentication and profile data with role-based access control
- **Workspaces**: Organization units for financial data (subscription-limited)
- **Accounts**: Financial accounts (transaction, asset types)
- **Categories**: Expense/income categorization (income, needs, wants)
- **Transactions**: Financial transactions with detailed metadata
- **Budgets**: Budget planning and tracking
- **Debts**: Debt and credit management

### Enhanced RBAC and Subscription System
- **Roles**: Four-tier role system (root, admin, user_basic, user_premium) with proper security boundaries
- **Enhanced Permissions**: Separated admin.* and user.* permissions with .pages/.access granularity for menu visibility vs feature access
- **Subscription Packages**: Enhanced packages (basic, premium, professional, business) with specific feature limitations
- **User Subscriptions**: Subscription-aware permission enforcement preventing privilege escalation through workspace invitations
- **Security Features**: Root bypass permissions, subscription-limited collaboration features, proper role hierarchy

### UI Component System
- Comprehensive shadcn/ui component library
- Responsive design with mobile-first approach
- Dark/light theme support
- Accessible components with ARIA compliance
- Custom hooks for mobile detection and toast notifications

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Backend validates credentials and generates JWT token
3. Token stored in localStorage and included in API requests
4. Protected routes verify token before granting access

### Workspace Data Flow
1. User selects workspace from sidebar dropdown
2. All subsequent API calls include workspace context
3. Data filtered by workspace permissions and membership
4. Real-time updates through React Query cache invalidation
5. Workspace creation limited by subscription tier (1 for basic, unlimited for premium)

### Transaction Management Flow
1. User creates/edits transactions through modal forms
2. Data validated on client and server sides
3. Database updated through Drizzle ORM transactions
4. UI updated through optimistic updates and cache refresh

## External Dependencies

### Core Framework Dependencies
- React 18 with TypeScript support
- Express.js for backend API
- Drizzle ORM for database operations
- TanStack Query for server state management

### UI and Styling
- Tailwind CSS for utility-first styling
- Radix UI for accessible component primitives
- Lucide React for consistent iconography
- Class Variance Authority for component variants

### Database and Authentication
- Neon Database for PostgreSQL hosting
- bcrypt for password hashing
- jsonwebtoken for JWT authentication
- WebSocket support for real-time features

### Development Tools
- Vite for fast development and building
- ESBuild for production bundling
- TypeScript for type safety
- PostCSS for CSS processing

## Deployment Strategy

### Development Environment (Replit)
- Local development with static file serving for compatibility
- Hot module replacement during development
- Development-specific middleware and logging
- Database connection to remote PostgreSQL instance

### Production Build Process
#### Replit Hosting
1. Frontend built with Vite to static assets (`dist/public`)
2. Backend bundled with ESBuild for Node.js runtime
3. Static assets served from Express.js
4. Environment variables for configuration management

#### Netlify Hosting (Serverless)
1. Frontend built with Vite to static assets (`dist/public`)
2. Backend bundled as Netlify serverless function (`netlify/functions/api.js`)
3. Static assets served from Netlify CDN
4. Database migrations and environment variables managed through Netlify dashboard

### Database Management
- Schema defined in shared TypeScript files
- Migrations managed through Drizzle Kit
- Connection pooling for production scalability
- Environment-based connection string configuration

### Architecture Decisions

#### Monorepo Structure
- **Problem**: Managing shared types and schemas between frontend and backend
- **Solution**: Shared folder with common TypeScript definitions
- **Benefits**: Type safety across the stack, reduced duplication
- **Trade-offs**: Slightly more complex build process

#### Drizzle ORM Choice
- **Problem**: Need for type-safe database interactions
- **Solution**: Drizzle ORM with schema-first approach
- **Benefits**: Excellent TypeScript integration, lightweight, good performance
- **Alternatives**: Prisma (more features but heavier), raw SQL (more control but less safety)

#### TanStack Query for State Management
- **Problem**: Complex server state management with caching
- **Solution**: TanStack Query for server state, React hooks for local state
- **Benefits**: Automatic caching, background updates, optimistic updates
- **Trade-offs**: Learning curve, additional dependency

#### JWT Authentication
- **Problem**: Stateless authentication for API security
- **Solution**: JWT tokens with localStorage storage
- **Benefits**: Stateless, scalable, standard approach
- **Alternatives**: Session-based auth (simpler but requires session storage)

## Changelog
- June 28, 2025. Initial setup
- August 11, 2025. Implemented comprehensive RBAC system with subscription-based workspace limits
- August 14, 2025. Fixed Replit hosting compatibility by switching from Vite dev server to static file serving to resolve "blocked request" host validation errors
- August 14, 2025. Conducted comprehensive security audit and implemented enhanced RBAC with admin/user permission separation, .pages/.access granularity, and subscription-aware enforcement
- August 14, 2025. Successfully migrated from Replit Agent to Replit environment with PostgreSQL database setup and static file serving configuration
- August 15, 2025. Added Netlify deployment support with serverless functions following TradingJournal architecture pattern

## Recent Solutions

### Enhanced RBAC Security Implementation (August 14, 2025)
**Problem**: Security vulnerabilities found including permission mismatch, privilege escalation through workspace invitations, missing admin/user separation, and hardcoded root user checks.
**Solution**: Implemented comprehensive enhanced RBAC system:
1. **New Permission Structure**: Separated admin.* (system administration) from user.* (feature access) permissions
2. **Granular Access Control**: Added .pages (menu visibility) and .access (feature access) permission granularity
3. **Subscription-Aware Enforcement**: Basic users limited to 3 categories/2 budgets, collaboration requires Professional+
4. **Enhanced Seeder**: New database seeder with proper role-permission assignments and security boundaries
5. **Root User Bypass**: Implemented proper bypass system removing hardcoded email checks

**Test Accounts Created**:
- Root: root@financeflow.com (admin123) - Full system access
- Admin: admin@financeflow.com (admin123) - System administration  
- Basic: basic@financeflow.com (demo123) - Limited features
- Premium: premium@financeflow.com (demo123) - Personal unlimited
- Demo: demo@financeflow.com (demo123) - Basic demo account

### Replit Host Validation Fix (August 14, 2025)
**Problem**: Application showed "blocked request" errors due to Vite dev server not accepting Replit's dynamic host domains.
**Solution**: Switched from Vite development server to static file serving for Replit compatibility:
1. Modified `server/index.ts` to always use `serveStatic()` instead of `setupVite()`
2. Build frontend to `dist/public` and copy to `server/public` for static serving
3. This approach matches successful TradingJournal project pattern
4. Application now works on both Replit development and Netlify production

**Commands to rebuild**:
```bash
npm run build
mkdir -p server/public
cp -r dist/public/* server/public/
```

### Netlify Deployment Setup (August 15, 2025)
**Objective**: Configure application for Netlify serverless deployment following TradingJournal project pattern.
**Implementation**: 
1. **Netlify Configuration**: Created `netlify.toml` with build commands, redirects, and function settings
2. **Serverless Function**: Built `netlify/functions/api.ts` using serverless-http wrapper around Express routes
3. **Build Process**: Created `build-netlify.sh` script for frontend and function compilation
4. **Session Management**: Configured cookie-based sessions for serverless compatibility
5. **Asset Handling**: Fixed asset paths and configured proper static file serving

**Files Created**:
- `netlify.toml` - Netlify platform configuration
- `netlify/functions/api.ts` - Serverless API handler
- `build-netlify.sh` - Deployment build script
- `NETLIFY_DEPLOYMENT.md` - Comprehensive deployment guide

**Deployment Commands**:
```bash
# Build for Netlify
./build-netlify.sh

# Or manually:
npx vite build
npx esbuild netlify/functions/api.ts --bundle --platform=node --target=node18 \
  --external:@neondatabase/serverless --external:express-session \
  --external:connect-pg-simple --external:bcrypt --external:jsonwebtoken \
  --external:ws --format=esm --outdir=netlify/functions
```

**Fixed Issues**:
- Resolved "vite: not found" error by moving vite to dependencies and using npx commands
- Updated netlify.toml to use direct npx commands instead of npm scripts
- Fixed devDependencies installation issue in Netlify production environment

## User Preferences
Preferred communication style: Simple, everyday language.