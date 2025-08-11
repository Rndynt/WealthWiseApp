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

### RBAC and Subscription System
- **Roles**: Four-tier role system (root, admin, user basic, user premium)
- **Permissions**: Granular permission system for resource access control
- **Subscription Packages**: Configurable subscription tiers with workspace/member limits
- **User Subscriptions**: Active subscription tracking with automatic limit enforcement

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

### Development Environment
- Local development with Vite dev server
- Hot module replacement for rapid iteration
- Development-specific middleware and logging
- Database connection to remote Neon instance

### Production Build Process
1. Frontend built with Vite to static assets
2. Backend bundled with ESBuild for Node.js runtime
3. Static assets served from Express.js
4. Environment variables for configuration management

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

## User Preferences
Preferred communication style: Simple, everyday language.