// src/controllers/authController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//  Autentica o usuário e devolve um token JWT válido por 8h
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
      'SELECT id, nome, email, senha_hash, nivel, troca_obrigatoria FROM usuarios WHERE email = ?',
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
        nivel: usuario.nivel,
        troca_obrigatoria: !!usuario.troca_obrigatoria
      }
    });

  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

//  Usuário logado define a própria senha (obrigatório quando
//  troca_obrigatoria = 1, ou voluntário, a qualquer momento)
async function trocarSenha(req, res) {
  try {
    const { novaSenha } = req.body;

    if (!novaSenha || novaSenha.length < 8) {
      return res.status(400).json({ erro: 'A nova senha deve ter no mínimo 8 caracteres' });
    }
    if (!/[A-Z]/.test(novaSenha) || !/[a-z]/.test(novaSenha) || !/[0-9]/.test(novaSenha)) {
      return res.status(400).json({ erro: 'A senha deve conter letra maiúscula, minúscula e número' });
    }

    const hash = await bcrypt.hash(novaSenha, 10);

    await db.query(
      'UPDATE usuarios SET senha_hash = ?, troca_obrigatoria = 0 WHERE id = ?',
      [hash, req.usuario.id]
    );

    res.json({ mensagem: 'Senha alterada com sucesso' });
  } catch (erro) {
    console.error('Erro ao trocar senha:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { login, trocarSenha };
