# FilmFlex Data Import Scripts

This directory contains scripts for importing movie data from an external API into the FilmFlex database.

## Files

- `import-movies-sql.cjs` - The main CommonJS script that fetches movie data from the API and imports it into the database
- `import-movies.sh` - Bash wrapper script for running the import script in a development environment
- `production-import-movies.sh` - Bash wrapper script for running the import script in a production environment
- `setup-cron.sh` - Script to set up a cron job for automated data import on the production server

## Development Testing

To test the data import functionality in development:

```bash
# Make scripts executable
chmod +x scripts/data/*.sh scripts/data/*.cjs

# Run the import script
bash scripts/data/import-movies.sh
```

## Production Deployment

To deploy these scripts to the production server:

```bash
# Make the deployment script executable
chmod +x scripts/deployment/update-filmflex-import.sh

# Run the deployment script
bash scripts/deployment/update-filmflex-import.sh
```

This will:
1. Copy the import scripts to the production server
2. Make them executable
3. Set up a cron job to run the import automatically twice a day (6 AM and 6 PM)

## Cron Job Details

The cron job is configured to run the data import script twice daily:
- At 6:00 AM (to get new content released overnight)
- At 6:00 PM (to get content released during the day)

The cron job configuration is stored at `/etc/cron.d/filmflex-data-import` on the production server.

## Logs

Import script logs are stored in the following locations:
- Development: `[project_root]/log/data-import.log`
- Production: `/var/log/filmflex/data-import.log`

## Database Schema Notes

The script is designed to work with the following database tables:
- `movies` - Stores movie metadata
- `episodes` - Stores episode data for TV series

The script will only import new movies that don't already exist in the database, based on the `slug` field.
For TV series, episode data will be imported through the API routes when accessing the series details.