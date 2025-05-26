// Apply database migrations
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex'
});

async function applyMigration() {
  console.log('Applying episode fields migration...');
  
  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, '..', '..', 'server', 'db', 'migrations', '005_add_episode_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(sql);
    console.log('Migration applied successfully');
    
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration()
  .then(() => console.log('Done'))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
