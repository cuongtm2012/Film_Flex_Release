# FilmFlex Environment Configuration Guide

This document provides detailed information about all environment variables that can be used to configure the FilmFlex application.

## Basic Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Application environment. Set to `production` for optimized performance. |
| `PORT` | `5000` | The port on which the application will run. |

## Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | PostgreSQL connection string in the format `postgresql://user:password@host:port/database`. |
| `PGUSER` | `filmflex` | PostgreSQL username. |
| `PGPASSWORD` | - | PostgreSQL password. |
| `PGDATABASE` | `filmflex` | PostgreSQL database name. |
| `PGHOST` | `localhost` | PostgreSQL host. |
| `PGPORT` | `5432` | PostgreSQL port. |

## Security Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_SECRET` | - | Secret used for session encryption. Should be a long, random string. |
| `COOKIE_SECURE` | `true` | If set to `true`, cookies will only be sent over HTTPS. |
| `COOKIE_HTTP_ONLY` | `true` | If set to `true`, cookies will not be accessible via JavaScript. |
| `COOKIE_MAX_AGE` | `604800000` | Cookie expiration time in milliseconds (default: 1 week). |

## Logging Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum level of logs to output. Possible values: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`. |
| `LOG_FILE` | `/var/log/filmflex/app.log` | Path to the log file. |
| `ERROR_LOG_FILE` | `/var/log/filmflex/error.log` | Path to the error log file. |

## Performance Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_POOL_SIZE` | `20` | Maximum number of database connections in the pool. |
| `DB_CONNECTION_TIMEOUT` | `10000` | Database connection timeout in milliseconds. |
| `DB_IDLE_TIMEOUT` | `30000` | Database idle timeout in milliseconds. |
| `NODE_CLUSTER_INSTANCES` | `max` | Number of Node.js instances to run in cluster mode. Set to `max` to use all available CPUs. |

## Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_USER_REGISTRATION` | `true` | If set to `false`, new user registration will be disabled. |
| `ENABLE_ADMIN_PANEL` | `true` | If set to `false`, the admin panel will be disabled. |
| `ENABLE_API_RATE_LIMITING` | `true` | If set to `true`, API rate limiting will be enabled. |
| `API_RATE_LIMIT` | `100` | Maximum number of API requests per minute per IP. |
| `CACHE_TTL` | `300` | Cache time-to-live in seconds (default: 5 minutes). |

## Advanced Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `TRUST_PROXY` | `true` | If set to `true`, the application will trust the `X-Forwarded-For` header from the proxy. Should be set to `true` when behind a reverse proxy like Nginx. |

## Usage in Deployment

The deployment script (`deploy-filmflex.sh`) will automatically create the `.env` file with these settings. You can customize the values by:

1. Creating a custom `.env` file and passing it to the deployment script:
   ```bash
   ./deploy-filmflex.sh --env=/path/to/custom/.env
   ```

2. Editing the values directly in `scripts/deployment/env.example` before deployment.

3. Updating the values after deployment by editing `/var/www/filmflex/.env` and restarting the application:
   ```bash
   ./deploy-filmflex.sh --restart
   ```

## Security Considerations

- Never commit `.env` files with real credentials to version control.
- Use a strong, unique `SESSION_SECRET` in production.
- Consider using a password manager to generate secure passwords.
- Regularly rotate API keys and secrets.