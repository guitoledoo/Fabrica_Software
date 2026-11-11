const db = require('../config/database');

// GET /api/estoque/itens — catálogo com saldo calculado e alerta de mínimo
async function listarItens(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.tag, c.descricao, c.categoria, c.minimo,
              COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade END), 0) AS entradas,
              COALESCE(SUM(CASE WHEN m.tipo = 'Saída' THEN m.quantidade END), 0) AS saidas,
              COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE -m.quantidade END), 0) AS saldo
       FROM estoque_catalogo c
       LEFT JOIN estoque_movimentacoes m ON m.tag = c.tag
       GROUP BY c.id, c.tag, c.descricao, c.categoria, c.minimo
       ORDER BY c.descricao`
    );
    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar itens de estoque:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}


// GET /api/estoque/movimentacoes — histórico das movimentações
async function listarMovimentacoes(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT id, data_hora, tag, descricao, tipo, quantidade,
              quem_entregou, setor_saida, para_quem, setor_entrada
       FROM estoque_movimentacoes
       ORDER BY data_hora DESC, id DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar movimentações:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// POST /api/estoque/movimentacoes — registra ENTRADA ou SAÍDA
async function registrar(req, res) {
  try {
    const { tipo, tag, quantidade, quem_entregou, setor_saida, para_quem, setor_entrada, observacao } = req.body;

    // Normaliza o tipo (aceita com ou sem acento; o enum do banco usa 'Saída')
    let tipoDB;
    if (tipo === 'Entrada') tipoDB = 'Entrada';
    else if (tipo === 'Saída' || tipo === 'Saida') tipoDB = 'Saída';
    else return res.status(400).json({ erro: 'Tipo deve ser "Entrada" ou "Saída"' });

    // Quantidade: inteiro maior que zero (vale para os dois tipos)
    const qtd = Number(quantidade);
    if (!qtd || qtd < 1 || !Number.isInteger(qtd)) {
      return res.status(400).json({ erro: 'A quantidade deve ser um número inteiro maior que zero' });
    }

    if (!tag) {
      return res.status(400).json({ erro: 'O item é obrigatório' });
    }

    // Item precisa existir no catálogo
    const [item] = await db.query('SELECT tag FROM estoque_catalogo WHERE tag = ?', [tag]);
    if (item.length === 0) {
      return res.status(404).json({ erro: 'Item não encontrado no catálogo de estoque' });
    }

    // SAÍDA: valida contra o saldo calculado ANTES de gravar
    if (tipoDB === 'Saída') {
      const [linhas] = await db.query(
        `SELECT COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN quantidade ELSE -quantidade END), 0) AS saldo
         FROM estoque_movimentacoes WHERE tag = ?`,
        [tag]
      );
      const saldoAtual = Number(linhas[0].saldo);

      if (qtd > saldoAtual) {
        return res.status(409).json({ erro: `Saldo insuficiente. Disponível: ${saldoAtual} unidade(s)` });
      }
    }
    // ENTRADA: nunca é bloqueada — repõe o estoque

    // A observação do formulário é gravada na coluna descricao da movimentação
    await db.query(
      `INSERT INTO estoque_movimentacoes
         (tag, descricao, tipo, quantidade, quem_entregou, setor_saida, para_quem, setor_entrada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tag, observacao || null, tipoDB, qtd, quem_entregou || null, setor_saida || null, para_quem || null, setor_entrada || null]
    );

    res.status(201).json({ mensagem: 'Movimentação registrada com sucesso' });
  } catch (erro) {
    console.error('Erro ao registrar movimentação:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// POST /api/estoque/itens — cadastra item no catálogo
async function criarItem(req, res) {
  try {
    const { tag, descricao, categoria, minimo } = req.body;

    if (!tag || !descricao) {
      return res.status(400).json({ erro: 'Tag e descrição são obrigatórias' });
    }

    const [existe] = await db.query('SELECT id FROM estoque_catalogo WHERE tag = ?', [tag]);
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'Já existe um item com esta tag' });
    }

    await db.query(
      'INSERT INTO estoque_catalogo (tag, descricao, categoria, minimo) VALUES (?, ?, ?, ?)',
      [tag, descricao, categoria || null, Number(minimo) || 0]
    );

    res.status(201).json({ mensagem: 'Item cadastrado com sucesso' });
  } catch (erro) {
    console.error('Erro ao cadastrar item:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// PUT /api/estoque/itens/:tag — edita descrição, categoria e mínimo
async function atualizarItem(req, res) {
  try {
    const { tag } = req.params;
    const { descricao, categoria, minimo } = req.body;

    const [existe] = await db.query('SELECT id FROM estoque_catalogo WHERE tag = ?', [tag]);
    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Item não encontrado' });
    }

    await db.query(
      'UPDATE estoque_catalogo SET descricao = ?, categoria = ?, minimo = ? WHERE tag = ?',
      [descricao, categoria || null, Number(minimo) || 0, tag]
    );

    res.json({ mensagem: 'Item atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar item:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// DELETE /api/estoque/itens/:tag — exclui apenas se não houver movimentações
async function excluirItem(req, res) {
  try {
    const { tag } = req.params;

    const [movs] = await db.query('SELECT COUNT(*) AS total FROM estoque_movimentacoes WHERE tag = ?', [tag]);
    if (movs[0].total > 0) {
      return res.status(409).json({ erro: 'Este item possui movimentações registradas e não pode ser excluído (preserva o histórico)' });
    }

    const [resultado] = await db.query('DELETE FROM estoque_catalogo WHERE tag = ?', [tag]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Item não encontrado' });
    }

    res.json({ mensagem: 'Item excluído com sucesso' });
  } catch (erro) {
    console.error('Erro ao excluir item:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// DELETE /api/estoque/movimentacoes/:id — exclui a movimentação (Admin)
// O saldo recalcula automaticamente: listarItens agrega as movimentações em tempo real
async function excluirMovimentacao(req, res) {
  try {
    const idNum = Number(req.params.id);
    if (!idNum || !Number.isInteger(idNum)) {
      return res.status(400).json({ erro: 'ID inválido' });
    }

    // Localiza a movimentação antes de excluir (precisamos do tipo/tag para validar o saldo)
    const [movs] = await db.query(
      'SELECT id, tag, tipo, quantidade FROM estoque_movimentacoes WHERE id = ?',
      [idNum]
    );
    if (movs.length === 0) {
      return res.status(404).json({ erro: 'Movimentação não encontrada' });
    }
    const mov = movs[0];

    // Se for ENTRADA, valida que as saídas já registradas não ficarão sem cobertura
    // (ex.: entrada de 10 já consumida por saída de 8 — excluir a entrada deixaria saldo negativo)
    if (mov.tipo === 'Entrada') {
      const [linhas] = await db.query(
        `SELECT COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN quantidade ELSE -quantidade END), 0) AS saldo
         FROM estoque_movimentacoes
         WHERE tag = ? AND id <> ?`,
        [mov.tag, idNum]
      );
      const saldoAposExclusao = Number(linhas[0].saldo);

      if (saldoAposExclusao < 0) {
        return res.status(409).json({
          erro: `Não é possível excluir: há saídas registradas que dependem desta entrada e o saldo do item ficaria negativo (${saldoAposExclusao} unidade(s)). Exclua ou ajuste as saídas primeiro.`
        });
      }
    }

    const [resultado] = await db.query('DELETE FROM estoque_movimentacoes WHERE id = ?', [idNum]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Movimentação não encontrada' });
    }

    res.json({ mensagem: 'Movimentação excluída com sucesso. Saldo do item recalculado.' });
  } catch (erro) {
    console.error('Erro ao excluir movimentação:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = { listarItens, listarMovimentacoes, registrar, criarItem, atualizarItem, excluirItem, excluirMovimentacao };