# FilmFlex

A comprehensive movie streaming platform optimized for seamless deployment and sophisticated database management across multiple hosting environments.

## Features

- Modern React frontend with responsive design
- NeonDB PostgreSQL for scalable data storage
- Full user authentication and role management
- Admin panel for content and user management
- Advanced movie search and filtering
- Watchlist and favorites functionality
- Comprehensive testing with Cypress

## Tech Stack

- **Frontend**: React, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (NeonDB)
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **Testing**: Jest, Cypress
- **Deployment**: PM2, Nginx

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
├── tests/              # Test suite
└── deploy.sh           # Main deployment script
```

## Deployment

FilmFlex includes a comprehensive deployment system:

```bash
# First-time setup
./deploy.sh --setup

# Deploy or update application
./deploy.sh

# Run database setup only
./deploy.sh --db-only
```

For detailed deployment instructions, check the [Deployment Guide](scripts/deployment/README.md).

## Data Management

Import movie data from external API:

```bash
# Start the import process
./deploy.sh --import
```

For more information, see the [Data Management Guide](scripts/data/README.md).

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run frontend tests
npm run test:client

# Run backend tests
npm run test:server

# Run E2E tests with Cypress
npm run cypress:run
```

For more information, see the [Testing Guide](scripts/tests/README.md).

## Maintenance

Regular maintenance tasks:

```bash
# Check system status
./deploy.sh --status

# Reset admin user
./deploy.sh --reset-admin

# Optimize database
./deploy.sh --db-optimize
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