# Veganizer

## Overview

Veganizer is a French web application that converts omnivorous recipes into vegan alternatives with nutritional analysis, climate impact calculations, animal savings tracking, and automated shopping list generation. The application features a modern React frontend with a Node.js/Express backend, utilizing PostgreSQL with Drizzle ORM for data persistence. It includes a comprehensive database of French recipes, ingredient substitutions, nutritional data based on the Ciqual 2020 database, AGRIBALYSE climate data, and affiliate supplement integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Logo Implementation (September 2025)**: Updated frontend to use logo2.svg across all components
  - **Frontend Integration**: Header, landing page, and all PWA assets updated
  - **Responsive Sizing**: Optimized logo dimensions for mobile and desktop
  - **PWA Assets**: Favicon, manifest, and meta tags configured
- **Backend/Frontend Connection Audit**: Fixed critical authentication logout endpoint mismatch
- **Supplement Integration**: Connected database supplements with affiliate links to nutritional and environmental calculations
- **Mobile Responsiveness**: Enhanced nutrition charts and mobile user experience
- **Component Architecture**: Created dedicated AnimalSavings component with proper feature card layout

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: Shadcn/ui components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **State Management**: TanStack Query v5 for server state and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Chart.js and Recharts for nutritional comparison visualizations
- **Animation**: Framer Motion for smooth transitions and interactions

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Connection**: Neon serverless database with connection pooling
- **Authentication**: Replit Auth integration with session management
- **Session Management**: Express sessions with PostgreSQL store
- **Data Import**: CSV parsing for recipe, nutritional, and climate data import

### Data Models
- **Recipes Table**: Stores original recipes with up to 6 ingredients and their vegan equivalents
- **Ingredient Substitutions**: Maps omnivorous ingredients to vegan alternatives with ratios
- **Ciqual Data**: French nutritional database (3,186 items) for ingredient analysis
- **Climate Data**: AGRIBALYSE environmental impact metrics (CO2, water, land usage)
- **Animal Impact**: Animal savings calculations with species-specific data
- **Supplements**: Affiliate product database with nutritional and environmental data
- **User Favorites**: Personal recipe collection with menu planning
- **Menu Planning**: Weekly meal planning with auto-provisioned menus
- **Unique Constraints**: Normalized text matching using unaccent for French language support

### API Design
- **RESTful Endpoints**: 
  - `/api/recipes/convert` - Recipe conversion with nutritional, climate, and animal impact analysis
  - `/api/recipes/search` - Recipe search with French text normalization
  - `/api/favorites` - User favorite recipe management
  - `/api/menus` - Menu planning and meal organization
  - `/api/supplements` - Supplement data with affiliate links
  - `/api/admin/*` - Comprehensive admin panel endpoints
- **Authentication Endpoints**: 
  - `/api/auth/user` - User session management
  - `/api/login` - Replit Auth login
  - `/api/logout` - Session logout
- **Error Handling**: Centralized error middleware with structured responses
- **Request Logging**: Detailed API request logging with response capture
- **Rate Limiting**: Exponential backoff for auth requests to prevent flooding

### Business Logic
- **Recipe Conversion**: Smart matching algorithm finding vegan alternatives from database
- **Substitution Engine**: Ingredient-level replacements with category-based fallbacks
- **Nutritional Analysis**: Comparative analysis between original and vegan versions with supplement recommendations
- **Climate Impact**: AGRIBALYSE data integration for environmental footprint calculations
- **Animal Savings**: Species-specific calculations showing animals saved per recipe conversion
- **Shopping List Generation**: Categorized ingredient lists with cost estimation and affiliate links
- **Menu Planning**: Auto-provisioned weekly menus populated from user favorites

### Core Features
- **Recipe Database**: 450+ predefined French recipes with vegan conversions
- **Unauthenticated Access**: Full recipe conversion available without login
- **User Authentication**: Google, Apple, and email login via Replit Auth
- **Personalized Favorites**: Save and organize converted recipes
- **Menu Planning**: "Mon Plan Alimentaire" with weekly calendar view
- **Admin Panel**: Comprehensive data management with user, recipe, and substitution control
- **PWA Support**: Mobile installation with offline capabilities
- **Responsive Design**: Mobile-first approach with touch-friendly interactions

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection for Neon database
- **drizzle-orm**: Type-safe PostgreSQL ORM with migration support
- **express**: Web server framework with middleware ecosystem
- **@tanstack/react-query**: Server state management and caching (v5)
- **csv-parser**: CSV file processing for data import

### UI Dependencies
- **@radix-ui/react-***: Accessible component primitives (dialog, dropdown, etc.)
- **tailwindcss**: Utility-first CSS framework with custom design system
- **chart.js**: Data visualization for nutritional comparisons
- **recharts**: Additional chart components for data visualization
- **lucide-react**: Icon library for consistent visual elements
- **framer-motion**: Animation library for smooth transitions

### Authentication & Session
- **passport**: Authentication middleware
- **passport-local**: Local authentication strategy
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **jsonwebtoken**: JWT token handling

### Development Tools
- **vite**: Fast build tool with TypeScript and React support
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundling for production builds
- **drizzle-kit**: Database migration and schema management

### Database Integration
- **ws**: WebSocket support for Neon database connections
- **zod**: Runtime type validation with drizzle-zod integration
- **date-fns**: Date manipulation utilities

## Technical Implementation Status

### Fully Implemented ✅
- Recipe conversion with nutritional analysis
- Climate impact calculations using AGRIBALYSE data
- Animal savings tracking with species breakdown
- User authentication and session management
- Favorite recipes with database persistence
- Menu planning with weekly calendar
- Admin panel with full CRUD operations
- Supplement recommendations with affiliate links
- PWA functionality with offline support
- Mobile-responsive design
- French language localization

### Architecture Strengths
- **Type Safety**: End-to-end TypeScript with shared schemas
- **Performance**: TanStack Query caching with optimistic updates
- **Accessibility**: Radix UI primitives with proper ARIA support
- **SEO**: Open Graph tags and meta descriptions
- **Security**: Session-based authentication with CSRF protection
- **Scalability**: Serverless database with connection pooling

The application implements a full-stack TypeScript architecture with strong type safety from database to UI, leveraging modern React patterns, PostgreSQL for reliable data persistence, and comprehensive French culinary data for accurate recipe conversions.