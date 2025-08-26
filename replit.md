# replit.md

## Overview

This is a full-stack AI chat application built with React, Express.js, and TypeScript. The application provides a conversational interface where users can interact with an OpenAI-powered chatbot. It features a modern UI with shadcn/ui components, real-time messaging, conversation management, and both light/dark theme support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for build tooling
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom theme provider with dark/light/system modes

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API endpoints for conversation and message management
- **Development Setup**: Vite middleware integration for hot reloading in development
- **Error Handling**: Centralized error handling middleware

### Data Storage Solutions
- **Database**: PostgreSQL configured via Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema definitions
- **Development Storage**: In-memory storage implementation for development/testing
- **Data Models**: Users, Conversations, and Messages with proper relationships

### Authentication and Authorization
- Currently uses a simple in-memory user system
- Session management with connect-pg-simple for PostgreSQL session store
- User identification via username/password schema

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT integration for AI chat responses
- **Neon Database**: PostgreSQL hosting service via @neondatabase/serverless
- **Replit Integration**: Development environment tooling and error overlays

### Key Libraries
- **UI Framework**: React with shadcn/ui component system
- **Database**: Drizzle ORM with PostgreSQL driver
- **Validation**: Zod for runtime type validation and schema parsing
- **HTTP Client**: TanStack Query for API calls and caching
- **Styling**: Tailwind CSS with class-variance-authority for component variants
- **Date Handling**: date-fns for date formatting and manipulation

### Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Bundling**: esbuild for server-side bundling
- **Code Quality**: TypeScript strict mode configuration
- **Hot Reloading**: Vite HMR with Express middleware integration