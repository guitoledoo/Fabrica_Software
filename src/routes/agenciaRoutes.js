// src/routes/agenciaRoutes.js
const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/autenticar');
const requerAdmin = require('../middleware/requerAdmin');
const { listarAgencias, listarAtivosDaAgencia, criarAgencia, atualizarAgencia, deletarAgencia } = require('../controllers/agenciaController');

router.use(autenticar);

router.get('/', listarAgencias);
router.get('/:id/ativos', listarAtivosDaAgencia);   // NOVO — detalhes expansíveis
router.post('/', requerAdmin, criarAgencia);
router.put('/:id', requerAdmin, atualizarAgencia);
router.delete('/:id', requerAdmin, deletarAgencia);

module.exports = router;