const { Pool, types } = require('pg');
require('dotenv').config();

// Keep PostgreSQL DATE as YYYY-MM-DD text. Default JS Date + JSON.stringify uses UTC midnight,
// which shifts the calendar day for positive-offset zones (e.g. IST) and breaks .slice(0, 10).
types.setTypeParser(types.builtins.DATE, (value) => value);

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
