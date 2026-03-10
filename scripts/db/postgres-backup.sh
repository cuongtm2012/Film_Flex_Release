# Configuration
CONTAINER_NAME="filmflex-postgres"
DB_NAME="filmflex"
DB_USER="filmflex"
DB_PASSWORD="filmflex2024"
# Use relative path from project root or allow override via environment variable
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$(dirname "$(dirname "$(realpath "$0")")")")/backups/postgres}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30