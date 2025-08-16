# FinanceFlow - Personal Finance Management Application

## Overview
FinanceFlow is a full-stack personal finance management application designed to help users manage their finances effectively. It provides comprehensive capabilities including multi-workspace support for organizing personal, family, or business finances, transaction tracking, budgeting, and collaborative features. The project aims to offer a robust and user-friendly solution for financial oversight and planning.

## User Preferences
Preferred communication style: Simple, everyday language.
Development approach: Mobile-first UI/UX with ultra-compact designs for optimal mobile experience.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite
- **UI Components**: Radix UI primitives for accessibility and custom theming

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcrypt
- **API Design**: RESTful API
- **Middleware**: Custom logging, CORS, authentication

### Database
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (schema-first approach)
- **Migration**: Drizzle Kit
- **Connection**: Connection pooling and WebSocket support

### Key Features & Design Decisions
- **Authentication**: JWT token-based, secure password hashing, protected routes.
- **Workspace Management**: Multi-workspace support (personal, family, business), role-based access control (owner, editor, viewer), hierarchical data organization. Workspace creation is subscription-tier limited.
- **Financial Data Models**: Comprehensive models for Users, Workspaces, Accounts, Categories, Transactions, Budgets, and Debts.
- **Enhanced RBAC and Subscription System**: Four-tier role system (root, admin, user_basic, user_premium) with granular permissions (`admin.*`, `user.*` with `.pages` for menu visibility and `.access` for feature access). Subscription packages (basic, premium, professional, business) enforce feature limitations and prevent privilege escalation through workspace invitations.
- **Mobile-First UI/UX**: Ultra-compact design system optimized for mobile devices with micro text sizes (text-[9px], text-[10px]), reduced padding (p-2), tiny avatars (w-6 h-6), and minimal spacing for maximum content density.
- **UI Component System**: Utilizes shadcn/ui for responsive, accessible components, with dark/light theme support and mobile-optimized sizing.
- **Enhanced Pull-to-Refresh**: Smooth animations with visual feedback including background gradients and improved user experience.
- **Monorepo Structure**: Shared TypeScript definitions between frontend and backend for type safety.
- **PWA Support**: Implemented as a Progressive Web App (PWA) with manifest, service worker for offline caching, push notifications, and app shortcuts.

### Recent Changes (August 2025)
- **Migration to Replit**: Successfully migrated from Replit Agent to standard Replit environment with proper build configuration
- **User Subscriptions Page Fixed**: Resolved data loading issues by fixing safeFetch function and API response parsing
- **Pull-to-Refresh Redesigned**: Complete redesign with mobile app standards - 80px threshold, proper resistance, smooth animations, no element overlapping
- **Collaborations Access Fixed**: Root users can now access collaborations page by bypassing subscription checks and using enhanced permissions
- **Settings Page Implemented**: Full settings functionality with theme switching, currency selection, security options, and advanced configuration
- **Database Seeding Fixed**: Resolved foreign key constraint issues using TRUNCATE CASCADE approach for proper database reset
- **Mobile UI Optimization**: Implemented dramatic size reductions for mobile view including ultra-compact transaction cards, notification tabs, and profile sidebar
- **Date Filter Enhancement**: Fixed timezone handling and synchronization for accurate transaction filtering

## External Dependencies

### Core Framework Dependencies
- React 18
- Express.js
- Drizzle ORM
- TanStack Query

### UI and Styling
- Tailwind CSS
- Radix UI
- Lucide React (iconography)
- Class Variance Authority

### Database and Authentication
- Neon Database (for PostgreSQL hosting)
- bcrypt
- jsonwebtoken
- ws (WebSocket support)

### Development Tools
- Vite
- ESBuild
- TypeScript
- PostCSS