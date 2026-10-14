// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', login);

const { cadastrar } = require('../controllers/authController');
router.post('/cadastro', cadastrar);

module.exports = router;