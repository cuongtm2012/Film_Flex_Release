#!/usr/bin/env tsx
/**
 * PhimGG Database Reset Script
 * 
 * This script performs a complete reset and reinitialization of the film database.
 * It drops and recreates all tables, ensuring data integrity and consistency.
 * 
 * Usage:
 * npx tsx scripts/data/reset-film-database.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from '../../shared/schema';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Environment variables
if (!process.env.DATABASE_URL) {
  // Try to load from .env file if it exists
  try {
    if (fs.existsSync(path.join(process.cwd(), '.env'))) {
      require('dotenv').config();
    }
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set.');
    console.error('Please set it before running this script.');
    process.exit(1);
  }
}

const databaseUrl = process.env.DATABASE_URL;

// Initialize PostgreSQL pool
console.log('Initializing connection pool...');
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false, // Disable SSL for local connections
});

// Create Drizzle instance
const db = drizzle(pool, { schema });

/**
 * Drop all tables in the database
 */
async function dropAllTables() {
  console.log('Dropping all existing tables...');
  
  try {
    const client = await pool.connect();
    
    // Get all table names in the current schema
    const res = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Drop each table without using session_replication_role
    // We'll use CASCADE to automatically drop dependencies
    for (const row of res.rows) {
      const tableName = row.tablename;
      console.log(`  Dropping table: ${tableName}`);
      await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    client.release();
    console.log('All tables dropped successfully.');
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  }
}

/**
 * Generate new migration files using drizzle-kit
 */
async function generateMigrations() {
  console.log('Generating database schema...');
  
  try {
    // Check if migrations directory exists, create if not
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Instead of generating migrations, we'll prepare the database using push
    // This will execute in the applyMigrations function
    console.log('Schema generation prepared. Will apply directly using push instead of migrations.');
  } catch (error) {
    console.error('Error preparing schema generation:', error);
    throw error;
  }
}

/**
 * Apply all migrations to the database
 */
async function applyMigrations() {
  console.log('Applying migrations to database...');
  
  try {
    // Create migrations directory structure if it doesn't exist
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const metaDir = path.join(migrationsDir, 'meta');
    
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
    }
    
    // Create empty journal file if it doesn't exist
    const journalPath = path.join(metaDir, '_journal.json');
    if (!fs.existsSync(journalPath)) {
      fs.writeFileSync(journalPath, JSON.stringify({ entries: [] }));
      console.log('Created migration journal file.');
    }
    
    // Apply schema directly using db push instead of migrations
    console.log('Pushing schema directly to database...');
    const { stdout, stderr } = await execAsync('npx drizzle-kit push');
    
    if (stderr && !stderr.includes('warning')) {
      console.error('Error pushing schema:', stderr);
    } else {
      console.log('Schema pushed successfully.');
      if (stdout) console.log(stdout);
    }
  } catch (error) {
    console.error('Error applying migrations:', error);
    throw error;
  }
}

/**
 * Insert initial data into the database
 */
async function seedDatabase() {
  console.log('Seeding database with initial data...');
  
  try {
    // Start transaction
    await db.transaction(async (tx) => {
      // Create default admin user
      const adminUser = await tx.insert(schema.users).values({
        username: 'admin',
        password: '1a1046863648f98385ed929dd7068fcfcb796dd305c3046eace85119c7f00f56d7a318b08909e43e5fd06844a388518deeb04adfa191f8414f01771eac907a4e.f0d750afba420a285f0450093d00a44f', // format: hash.salt for "Cuongtm2012$"
        email: 'admin@filmflex.example',
        role: schema.UserRole.ADMIN,
        status: schema.UserStatus.ACTIVE,
      }).returning();
      
      console.log('  Created admin user');
      
      // Create default roles
      await tx.insert(schema.roles).values([
        { name: schema.UserRole.ADMIN, description: 'System administrator with full access' },
        { name: schema.UserRole.MODERATOR, description: 'Content moderator with limited system access' },
        { name: schema.UserRole.PREMIUM, description: 'Premium user with access to all content' },
        { name: schema.UserRole.NORMAL, description: 'Standard user with basic access' },
      ]);
      
      console.log('  Created default roles');
      
      // Insert permissions
      const permissions = await tx.insert(schema.permissions).values([
        { name: 'manage_users', description: 'Create, update, and delete users', module: 'user', action: 'all' },
        { name: 'manage_content', description: 'Create, update, and delete content', module: 'content', action: 'all' },
        { name: 'view_premium', description: 'Access premium content', module: 'content', action: 'view' },
        { name: 'view_analytics', description: 'View system analytics', module: 'analytics', action: 'view' },
      ]).returning();
      
      console.log('  Created default permissions');
      
      // Get the role IDs
      const roleResults = await tx.select().from(schema.roles);
      const adminRole = roleResults.find(r => r.name === schema.UserRole.ADMIN);
      const moderatorRole = roleResults.find(r => r.name === schema.UserRole.MODERATOR);
      const premiumRole = roleResults.find(r => r.name === schema.UserRole.PREMIUM);
      
      // Assign permissions to roles
      if (adminRole && moderatorRole && premiumRole) {
        // Admin gets all permissions
        for (const permission of permissions) {
          await tx.insert(schema.rolePermissions).values({
            roleId: adminRole.id,
            permissionId: permission.id,
          });
        }
        
        // Moderator gets content management permission
        const contentPermission = permissions.find(p => p.name === 'manage_content');
        const analyticsPermission = permissions.find(p => p.name === 'view_analytics');
        
        if (contentPermission) {
          await tx.insert(schema.rolePermissions).values({
            roleId: moderatorRole.id,
            permissionId: contentPermission.id,
          });
        }
        
        if (analyticsPermission) {
          await tx.insert(schema.rolePermissions).values({
            roleId: moderatorRole.id,
            permissionId: analyticsPermission.id,
          });
        }
        
        // Premium users get premium content access
        const premiumPermission = permissions.find(p => p.name === 'view_premium');
        if (premiumPermission) {
          await tx.insert(schema.rolePermissions).values({
            roleId: premiumRole.id,
            permissionId: premiumPermission.id,
          });
        }
      }
      
      console.log('  Assigned permissions to roles');
    });
    
    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Main function to orchestrate the database reset process
 */
async function resetDatabase() {
  try {
    console.log('='.repeat(50));
    console.log('Starting Film Database Reset Process');
    console.log('='.repeat(50));
    
    // Drop all existing tables
    await dropAllTables();
    
    // Prepare for schema generation
    await generateMigrations();
    
    // Apply schema directly using db push
    await applyMigrations();
    
    // Seed database with initial data
    await seedDatabase();
    
    console.log('='.repeat(50));
    console.log('Film Database Reset Completed Successfully!');
    console.log('='.repeat(50));
    console.log('The database has been reinitialized with a fresh schema and initial data.');
    console.log('You can now start the application with a clean database.');
    console.log('\nAdmin credentials:');
    console.log('  Username: admin');
    console.log('  Password: Cuongtm2012$');
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1); // Exit with error code
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the reset process
resetDatabase(); 