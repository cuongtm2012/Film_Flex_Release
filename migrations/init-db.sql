-- Create user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles 
      WHERE  rolname = 'filmflex') THEN
      CREATE USER filmflex WITH PASSWORD 'filmflex2024';
   END IF;
END
$do$;

-- Create database if not exists
SELECT 'CREATE DATABASE filmflex'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'filmflex')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex; 