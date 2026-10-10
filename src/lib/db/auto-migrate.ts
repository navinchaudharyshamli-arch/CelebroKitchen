import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

export async function runAutomatedDBSetup() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes('127.0.0.1')) {
    return { success: false, error: 'DATABASE_URL not configured for cloud Supabase' };
  }

  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const executed: string[] = [];

    for (const file of migrationFiles) {
      const query = readFileSync(join(migrationsDir, file), 'utf-8');
      await sql.unsafe(query);
      executed.push(file);
    }

    const seedQuery = readFileSync(join(process.cwd(), 'supabase', 'seed.sql'), 'utf-8');
    await sql.unsafe(seedQuery);

    return { success: true, executed_migrations: executed };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    await sql.end();
  }
}
