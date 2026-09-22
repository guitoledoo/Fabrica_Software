// src/controllers/dashboardController.js
const db = require('../config/database');

// GET /api/dashboard — resumo geral para a tela inicial
async function resumo(req, res) {
  try {
    // Totais por status
    const [porStatus] = await db.query(`
      SELECT status, COUNT(*) AS total
      FROM ativos
      GROUP BY status
    `);

    // Total de ativos e agências
    const [[{ totalAtivos }]] = await db.query('SELECT COUNT(*) AS totalAtivos FROM ativos');
    const [[{ totalAgencias }]] = await db.query('SELECT COUNT(*) AS totalAgencias FROM agencias');

    // Ativos com garantia vencendo em 90 dias
    const [garantiasVencendo] = await db.query(`
      SELECT id, marca, modelo, fim_garantia
      FROM ativos
      WHERE fim_garantia IS NOT NULL
        AND fim_garantia BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
      ORDER BY fim_garantia ASC
    `);

    // Itens de estoque abaixo do mínimo
    const [estoqueAlerta] = await db.query(`
      SELECT c.tag, c.descricao, c.minimo,
        COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE -m.quantidade END), 0) AS saldo
      FROM estoque_catalogo c
      LEFT JOIN estoque_movimentacoes m ON c.tag = m.tag
      GROUP BY c.tag, c.descricao, c.minimo
      HAVING saldo <= c.minimo
    `);

    // Últimas movimentações do histórico
    const [ultimasAtividades] = await db.query(`
      SELECT h.ativo_id, h.tipo, h.descricao, h.data_hora, h.usuario_email
      FROM historico_ativos h
      ORDER BY h.data_hora DESC
      LIMIT 10
    `);

    res.json({
      totalAtivos,
      totalAgencias,
      porStatus,
      garantiasVencendo,
      estoqueAlerta,
      ultimasAtividades
    });
  } catch (erro) {
    console.error('Erro no dashboard:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { resumo };