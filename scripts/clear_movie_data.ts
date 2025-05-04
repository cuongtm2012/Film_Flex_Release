import { db } from './server/db';
import { movies, episodes } from './shared/schema';
import { sql } from 'drizzle-orm';

async function clearMovieData() {
  console.log('Clearing episodes table...');
  await db.delete(episodes);
  
  console.log('Clearing movies table...');
  await db.delete(movies);
  
  // Reset sequences if needed
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('movies', 'id'), 1, false);`);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('episodes', 'id'), 1, false);`);
  
  console.log('Done! All movie and episode data has been cleared.');
  console.log('You can now run the import script from the beginning.');
  
  process.exit(0);
}

clearMovieData().catch(error => {
  console.error('Error clearing movie data:', error);
  process.exit(1);
});