// src/routes/historicoRoutes.js
const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/autenticar');
const { historicoDoAtivo, listarHistorico } = require('../controllers/historicoController');

router.use(autenticar);

router.get('/', listarHistorico);
router.get('/:ativoId', historicoDoAtivo);

module.exports = router;