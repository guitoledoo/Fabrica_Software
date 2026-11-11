// src/controllers/agenciaController.js
const db = require('../config/database');

// GET /api/agencias — lista todas com contagem de ativos
async function listarAgencias(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT g.*,
        COUNT(a.id) AS total_ativos,
        SUM(CASE WHEN a.status = 'Em Uso' THEN 1 ELSE 0 END) AS em_uso,
        SUM(CASE WHEN a.status = 'Em Estoque' THEN 1 ELSE 0 END) AS em_estoque,
        SUM(CASE WHEN a.status = 'Manutenção' THEN 1 ELSE 0 END) AS em_manutencao
      FROM agencias g
      LEFT JOIN ativos a ON a.agencia_id = g.id
      GROUP BY g.id
      ORDER BY g.codigo
    `);
    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar agências:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// POST /api/agencias — cria agência
async function criarAgencia(req, res) {
  try {
    const { codigo, nome, endereco, cnpj } = req.body;

    if (!codigo || !nome) {
      return res.status(400).json({ erro: 'Código e nome são obrigatórios' });
    }

    const [existe] = await db.query('SELECT id FROM agencias WHERE codigo = ?', [codigo]);
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'Já existe uma agência com este código' });
    }

    const [resultado] = await db.query(
      'INSERT INTO agencias (codigo, nome, endereco, cnpj) VALUES (?, ?, ?, ?)',
      [codigo, nome, endereco, cnpj]
    );

    res.status(201).json({ mensagem: 'Agência criada com sucesso', id: resultado.insertId });
  } catch (erro) {
    console.error('Erro ao criar agência:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// PUT /api/agencias/:id — atualiza
async function atualizarAgencia(req, res) {
  try {
    const { id } = req.params;
    const { codigo, nome, endereco, cnpj } = req.body;

    const [existe] = await db.query('SELECT id FROM agencias WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Agência não encontrada' });
    }

    await db.query(
      'UPDATE agencias SET codigo = ?, nome = ?, endereco = ?, cnpj = ? WHERE id = ?',
      [codigo, nome, endereco, cnpj, id]
    );

    res.json({ mensagem: 'Agência atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar agência:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// DELETE /api/agencias/:id — remove (só se não tiver ativos)
async function deletarAgencia(req, res) {
  try {
    const { id } = req.params;

    const [ativos] = await db.query('SELECT COUNT(*) AS total FROM ativos WHERE agencia_id = ?', [id]);
    if (ativos[0].total > 0) {
      return res.status(409).json({
        erro: `Não é possível excluir: existem ${ativos[0].total} ativo(s) alocado(s) nesta agência. Transfira-os primeiro.`
      });
    }

    const [resultado] = await db.query('DELETE FROM agencias WHERE id = ?', [id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Agência não encontrada' });
    }

    res.json({ mensagem: 'Agência removida com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar agência:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// GET /api/agencias/:id/ativos — lista os ativos alocados em uma agência
// SELECT * de propósito: retorna as colunas reais da tabela ativos, sem chutar nomes
async function listarAtivosDaAgencia(req, res) {
  try {
    const { id } = req.params;

    const [agencia] = await db.query('SELECT id FROM agencias WHERE id = ?', [id]);
    if (agencia.length === 0) {
      return res.status(404).json({ erro: 'Agência não encontrada' });
    }

    const [rows] = await db.query(
      'SELECT * FROM ativos WHERE agencia_id = ? ORDER BY status, marca, modelo',
      [id]
    );

    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar ativos da agência:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listarAgencias, listarAtivosDaAgencia, criarAgencia, atualizarAgencia, deletarAgencia };