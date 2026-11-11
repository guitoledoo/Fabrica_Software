// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/autenticar');
const { login, cadastrar, trocarSenha } = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/cadastro
router.post('/cadastro', cadastrar);

// POST /api/auth/trocar-senha — exige estar logado (o token identifica quem troca)
router.post('/trocar-senha', autenticar, trocarSenha);

module.exports = router;