# FilmFlex Architecture

## Overview

FilmFlex is a movie streaming platform that allows users to browse, search, and watch movies and TV series. The application follows a modern web application architecture with a Node.js backend, React frontend, and PostgreSQL database. It employs a RESTful API design for communication between the client and server.

## System Architecture

FilmFlex uses a standard client-server architecture with the following key components:

1. **Frontend**: React-based single-page application with Tailwind CSS and Radix UI components
2. **Backend**: Node.js Express server using TypeScript
3. **Database**: PostgreSQL database with Drizzle ORM
4. **Authentication**: Session-based authentication using Passport.js
5. **External API Integration**: Movie data is fetched from an external API (phimapi.com)

The overall architecture follows modern best practices for web applications, with a clear separation of concerns between the client, server, and database layers.

## Key Components

### Frontend Components

- **Client Application**: A React-based SPA built with Vite, located in the `client/src` directory
- **UI Framework**: Uses a combination of Tailwind CSS for styling and Radix UI components for accessible UI elements
- **State Management**: Uses React Query for server state management and data fetching
- **Routing**: Implements client-side routing (likely with React Router, though not directly specified in available files)
- **Form Handling**: Uses React Hook Form with Zod for form validation

### Backend Components

- **API Server**: Express.js server providing RESTful endpoints, located in the `server` directory
- **Authentication Middleware**: Passport.js with local strategy for user authentication
- **API Integration**: Services for fetching and processing data from external movie API
- **Database Access**: Drizzle ORM for type-safe database queries

### Database Schema

The application uses a PostgreSQL database with the following main entities:

- **Users**: Stores user account information with roles and permissions
- **Movies**: Stores movie metadata including title, description, poster, etc.
- **Episodes**: Stores episode data for TV series
- **Comments**: Stores user comments on movies
- **Watchlist**: Tracks movies users have added to their watchlist
- **ViewHistory**: Tracks user viewing history
- **Roles & Permissions**: Implements role-based access control

The schema is defined using Drizzle ORM in the `shared/schema.ts` file, providing a type-safe interface to the database.

## Data Flow

### Movie Data Flow

1. The external API (`phimapi.com`) serves as the source of movie data
2. The server fetches movie data through the API integration layer (`server/api.ts`)
3. Movies are processed and stored in the local database
4. The client requests movie data from the server through REST endpoints
5. The server retrieves the requested data from the database and returns it to the client

### User Interaction Flow

1. Users authenticate through the login/registration endpoints
2. Authenticated users can interact with movies (add to watchlist, leave comments, view history)
3. User actions are recorded in the database
4. The server provides personalized content based on user history and preferences

## External Dependencies

### Frontend Dependencies

- **React**: Core UI library
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible UI component library
- **React Query**: Data fetching and state management
- **React Hook Form**: Form handling library
- **Zod**: Schema validation library

### Backend Dependencies

- **Express**: Web server framework
- **Passport.js**: Authentication middleware
- **Drizzle ORM**: Type-safe database access
- **Node-fetch**: HTTP client for external API requests
- **ws**: WebSocket library for database connections

### External Services

- **phimapi.com**: External API providing movie data
- **BrowserStack**: Used for cross-browser testing

## Authentication and Authorization

- **Authentication**: Session-based authentication using Passport.js
- **Session Management**: Uses express-session with PostgreSQL session store
- **Password Security**: Implements secure password hashing using scrypt
- **Role-Based Access Control**: Implements different user roles (admin, moderator, premium, normal)
- **Authorization Middleware**: Custom middleware for checking user roles and permissions

## Deployment Strategy

The application supports multiple deployment strategies:

### Production Deployment

- **Target Environment**: VPS with Ubuntu 22.04 LTS
- **Process Management**: PM2 for Node.js process management and clustering
- **Web Server**: Nginx as a reverse proxy
- **Database**: PostgreSQL database
- **CI/CD**: GitHub Actions for automated deployment
- **SSL**: Let's Encrypt for SSL certificate management

### Development Setup

- **Local Development**: Vite dev server with HMR
- **Replit Support**: Configuration for Replit development environment

### Monitoring and Maintenance

- **Logging**: Application-level logging with timestamps
- **Backup**: Automated database backup scripts
- **Monitoring**: PM2 for process monitoring

## Testing Strategy

- **API Testing**: Comprehensive API tests for backend functionality
- **Component Testing**: React component tests using Jest and Testing Library
- **End-to-End Testing**: Cypress for E2E testing
- **Cross-Browser Testing**: BrowserStack integration for cross-browser testing

## Performance Considerations

- **Server-Side**: 
  - Node.js clustering through PM2 for improved performance
  - API response caching (5-minute TTL)
  - Pagination of data-heavy endpoints

- **Client-Side**:
  - React Query for efficient data fetching and caching
  - Image optimization for faster load times
  - Dynamic imports for code splitting

## Security Measures

- **Authentication**: Secure session-based authentication
- **Password Storage**: Secure password hashing with scrypt
- **HTTPS**: SSL/TLS encryption
- **Input Validation**: Server-side validation of all user inputs
- **Role-Based Access**: Fine-grained permission system