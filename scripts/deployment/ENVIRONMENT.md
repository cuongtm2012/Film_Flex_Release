# FilmFlex Environment Variables Guide

This guide explains how to set up environment variables for different deployment environments.

## Production Environment Variables

For production deployment, you need to set up environment variables to configure the application. These variables control database connections, security settings, and application behavior.

### Setting Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp scripts/deployment/env.example .env
   ```

2. Edit the `.env` file with your production values:
   ```bash
   nano .env
   ```

3. Make sure to change all sensitive values, especially:
   - `DATABASE_URL` and all PostgreSQL connection variables
   - `SESSION_SECRET` (use a strong random string)
   - `ADMIN_PASSWORD` (set a secure password)

### Critical Variables to Customize

| Variable | Description | Recommendation |
|----------|-------------|----------------|
| `DATABASE_URL` | PostgreSQL connection string | Update with your actual database credentials |
| `SESSION_SECRET` | Secret for session encryption | Generate a random string (32+ characters) |
| `ADMIN_PASSWORD` | Initial admin password | Use a strong password (12+ characters) |
| `PGPASSWORD` | PostgreSQL password | Match your database setup |

### Security Best Practices

1. **Never commit `.env` files to version control**
2. **Use different values in each environment** (development, staging, production)
3. **Regularly rotate sensitive credentials** (every 90 days)
4. **Use environment-specific secrets management** in CI/CD pipelines

## Managing Environment Variables in CI/CD

For GitHub Actions and other CI/CD pipelines, store environment variables as secrets:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add each environment variable as a repository secret
4. Reference them in your workflow files:
   ```yaml
   env:
     DATABASE_URL: ${{ secrets.DATABASE_URL }}
     SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
   ```

## Additional Environment Configuration

For advanced deployment scenarios:

### Load Balancing

If deploying behind a load balancer, add:
```
TRUST_PROXY=true
```

### Redis for Session Storage

For scalable deployments with multiple server instances:
```
REDIS_URL=redis://username:password@host:port
SESSION_STORE=redis
```

### External Services

If integrating with external APIs:
```
TMDB_API_KEY=your_api_key
PAYMENT_GATEWAY_KEY=your_payment_key
```

## Troubleshooting

If you encounter environment-related issues:

1. Verify all required variables are set
2. Check for typos in variable names
3. Ensure values don't contain unescaped special characters
4. Validate database connection string format
5. Check file permissions on the `.env` file (should be readable by the application user)

For additional help, consult the logging output for environment-related errors.