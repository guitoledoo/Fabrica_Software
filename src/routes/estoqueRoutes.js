const express = require('express');
const router = express.Router();
const { listarItens, listarMovimentacoes, registrar, criarItem, atualizarItem, excluirItem, excluirMovimentacao } = require('../controllers/estoqueController');

const autenticar = require('../middleware/autenticar');
const requerAdmin = require('../middleware/requerAdmin');

router.delete('/movimentacoes/:id', autenticar, requerAdmin, excluirMovimentacao);


// Aliases exatamente como o frontend chama
router.get('/', autenticar, listarItens);                    // GET /api/estoque
router.post('/movimentacao', autenticar, registrar);         // POST /api/estoque/movimentacao (singular)

router.get('/itens', autenticar, listarItens);
router.get('/movimentacoes', autenticar, listarMovimentacoes);
router.post('/movimentacoes', autenticar, registrar);        // plural também aceito

router.post('/itens', autenticar, requerAdmin, criarItem);
router.put('/itens/:tag', autenticar, requerAdmin, atualizarItem);
router.delete('/itens/:tag', autenticar, requerAdmin, excluirItem);
router.delete('/movimentacoes/:id', autenticar, requerAdmin, excluirMovimentacao);



module.exports = router;