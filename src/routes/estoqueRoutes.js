// src/routes/estoqueRoutes.js
const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/autenticar');
const requerAdmin = require('../middleware/requerAdmin');
const { listarEstoque, registrarMovimentacao, listarMovimentacoes } = require('../controllers/estoqueController');

router.use(autenticar);

router.get('/', listarEstoque);
router.get('/movimentacoes', listarMovimentacoes);
router.post('/movimentacao', requerAdmin, registrarMovimentacao);

module.exports = router;