// src/config/database.js
const mysql = require('mysql2');
require('dotenv').config();

// Cria um pool de conexões — não uma conexão única
// Pool mantém várias conexões abertas e reutiliza, evitando
// o custo de abrir/fechar conexão a cada requisição
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promisify: converte callbacks para Promises (async/await)
// O mysql2 nativo usa callbacks. Com .promise(), ganhamos
// o padrão moderno async/await em todas as queries
module.exports = pool.promise();