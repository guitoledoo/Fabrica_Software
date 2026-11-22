// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/autenticar');
const { login, trocarSenha } = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/trocar-senha (exige token)
router.post('/trocar-senha', autenticar, trocarSenha);

module.exports = router;