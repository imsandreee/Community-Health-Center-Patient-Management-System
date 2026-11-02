/**
 * migrate.ts — Database migration runner for PostgreSQL / Supabase
 *
 * Runs:
 *  1. 20261102000001_create_tables.sql
 *  2. 20261102000002_create_indexes.sql
 *  3. 20261102000003_create_rls_policies.sql
 *  4. seed.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import pg from 'pg';
import dotenv from 'dotenv';

// Use public DNS to ensure robust resolution across environments
dns.setServers(['8.8.8.8', '1.1.1.1']);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');
const SEED_FILE = path.resolve(__dirname, '../../../supabase/seed.sql');

async function resolveHostIp(hostname: string): Promise<string> {
  // If already an IP, return directly
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return hostname;
  const addrs = await dns.promises.resolve4(hostname);
  return addrs[0];
}

async function getPool(): Promise<pg.Pool> {
  const host = process.env.DB_HOST || 'aws-0-eu-west-1.pooler.supabase.com';
  const port = parseInt(process.env.DB_PORT || '6543', 10);
  const user = process.env.DB_USER || 'postgres.bzrkbmkjgylxblkiqqov';
  const password = process.env.DB_PASSWORD || '@Sandree09933124671';
  const database = process.env.DB_NAME || 'postgres';

  console.log(`[Migration] Resolving host ${host}...`);
  const ip = await resolveHostIp(host);
  console.log(`[Migration] Target IP: ${ip} (port ${port}, user: ${user})`);

  return new pg.Pool({
    user,
    password,
    host: ip,
    port,
    database,
    ssl: { rejectUnauthorized: false, servername: host },
    connectionTimeoutMillis: 10000,
  });
}

async function runSqlFile(client: pg.PoolClient, filePath: string, label: string) {
  console.log(`\n==================================================`);
  console.log(`[Migration] Executing: ${label}`);
  console.log(`[Migration] Source: ${path.basename(filePath)}`);
  console.log(`==================================================`);
  const sql = fs.readFileSync(filePath, 'utf-8');
  await client.query(sql);
  console.log(`[Migration] ✓ SUCCESS: ${label}`);
}

async function main() {
  const pool = await getPool();
  console.log('[Migration] Connecting to Supabase database...');
  const client = await pool.connect();
  console.log('[Migration] Connection established successfully to PostgreSQL 17!');

  try {
    // 1. Create Tables
    const tablesPath = path.join(MIGRATIONS_DIR, '20261102000001_create_tables.sql');
    await runSqlFile(client, tablesPath, '01 - Create Tables (17 relational tables, 3NF schema)');

    // 2. Create Indexes
    const indexesPath = path.join(MIGRATIONS_DIR, '20261102000002_create_indexes.sql');
    await runSqlFile(client, indexesPath, '02 - Create Indexes (B-tree & partial unique slot reservation index)');

    // 3. Create RLS Policies
    const rlsPath = path.join(MIGRATIONS_DIR, '20261102000003_create_rls_policies.sql');
    await runSqlFile(client, rlsPath, '03 - Create Supabase RLS Policies (RA 10173 Clinical Privacy)');

    // 4. Seed Data
    const shouldSeed = process.argv.includes('--seed') || process.env.SEED_DB === 'true';
    if (shouldSeed && fs.existsSync(SEED_FILE)) {
      await runSqlFile(client, SEED_FILE, '04 - Seed Data (5 personas with Bcrypt hashes, sample patients, appointments)');
    }

    // Verify created tables
    console.log(`\n==================================================`);
    console.log(`[Verification] Checking tables in Supabase public schema...`);
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`[Verification] Found ${tablesRes.rows.length} tables in Supabase public schema:`);
    tablesRes.rows.forEach((r, idx) => {
      console.log(`  ${String(idx + 1).padStart(2, '0')}. ${r.table_name}`);
    });
    console.log(`==================================================`);

    console.log('\n>>> ALL SUPABASE DATABASE MIGRATIONS COMPLETED SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('\n[Migration Error]:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});
