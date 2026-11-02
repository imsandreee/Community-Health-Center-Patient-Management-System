import { app } from '../server/dist/app.js';
import { initDatabaseConnection } from '../server/dist/db/index.js';

let isDbInitialized = false;

export default async function handler(req, res) {
  if (!isDbInitialized) {
    try {
      await initDatabaseConnection();
      isDbInitialized = true;
    } catch (err) {
      console.error('[Vercel Serverless] Supabase initialization error:', err);
    }
  }

  return app(req, res);
}
