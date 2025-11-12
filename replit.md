# Gerador de Escala Mensal

## Overview

This is a React-based monthly schedule generator application designed to automatically create service duty rosters for students. The system distributes students across various service posts (like guard duty, sentinels, kitchen duty, etc.) throughout a month, ensuring fair rotation and balanced workload distribution among different student classes (A, B, C).

The application generates comprehensive monthly schedules with analytics, supports data persistence, and exports schedules to PDF format. It's built as a single-page application with a focus on data management and scheduling logic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool

**UI Component Library**: shadcn/ui (Radix UI primitives) with Tailwind CSS
- Custom design system following Material Design principles
- "New York" style variant with neutral color scheme
- Comprehensive component library for forms, dialogs, tables, and data display

**State Management**:
- React Context API for application-wide state (ConfigContext, ScheduleContext)
- React Query (@tanstack/react-query) for server state management (though currently not heavily utilized)
- Local component state with React hooks

**Routing**: Wouter (lightweight client-side routing)
- Single main route (Home) with a 404 fallback

**Key Design Decisions**:
- Single-column layout (not sidebar-based) for simplicity
- Form-heavy interface with Material Design patterns for data input
- Table-based schedule visualization with scroll areas
- Mobile-responsive grid layouts

### Core Application Logic

**Schedule Generation Engine** (`client/src/services/scheduleEngine.ts`):
- Implements round-robin rotation algorithm across three student classes (A, B, C)
- Fair distribution mechanism ensuring balanced workload
- Supports ignored days (holidays, weekends)
- Handles multi-slot service posts (e.g., "sentinelas (1/3)", "sentinelas (2/3)")

**Analytics System**:
- Tracks student assignment counts and distribution
- Calculates statistics per student and per service post
- Provides fairness metrics and balance reporting

**PDF Export** (`client/src/services/pdfExporter.ts`):
- Uses jsPDF and jspdf-autotable libraries
- Generates landscape-oriented monthly schedules
- Includes responsible official signatures and formatting

**Data Persistence** (`client/src/services/persistence.ts`):
- LocalStorage-based configuration persistence
- JSON import/export functionality for schedule backups
- Stores student lists, service posts, and user preferences

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- Minimal REST API structure (routes currently placeholder)
- Vite middleware integration for development
- Session support infrastructure (connect-pg-simple)

**Database Layer**:
- Drizzle ORM configured for PostgreSQL
- Schema definitions in `shared/schema.ts`
- Migration system via drizzle-kit
- Currently using in-memory storage (MemStorage class) as fallback

**Architectural Note**: The backend is currently minimal with most business logic running client-side. The infrastructure supports future server-side features like user authentication, schedule persistence, and multi-user collaboration.

### Data Models

**Domain Types** (defined in `shared/schema.ts`):
- `Student`: Student number and class assignment (A, B, C, or N/A)
- `ServicePost`: Service post name and number of slots
- `ScheduleCell`: Individual assignment with weekend/ignored day flags
- `ScheduleDay`: Complete day structure with all assignments
- `GenerationConfig`: Input parameters for schedule generation
- `GenerationResult`: Complete generated schedule with metadata
- `AnalyticsResult`: Statistical analysis of generated schedule

**Student Classification System**:
- Automatic class detection based on student number ranges
- Class A: Numbers ending in 1-25
- Class B: Numbers ending in 26-50
- Class C: Numbers ending in 51-75

### Configuration Management

**User Configuration**:
- Student lists (newline-separated numbers)
- Service post definitions
- Slot counts per post
- Ignored days (comma-separated)
- Month/year selection
- Responsible official details

**Persistence Strategy**:
- LocalStorage for user preferences and configuration
- JSON export for complete schedule backups
- Import functionality for restoring saved schedules

### UI/UX Design Patterns

**Typography**: Inter font family with hierarchical sizing
- Page titles: 30px (text-3xl)
- Section headers: 20px (text-xl)
- Body text: 14-16px (text-sm/base)
- Table headers: 12px uppercase

**Spacing System**: Tailwind spacing scale (2, 4, 6, 8, 12, 16, 24)

**Color System**: CSS custom properties with HSL values
- Light/dark mode support infrastructure
- Semantic color tokens (primary, secondary, destructive, muted, accent)
- Border and shadow tokens for depth

**Responsive Strategy**:
- Mobile-first approach with breakpoint modifiers (md, lg)
- Grid layouts that adapt from 1 column to 2-3 columns
- Scroll areas for large data tables

## External Dependencies

**UI & Styling**:
- Radix UI primitives (@radix-ui/*) - Accessible component primitives
- Tailwind CSS - Utility-first CSS framework
- class-variance-authority - Component variant management
- clsx + tailwind-merge - Class name utilities

**Data & Forms**:
- React Hook Form - Form state management
- Zod - Schema validation
- drizzle-zod - Zod schema generation from Drizzle schemas

**PDF Generation**:
- jsPDF - PDF document creation
- jspdf-autotable - Table layout plugin

**Date Handling**:
- date-fns - Date utility library

**Database**:
- Drizzle ORM - Type-safe ORM
- @neondatabase/serverless - Neon PostgreSQL driver
- PostgreSQL - Primary database (configured but not actively used yet)

**Development Tools**:
- Vite - Build tool and dev server
- TypeScript - Type safety
- ESBuild - Production bundling
- Replit plugins - Development environment integration

**State Management**:
- @tanstack/react-query - Server state management
- Wouter - Lightweight routing

**Note**: The application is configured for PostgreSQL via Drizzle ORM, but the actual database connection is not actively used in the current implementation. All data operations are currently client-side or use in-memory storage.