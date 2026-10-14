// src/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const { listar, criar, redefinirSenha, alterarNivel, excluir } = require('../controllers/usuarioController');
const { verificarToken, exigirAdmin } = require('../middlewares/authMiddleware');

// Leitura: qualquer autenticado vê (mas só Admin acessa a tela)
router.get('/', verificarToken, listar);

// Escrita: restrita a Admin
router.post('/', verificarToken, exigirAdmin, criar);
router.put('/:id/senha', verificarToken, exigirAdmin, redefinirSenha);
router.put('/:id/nivel', verificarToken, exigirAdmin, alterarNivel);
router.delete('/:id', verificarToken, exigirAdmin, excluir);

module.exports = router;