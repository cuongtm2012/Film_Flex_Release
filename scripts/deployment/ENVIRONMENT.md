# FilmFlex Environment Configuration Guide

This document provides information about the environment variables used by the FilmFlex application and how to properly configure them for different deployment environments.

## Environment Variables

The FilmFlex application requires the following environment variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NODE_ENV` | The current environment | `production` |
| `PORT` | The port the server will listen on | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://filmflex:filmflex2024@localhost:5432/filmflex` |
| `PGUSER` | PostgreSQL username | `filmflex` |
| `PGPASSWORD` | PostgreSQL password | `filmflex2024` |
| `PGDATABASE` | PostgreSQL database name | `filmflex` |
| `PGHOST` | PostgreSQL host | `localhost` |
| `PGPORT` | PostgreSQL port | `5432` |
| `SESSION_SECRET` | Secret key for session encryption | `your-secret-key-here` |

## Setting Up the Environment

For production deployment, environment variables are stored in a `.env` file located at `/var/www/filmflex/.env`. This file is automatically created during deployment if it doesn't exist.

You can also manually create or update this file:

```bash
cd /var/www/filmflex
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
PGUSER=filmflex
PGPASSWORD=filmflex2024
PGDATABASE=filmflex
PGHOST=localhost
PGPORT=5432
SESSION_SECRET=your-secret-key-here
EOF
```

## Environment-Specific Configurations

### Development Environment

For development, you may want to use different settings:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex_dev
PGUSER=filmflex
PGPASSWORD=filmflex2024
PGDATABASE=filmflex_dev
PGHOST=localhost
PGPORT=5432
SESSION_SECRET=dev-secret-key
```

### Testing Environment

For testing, consider these settings:

```bash
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex_test
PGUSER=filmflex
PGPASSWORD=filmflex2024
PGDATABASE=filmflex_test
PGHOST=localhost
PGPORT=5432
SESSION_SECRET=test-secret-key
```

## Important Notes

1. **Security**: Keep your `.env` file secure and never commit it to version control.
2. **Session Secret**: Always use a strong, unique value for `SESSION_SECRET` in production.
3. **Database Password**: Use a strong password for the database in production.
4. **Port Configuration**: If you change the port, make sure to update any proxy configurations (like Nginx) accordingly.

## Database Configuration

### Creating a New Database

If you need to create a new PostgreSQL database:

```bash
sudo -u postgres psql -c "CREATE USER filmflex WITH PASSWORD 'filmflex2024';"
sudo -u postgres psql -c "CREATE DATABASE filmflex OWNER filmflex;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;"
```

### Updating Database Connection

If you need to update the database connection settings, modify the `.env` file and restart the application:

```bash
# Edit the .env file
nano /var/www/filmflex/.env

# Restart the application
pm2 restart filmflex
```

## Troubleshooting Environment Issues

### Checking Environment Variables

To check if environment variables are properly loaded:

```bash
cd /var/www/filmflex
NODE_ENV=production node -e "console.log(process.env.DATABASE_URL)"
```

### Common Environment Issues

1. **Missing Variable**: If the application fails with an error about missing environment variables, check if all required variables are defined in the `.env` file.
2. **Invalid Connection String**: If the database connection fails, verify the format of `DATABASE_URL` and that all database credentials are correct.
3. **Permission Issues**: Ensure the application has permission to read the `.env` file.

## Best Practices

1. Use different databases for development, testing, and production environments.
2. Regularly rotate session secrets and database passwords.
3. Limit database user permissions to only what is necessary.
4. Use environment-specific logging levels.