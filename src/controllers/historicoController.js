// src/controllers/historicoController.js
const db = require('../config/database');

// GET /api/historico/:ativoId — histórico de um ativo específico
async function historicoDoAtivo(req, res) {
  try {
    const { ativoId } = req.params;

    const [rows] = await db.query(
      `SELECT h.*, a.patrimonio, a.marca, a.modelo
       FROM historico_ativos h
       LEFT JOIN ativos a ON h.ativo_id = a.id
       WHERE h.ativo_id = ?
       ORDER BY h.data_hora DESC`,
      [ativoId]
    );

    res.json(rows);
  } catch (erro) {
    console.error('Erro ao buscar histórico:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// GET /api/historico — histórico geral (com paginação simples)
async function listarHistorico(req, res) {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 50;
    const offset = (pagina - 1) * limite;

    const [rows] = await db.query(
      `SELECT h.*, a.patrimonio, a.marca, a.modelo
       FROM historico_ativos h
       LEFT JOIN ativos a ON h.ativo_id = a.id
       ORDER BY h.data_hora DESC
       LIMIT ? OFFSET ?`,
      [limite, offset]
    );

    const [total] = await db.query('SELECT COUNT(*) AS total FROM historico_ativos');

    res.json({
      pagina,
      limite,
      total: total[0].total,
      registros: rows
    });
  } catch (erro) {
    console.error('Erro ao listar histórico:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { historicoDoAtivo, listarHistorico };