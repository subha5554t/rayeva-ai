/**
 * Database initializer — run once with: npm run db:init
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const db   = require('./client');

async function init() {
  console.log('🗄️  Initializing Rayeva database...');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await db.query(sql);
    console.log('✅ Schema applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB init failed:', err.message);
    process.exit(1);
  }
}

init();
