const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


// GET /api/usuarios — lista usuários sem expor o hash
async function listar(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT id, nome, email, nivel, troca_obrigatoria, criado_em FROM usuarios ORDER BY id'
    );
    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar usuários:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// POST /api/usuarios — cria usuário com hash bcrypt
async function criar(req, res) {
  try {
    const { nome, email, senha, nivel } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 6 caracteres' });
    }

    if (nivel && !['Admin', 'Leitor'].includes(nivel)) {
      return res.status(400).json({ erro: 'Nível deve ser "Admin" ou "Leitor"' });
    }

    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'Já existe um usuário com este email' });
    }

    const hash = await bcrypt.hash(senha, 10);

    const [resultado] = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, nivel) VALUES (?, ?, ?, ?)',
      [nome, email, hash, nivel || 'Leitor']
    );

    res.status(201).json({ mensagem: 'Usuário criado com sucesso', id: resultado.insertId });
  } catch (erro) {
    console.error('Erro ao criar usuário:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// PUT /api/usuarios/:id/senha — o SISTEMA gera a senha temporária (Opção A)
// O admin não escolhe mais senha: recebe uma aleatória para repassar,
// e o usuário é obrigado a trocá-la no próximo login
async function redefinirSenha(req, res) {
  try {
    const { id } = req.params;

    const [existe] = await db.query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Senha temporária de 12 caracteres, sem símbolos ambíguos (l/1/I, 0/O)
    // para facilitar a leitura quando o admin repassar
    const alfabeto = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*';
    const bytes = crypto.randomBytes(12);
    let senhaTemporaria = '';
    for (let i = 0; i < 12; i++) {
      senhaTemporaria += alfabeto[bytes[i] % alfabeto.length];
    }

    const hash = await bcrypt.hash(senhaTemporaria, 10);

    await db.query(
      'UPDATE usuarios SET senha_hash = ?, troca_obrigatoria = 1 WHERE id = ?',
      [hash, id]
    );

    // A senha em texto claro volta SÓ nesta resposta — no banco já vai só o hash
    res.json({
      mensagem: 'Senha temporária gerada. O usuário deverá trocá-la no próximo login.',
      senha_temporaria: senhaTemporaria
    });
  } catch (erro) {
    console.error('Erro ao redefinir senha:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// PUT /api/usuarios/:id/nivel — altera Admin/Leitor
async function alterarNivel(req, res) {
  try {
    const { id } = req.params;
    const { nivel } = req.body;

    if (!['Admin', 'Leitor'].includes(nivel)) {
      return res.status(400).json({ erro: 'Nível deve ser "Admin" ou "Leitor"' });
    }

    if (Number(id) === req.usuario.id && nivel === 'Leitor') {
      return res.status(409).json({ erro: 'Você não pode remover seu próprio acesso de Admin' });
    }

    const [existe] = await db.query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    await db.query('UPDATE usuarios SET nivel = ? WHERE id = ?', [nivel, id]);

    res.json({ mensagem: 'Nível atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao alterar nível:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// DELETE /api/usuarios/:id — exclui (nunca a si mesmo)
async function excluir(req, res) {
  try {
    const { id } = req.params;

    if (Number(id) === req.usuario.id) {
      return res.status(409).json({ erro: 'Você não pode excluir seu próprio usuário' });
    }

    const [existe] = await db.query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);

    res.json({ mensagem: 'Usuário excluído com sucesso' });
  } catch (erro) {
    console.error('Erro ao excluir usuário:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listar, criar, redefinirSenha, alterarNivel, excluir };