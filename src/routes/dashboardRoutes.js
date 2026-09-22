// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/autenticar');
const { resumo } = require('../controllers/dashboardController');

router.use(autenticar);

router.get('/', resumo);

module.exports = router;