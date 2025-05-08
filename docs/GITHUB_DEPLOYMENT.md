# FilmFlex GitHub Actions Deployment

This document explains how to set up and use the GitHub Actions workflows for deploying FilmFlex.

## Setup Instructions

### 1. Add Required Secrets

Go to your GitHub repository settings, select "Secrets and variables" → "Actions", and add the following secrets:

| Secret Name | Description |
|-------------|-------------|
| `SERVER_IP` | The IP address of your production server (e.g., 38.54.115.156) |
| `SERVER_USER` | The SSH username for your server (e.g., root) |
| `SSH_PASSWORD` | The SSH password for your server |
| `DATABASE_URL` | Your PostgreSQL connection string (e.g., postgresql://filmflex:filmflex2024@localhost:5432/filmflex) |

### 2. Verify Repository Structure

Ensure your repository has the following structure for the workflows to function properly:

```
.
├── .github/workflows/          # Contains GitHub Actions workflow files
├── client/                     # Frontend React application
│   └── dist/                   # Built frontend files (created during build)
├── scripts/
│   ├── data/                   # Data import scripts
│   └── deployment/             # Deployment scripts
│       ├── filmflex-server.cjs # Production server file
│       └── final-deploy.sh     # Main deployment script
└── ...
```

## Available Workflows

### `filmflex-deploy.yml`

This is the main deployment workflow that includes:

1. Building and testing the application
2. Uploading the necessary files to the production server
3. Running the deployment script
4. Verifying the deployment

#### Deployment Modes

The workflow supports three deployment modes that can be selected when manually triggering the workflow:

1. **standard** (default): Regular deployment with no special options
2. **full-rebuild**: Completely rebuilds the deployment directory from scratch
3. **db-fix-only**: Only runs the database schema fix script without deploying the application

### Manual Triggering

To manually trigger a deployment:

1. Go to the "Actions" tab in your GitHub repository
2. Select "FilmFlex Full Deployment" from the workflows list
3. Click "Run workflow"
4. Choose the desired deployment mode
5. Click "Run workflow" to start the deployment process

### Automatic Triggering

The workflow is automatically triggered on:
- Any push to the `main` branch (except for changes to `.md` and `.gitignore` files)

## Troubleshooting

If the deployment fails, check the following:

1. **GitHub Actions Logs**: Go to the Actions tab and check the workflow run logs for errors.

2. **Server Logs**: SSH into your server and check:
   - PM2 logs: `pm2 logs filmflex`
   - Deployment logs: `tail -100 /var/log/filmflex/github-deploy.log`
   - Application logs: `tail -100 /var/log/filmflex/final-deploy-*.log`

3. **Common Issues**:
   - SSH connection problems: Verify your server IP, username, and password
   - Build failures: Check if your local build succeeds with `npm run build`
   - Database issues: Run the database fix script manually on the server

## Maintenance

For regular maintenance, use the following deployment strategies:

1. **Daily Updates**: Use the "standard" deployment mode for routine updates

2. **Major Updates**: Use the "full-rebuild" mode when making significant changes to the application

3. **Database Fixes**: Use the "db-fix-only" mode when you only need to update the database schema

## Security Considerations

- The workflow uses SSH password authentication. For better security, consider switching to SSH key-based authentication.
- Secrets are stored in GitHub's secure environment and are not exposed in logs.