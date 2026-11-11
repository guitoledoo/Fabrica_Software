const express = require('express');
const router = express.Router();
const { listar, criar, redefinirSenha, alterarNivel, excluir } = require('../controllers/usuarioController');
const autenticar = require('../middleware/autenticar');
const requerAdmin = require('../middleware/requerAdmin');

router.get('/', autenticar, listar);

router.post('/', autenticar, requerAdmin, criar);
router.put('/:id/senha', autenticar, requerAdmin, redefinirSenha);
router.put('/:id/nivel', autenticar, requerAdmin, alterarNivel);
router.delete('/:id', autenticar, requerAdmin, excluir);

module.exports = router;