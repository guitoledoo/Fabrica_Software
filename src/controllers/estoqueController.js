// src/controllers/estoqueController.js
const db = require('../config/database');

// GET /api/estoque — saldo atual de cada item
async function listarEstoque(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT
        c.tag,
        c.descricao,
        c.categoria,
        c.minimo,
        COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE 0 END), 0) AS entradas,
        COALESCE(SUM(CASE WHEN m.tipo = 'Saída' THEN m.quantidade ELSE 0 END), 0) AS saidas,
        COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE -m.quantidade END), 0) AS saldo,
        CASE
          WHEN COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE -m.quantidade END), 0) <= c.minimo
          THEN TRUE ELSE FALSE
        END AS alerta_baixo
      FROM estoque_catalogo c
      LEFT JOIN estoque_movimentacoes m ON c.tag = m.tag
      GROUP BY c.tag, c.descricao, c.categoria, c.minimo
      ORDER BY c.tag
    `);
    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar estoque:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// POST /api/estoque/movimentacao — registra entrada ou saída
async function registrarMovimentacao(req, res) {
  try {
    const { tag, descricao, tipo, quantidade, quem_entregou, setor_saida, para_quem, setor_entrada } = req.body;

    // Validações
    if (!tag || !tipo || !quantidade) {
      return res.status(400).json({ erro: 'Tag, tipo e quantidade são obrigatórios' });
    }

    if (!['Entrada', 'Saída'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo deve ser "Entrada" ou "Saída"' });
    }

    if (quantidade <= 0) {
      return res.status(400).json({ erro: 'Quantidade deve ser maior que zero' });
    }

    // Item existe no catálogo?
    const [item] = await db.query('SELECT tag FROM estoque_catalogo WHERE tag = ?', [tag]);
    if (item.length === 0) {
      return res.status(404).json({ erro: 'Item não encontrado no catálogo' });
    }

    // Se for SAÍDA, verifica se há saldo suficiente
    if (tipo === 'Saída') {
      const [saldoRows] = await db.query(
        `SELECT COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN quantidade ELSE -quantidade END), 0) AS saldo
         FROM estoque_movimentacoes WHERE tag = ?`,
        [tag]
      );
      const saldoAtual = saldoRows[0].saldo;

      if (saldoAtual < quantidade) {
        return res.status(409).json({
          erro: `Saldo insuficiente. Disponível: ${saldoAtual}, solicitado: ${quantidade}`
        });
      }
    }

    // Registra a movimentação
    await db.query(
      `INSERT INTO estoque_movimentacoes (tag, descricao, tipo, quantidade, quem_entregou, setor_saida, para_quem, setor_entrada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tag, descricao, tipo, quantidade, quem_entregou, setor_saida, para_quem, setor_entrada]
    );

    res.status(201).json({ mensagem: 'Movimentação registrada com sucesso' });
  } catch (erro) {
    console.error('Erro ao registrar movimentação:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// GET /api/estoque/movimentacoes — lista movimentações (paginado)
async function listarMovimentacoes(req, res) {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 50;
    const offset = (pagina - 1) * limite;

    const [rows] = await db.query(
      `SELECT * FROM estoque_movimentacoes ORDER BY data_hora DESC LIMIT ? OFFSET ?`,
      [limite, offset]
    );

    const [total] = await db.query('SELECT COUNT(*) AS total FROM estoque_movimentacoes');

    res.json({ pagina, limite, total: total[0].total, registros: rows });
  } catch (erro) {
    console.error('Erro ao listar movimentações:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listarEstoque, registrarMovimentacao, listarMovimentacoes };