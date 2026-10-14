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

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use(express.static('public'));

app.get('/api/teste', (req, res) => {
  res.json({ mensagem: 'API do Sistema de Gestão de Ativos rodando!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/ativos', ativoRoutes);
app.use('/api/agencias', agenciaRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`   Acesse: http://localhost:${PORT}/api/teste\n`);
});