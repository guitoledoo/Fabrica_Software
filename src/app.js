const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ativoRoutes = require('./routes/ativoRoutes');
const agenciaRoutes = require('./routes/agenciaRoutes');
const historicoRoutes = require('./routes/historicoRoutes');
const estoqueRoutes = require('./routes/estoqueRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Frontend: serve a pasta public (a raiz abre o index.html — login)
app.use(express.static('public'));

// Healthcheck — usado para verificar a disponibilidade da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/ativos', ativoRoutes);
app.use('/api/agencias', agenciaRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuarioRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`   Sistema: http://localhost:${PORT}\n`);
});