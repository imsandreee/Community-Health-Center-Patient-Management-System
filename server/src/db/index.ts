import pg from 'pg';
import dns from 'dns';
import { config } from '../config/index.js';
import { supabaseRepository, SupabaseDataRepository } from './supabaseRepository.js';

// Ensure DNS resolves cleanly in all environments (e.g. Windows dev boxes)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { Pool } = pg;

const targetHost = process.env.DB_HOST || 'aws-0-eu-west-1.pooler.supabase.com';
const targetPort = parseInt(process.env.DB_PORT || '6543', 10);
const targetUser = process.env.DB_USER || 'postgres.bzrkbmkjgylxblkiqqov';
const targetPassword = process.env.DB_PASSWORD || '@Sandree09933124671';
const targetDatabase = process.env.DB_NAME || 'postgres';

async function resolveHostIp(hostname: string): Promise<string> {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return hostname;
  try {
    const addrs = await dns.promises.resolve4(hostname);
    return addrs[0] || hostname;
  } catch {
    return hostname;
  }
}

let pool: pg.Pool;

function createFallbackPool(): pg.Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 3000,
    max: 10,
    ssl: config.databaseUrl.includes('supabase.co') || config.databaseUrl.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

pool = createFallbackPool();

let isPostgresConnected = false;

export async function initDatabaseConnection(): Promise<boolean> {
  try {
    const resolvedIp = await resolveHostIp(targetHost);
    console.log(`[Database] Connecting to Supabase pooler at ${resolvedIp} (${targetHost}:${targetPort})...`);

    // Recreate pool with resolved IP to bypass Windows local DNS resolution limits
    pool = new Pool({
      user: targetUser,
      password: targetPassword,
      host: resolvedIp,
      port: targetPort,
      database: targetDatabase,
      ssl: { rejectUnauthorized: false, servername: targetHost },
      connectionTimeoutMillis: 8000,
      max: 10,
    });

    const client = await pool.connect();
    const res = await client.query('SELECT version()');
    client.release();
    isPostgresConnected = true;
    console.log('[Database] ✓ Supabase PostgreSQL 17 connection established successfully:');
    console.log('           ' + res.rows[0].version.substring(0, 55));

    // Hydrate store from live Supabase tables
    await supabaseRepository.loadFromSupabase();

    return true;
  } catch (err) {
    isPostgresConnected = false;
    console.warn(
      '[Database] PostgreSQL connection failed (%s). Active repository mode: in-memory state.',
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

export function isDbConnected(): boolean {
  return isPostgresConnected;
}

// Export supabaseRepository as mockRepository for transparent backward compatibility
export const mockRepository: SupabaseDataRepository = supabaseRepository;
export { pool, supabaseRepository, SupabaseDataRepository };
