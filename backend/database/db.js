const { Pool } = require('pg');
require('dotenv').config();

// pg (SCRAM) requires password to be a string; undefined/non-string causes "client password must be a string"
const pgPassword = process.env.PGPASSWORD != null ? String(process.env.PGPASSWORD) : '';

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER,
      password: pgPassword,
      database: process.env.PGDATABASE || 'my_family',
    });

module.exports = pool;
