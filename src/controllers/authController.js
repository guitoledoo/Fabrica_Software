// src/controllers/authController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================================
//  POST /api/auth/login
//  Autentica o usuário e devolve um token JWT válido por 8h
// ============================================================
async function login(req, res) {
  try {
    const { email, senha } = req.body;

    // Validação básica de presença
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    // Busca o usuário pelo email
    // (a tabela usa senha_hash — NÃO existe coluna "ativo")
    const [rows] = await db.query(
      'SELECT id, nome, email, senha_hash, nivel FROM usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Mensagem genérica de propósito: não revela se o email existe
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    const usuario = rows[0];

    // Compara a senha digitada com o hash armazenado (bcrypt)
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    // Gera o token JWT com os dados do usuário no payload
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        nivel: usuario.nivel
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Devolve o token e os dados (sem o hash da senha!)
    res.json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel
      }
    });

  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// ============================================================
//  POST /api/auth/cadastro
//  Cria um novo usuário (provisionamento). O hash da senha é
//  gerado aqui — nunca armazenamos a senha em texto puro
// ============================================================
async function cadastrar(req, res) {
  try {
    const { nome, email, senha, nivel } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }

    // Nível só pode ser Admin ou Leitor (mesma enum da tabela)
    if (nivel && !['Admin', 'Leitor'].includes(nivel)) {
      return res.status(400).json({ erro: 'Nível deve ser "Admin" ou "Leitor"' });
    }

    // Email precisa ser único (a tabela tem constraint UNIQUE)
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'Já existe um usuário com este email' });
    }

    // Gera o hash real da senha (cost 10)
    const hash = await bcrypt.hash(senha, 10);

    await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, nivel) VALUES (?, ?, ?, ?)',
      [nome, email, hash, nivel || 'Leitor']
    );

    res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
  } catch (erro) {
    console.error('Erro ao cadastrar usuário:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { login, cadastrar };