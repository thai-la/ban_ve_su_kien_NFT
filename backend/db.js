const mysql = require('mysql2/promise');
const path = require('path');
console.log('Current working dir:', process.cwd());
console.log('Looking for .env at:', path.resolve('.env'));
require('dotenv').config();
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = pool;
