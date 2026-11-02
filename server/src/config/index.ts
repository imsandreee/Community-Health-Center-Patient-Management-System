import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace or root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/san_roque_chc',
  jwtSecret: process.env.JWT_SECRET || 'san_roque_chc_secure_jwt_secret_dev_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  isDev: process.env.NODE_ENV !== 'production',
};

