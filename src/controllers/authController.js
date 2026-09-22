// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// ============================================================
//  POST /api/auth/login
//  Recebe email e senha, valida no banco, retorna um token JWT
// ============================================================
async function login(req, res) {
  const { email, senha } = req.body;

  // 1. Validação básica — os campos vieram?
  if (!email || !senha) {
    return res.status(400).json({
      erro: 'Email e senha são obrigatórios'
    });
  }

  try {
    // 2. Busca o usuário no banco pelo email
    const [rows] = await db.query(
      'SELECT id, nome, email, senha_hash, nivel FROM usuarios WHERE email = ?',
      [email]
    );

    // 3. Usuário não existe? Responde igual a "senha errada"
    //    Nunca diga "usuário não encontrado" — isso vaza quem
    //    está cadastrado no sistema (ataque de enumeração)
    if (rows.length === 0) {
      return res.status(401).json({
        erro: 'Email ou senha incorretos'
      });
    }

    const usuario = rows[0];

    // 4. Compara a senha enviada com o hash armazenado
    //    bcrypt.compare extrai o salt do hash e recria o hash
    //    da senha enviada — se coincidir, a senha está correta
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({
        erro: 'Email ou senha incorretos'
      });
    }

    // 5. Gera o token JWT
    //    O token contém: id do usuário, nome, email, nível
    //    Esses dados ficam visíveis (mas não editáveis) no token
    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 6. Retorna o token e os dados do usuário (sem a senha!)
    res.json({
      mensagem: 'Login realizado com sucesso',
      token: token,
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

module.exports = { login };