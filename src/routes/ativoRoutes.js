// src/routes/ativoRoutes.js
const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/autenticar');
const requerAdmin = require('../middleware/requerAdmin');
const {
  listarAtivos,
  buscarAtivo,
  criarAtivo,
  atualizarAtivo,
  deletarAtivo
} = require('../controllers/ativoController');

// Todas as rotas exigem autenticação
router.use(autenticar);

// GET /api/ativos — qualquer usuário autenticado pode listar
router.get('/', listarAtivos);

// GET /api/ativos/:id — qualquer usuário autenticado pode ver
router.get('/:id', buscarAtivo);

// POST /api/ativos — apenas Admin pode criar
router.post('/', requerAdmin, criarAtivo);

// PUT /api/ativos/:id — apenas Admin pode atualizar
router.put('/:id', requerAdmin, atualizarAtivo);

// DELETE /api/ativos/:id — apenas Admin pode deletar
router.delete('/:id', requerAdmin, deletarAtivo);

module.exports = router;