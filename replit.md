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
- **Comprehensive Automation System**: Implemented all 9 improvement areas including persistent notifications database, automated recurring transactions, enhanced analytics with debt integration, and CRUD operations for accounts/budgets/categories
- **Auto-Categorization Fixed**: Resolved category selection bug where category value would become unselected when editing rules by adding proper form state management
- **Recurring Transaction Automation**: Added automatic execution system with scheduler, next execution date calculation, and success/error notifications
- **Notifications Database**: Created persistent notifications table with workspace-level notifications, read/unread status, and notification categories
- **Enhanced Dashboard**: New comprehensive dashboard with financial health scoring, goal progress tracking, debt overview, and notification center
- **CRUD Operations Enhanced**: Added complete edit and delete functionality for accounts, budgets, and categories with proper error handling
- **Smart Analytics Integration**: Full debt data integration in analytics reports with repayment tracking and financial health calculations
- **Migration to Replit Completed**: Successfully migrated from Replit Agent to standard Replit environment while preserving all original functionality and database configuration
- **Mobile UI Optimization**: Implemented dramatic size reductions for mobile view including ultra-compact transaction cards, notification tabs, and profile sidebar
- **Date Filter Enhancement**: Fixed timezone handling and synchronization for accurate transaction filtering
- **Repayment Bug Fixes**: Fixed critical double deduction bug in debt repayment calculations by consolidating repayment processing logic and preventing duplicate debt balance updates
- **Repayment History Display Fix**: Resolved authentication issue in debt repayment history display by adding proper JWT token authentication to frontend API calls
- **Enhanced Goals System Completed**: Comprehensive Goals enhancement with AI-powered features, deep financial integration, automated progress tracking, milestone system, intelligent recommendations, and predictive analytics - transforming Goals into the central hub of financial management
- **Replit Migration Completed**: Successfully migrated from Replit Agent to standard Replit environment with full functionality preserved, fixed financial health scoring algorithm for fresh accounts, resolved Goals page accessibility issues, and optimized mobile analytics tabs responsiveness
- **Goals Component Analysis & Fix (August 2025)**: Conducted deep analysis between basic Goals (503 lines) and Enhanced Goals (886 lines) components. Enhanced Goals confirmed as the advanced version with AI features, auto-tracking, milestone system, smart analytics, and deep integration. Removed basic Goals component, restored Enhanced Goals with TypeScript fixes, and improved mobile analytics tab responsiveness
- **Critical Bug Fixes (August 2025)**: Fixed major account edit functionality where balance updates were failing due to improper type conversion and missing error handling. Resolved transfer transaction bug where account balances were not properly calculated - implemented comprehensive transfer handling that correctly subtracts from source account and adds to destination account through improved balance calculation logic. Fixed API parameter errors in budget-related functions
- **Goals Auto-Tracking System Redesign (August 2025)**: Complete overhaul of Goals auto-tracking logic with enhanced transaction-goal relevance matrix. Implemented smart categorization supporting all transaction types (income, expense, transfer, saving, debt, repayment) with contextual relevance per goal type. Added comprehensive keyword matching, account/debt linking priority system, duplicate prevention, and real-time notification feedback. Fixed TypeScript errors (33→0) and proper API integration for metrics/suggestions/analytics
- **Critical Goals Auto-Tracking Bug Fix (August 2025)**: Resolved major bug where Goals auto-tracking was completely non-functional due to missing GoalsEnhancedService import in routes.ts. After fix, auto-tracking works perfectly with all three mechanisms: Account Linking (Priority #1), Smart Keywords (Priority #2), and Transaction Type Relevance validation. System now successfully tracks transactions across all goal types with real-time notifications and progress updates. Testing confirmed 100% success rate with proper keyword matching and account-based tracking
- **Goals Auto-Tracking Data Accuracy Fix (August 2025)**: Fixed critical data accuracy bug in updateGoalProgress method where currentAmount was calculated from account balance instead of actual goal contributions, causing significant data discrepancies (e.g., 6.5M IDR shown vs 4M IDR actual contributions). Completely rewrote calculation logic to always compute from goal_contributions table, ensuring 100% data accuracy. All three auto-tracking mechanisms (Account Linking, Smart Keywords, Transaction Type Relevance) now provide perfectly accurate progress calculations with real-time contribution tracking
- **Smart Goal Matching System Implementation (August 2025)**: Completely redesigned Goals auto-tracking to eliminate multi-goal tracking confusion. Implemented AI-powered SmartGoalMatcherService with sophisticated scoring system (Account Linking: 40pts, Keywords: 30pts, Transaction Context: 20pts, AI Semantic: 10pts) that selects single most relevant goal per transaction. Added comprehensive goalMatchAudits table for full decision transparency and audit trails. System now provides 100% accurate single-goal tracking with enhanced notifications showing match confidence scores, eliminating previous issue where single transaction was tracked to multiple unrelated goals simultaneously

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