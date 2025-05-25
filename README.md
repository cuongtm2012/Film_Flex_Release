# FilmFlex

A comprehensive movie streaming platform with advanced data synchronization capabilities and sophisticated content management for movie enthusiasts.

## Features

- **Content Management**
  - 22,557+ movies from professional API source
  - Automated daily content updates
  - Full movie details with episodes, recommendations, and metadata
  - Multiple language support
  
- **User Experience**
  - Modern, responsive design across all devices
  - Advanced search with filters and categories
  - Personalized recommendations
  - User watchlists and viewing history
  - User comments and interaction

- **System Architecture**
  - Robust data import system with resume capabilities
  - Role-based access control (admin, moderator, user)
  - Multi-domain support with automatic SSL
  - Performance optimized for high traffic loads

## Tech Stack

- **Frontend**: React, TailwindCSS, shadcn/ui components
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Neon serverless
- **ORM**: Drizzle ORM with type-safe schemas
- **Authentication**: Passport.js with role-based permissions
- **Testing**: Cypress for E2E testing
- **Deployment**: PM2, Nginx, GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 13.x or higher
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/filmflex.git
   cd filmflex
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create `.env` file):
   ```
   NODE_ENV=development
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/filmflex
   SESSION_SECRET=your_secret_key
   ```

4. Run database migrations:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
filmflex/
├── client/             # React frontend
├── server/             # Express backend
├── shared/             # Shared types and utilities
├── scripts/            # Deployment and utility scripts
│   ├── deployment/     # Deployment scripts and guides
│   ├── data/           # Data import scripts
│   ├── maintenance/    # Maintenance scripts
│   └── tests/          # Test scripts
└── tests/              # Test suite
```

The project follows a clean organization pattern:
- All scripts are organized in subdirectories by purpose in the `scripts/` folder
- Each script category has its own README with detailed documentation
- Scripts are referenced directly from their location (e.g., `./scripts/deployment/deploy-filmflex.sh`)

## Deployment and Configuration

### Application Deployment

FilmFlex includes a comprehensive deployment system:

```bash
# First-time setup on a new server
./scripts/deployment/deploy-filmflex.sh --setup

# Deploy or update application
./scripts/deployment/deploy-filmflex.sh

# Run database setup only
./scripts/deployment/deploy-filmflex.sh --db-only
```

### Domain Configuration

FilmFlex supports multiple domains with automated SSL setup:

```bash
# Set up a new domain on your server
bash scripts/domain/setup-domain.sh example.com

# Configure DNS settings for GoDaddy domains
node scripts/domain/configure-godaddy-dns.js example.com 38.54.115.156

# Check DNS propagation and set up SSL certificates
bash scripts/domain/check-dns-setup-ssl.sh example.com
```

The domain scripts fully automate the process of:
- Setting up Nginx configuration 
- Configuring DNS records (via GoDaddy API)
- Installing SSL certificates with Let's Encrypt
- Configuring automatic renewal

For detailed instructions, check the [Deployment Guide](scripts/deployment/README.md) and [Domain Configuration Guide](scripts/domain/README.md).

## Data Management

Import movie data from the external API:

```bash
# Daily import (latest movies only)
bash scripts/data/import-movies.sh

# Deep scan (more thorough import)
bash scripts/data/import-movies.sh --deep-scan

# Complete database import with resume capability
bash scripts/data/import-all-movies-resumable.sh

# Import specific page range
bash scripts/data/import-range.sh
```

The FilmFlex system supports multiple import methods depending on your needs:

- **Daily Updates**: Automatically run via cron job every day
- **Full Import**: One-time import of the entire movie database (22,557+ movies)
- **Resumable Import**: Can be safely interrupted and resumed later

For detailed documentation, see the [Data Management Guide](scripts/data/README.md).

## Testing

Run the test suite:

```bash
# Run all tests with the test runner
./scripts/tests/run_all_tests.sh

# Using npm scripts
npm test                # Run all tests
npm run test:client     # Run frontend tests
npm run test:server     # Run backend tests
npm run cypress:run     # Run E2E tests with Cypress
```

For more information, see the [Testing Guide](scripts/tests/README.md).

## Maintenance

Regular maintenance tasks:

```bash
# Check system status
./scripts/deployment/deploy-filmflex.sh --status

# Reset admin user
./scripts/maintenance/reset_admin.ts

# Optimize database
./scripts/deployment/deploy-filmflex.sh --db-optimize
```

For more details, see the [Maintenance Guide](scripts/maintenance/README.md).

## Documentation

- [Deployment Guide](scripts/deployment/README.md)
- [Data Management Guide](scripts/data/README.md)
- [Testing Guide](scripts/tests/README.md)
- [Maintenance Guide](scripts/maintenance/README.md)
- [API Documentation](http://localhost:5000/api-docs) (when running in development)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# FilmFlex Setup Instructions

## Prerequisites
- Node.js (latest LTS version)
- PostgreSQL 17
- Windows PowerShell

## Setup Steps

1. Ensure PostgreSQL is running:
```powershell
# Check PostgreSQL service status
Get-Service postgresql-x64-17
```

2. Set up the database:
```powershell
# Connect to PostgreSQL as postgres user and create the filmflex user
psql -U postgres
CREATE USER filmflex WITH PASSWORD 'filmflex2024' CREATEDB;
\q
```

3. Run the setup script:
```powershell
# Run as Administrator
.\setup-complete.ps1
```

## Troubleshooting

If you encounter any issues:

1. Check PostgreSQL service:
   - Ensure postgresql-x64-17 service is running
   - If not, start it using: `Start-Service postgresql-x64-17`

2. Database connection issues:
   - Verify PostgreSQL is running on port 5432
   - Check if filmflex user exists
   - Ensure password matches in DATABASE_URL

3. Server startup issues:
   - Check if port 3000 is available
   - Look in logs directory for error messages
   - Ensure all dependencies are installed

## Development

Once setup is complete, the application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3000/api
- Debug interface: chrome://inspect