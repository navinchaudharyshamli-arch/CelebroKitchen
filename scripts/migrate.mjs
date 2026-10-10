import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function runLocalDbSetup() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes('127.0.0.1:54322')) {
    console.log('Skipping direct DB migration: DATABASE_URL not configured for cloud Supabase yet.');
    console.log('To run migrations directly, set DATABASE_URL in your .env file to your Supabase Postgres connection string.');
    process.exit(0);
  }

  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('Starting automated migration deployment...');
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`Executing migration: ${file}`);
      const query = readFileSync(join(migrationsDir, file), 'utf-8');
      await sql.unsafe(query);
    }

    console.log('Executing seed.sql...');
    const seedQuery = readFileSync(join(process.cwd(), 'supabase', 'seed.sql'), 'utf-8');
    await sql.unsafe(seedQuery);

    console.log('SUCCESS: All database migrations & seeds deployed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await sql.end();
  }
}

runLocalDbSetup();
