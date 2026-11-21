// src/controllers/ativoController.js
const db = require('../config/database');

//  Lista todos os ativos com filtros opcionais
async function listarAtivos(req, res) {
  try {
    const { agencia, status, busca } = req.query;

    // Constrói a query dinamicamente com filtros
    let sql = `
      SELECT a.*, g.codigo AS agencia_codigo, g.nome AS agencia_nome
      FROM ativos a
      LEFT JOIN agencias g ON a.agencia_id = g.id
      WHERE 1=1
    `;
    const params = [];

    if (agencia) {
      sql += ' AND a.agencia_id = ?';
      params.push(agencia);
    }

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (busca) {
      sql += ' AND (a.id LIKE ? OR a.patrimonio LIKE ? OR a.marca LIKE ? OR a.modelo LIKE ? OR a.usuario_ativo LIKE ?)';
      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo);
    }

    sql += ' ORDER BY a.criado_em DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar ativos:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

//  Busca um ativo específico pelo ID (Service Tag)
async function buscarAtivo(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT a.*, g.codigo AS agencia_codigo, g.nome AS agencia_nome
       FROM ativos a
       LEFT JOIN agencias g ON a.agencia_id = g.id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Ativo não encontrado' });
    }

    res.json(rows[0]);
  } catch (erro) {
    console.error('Erro ao buscar ativo:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

//  Cria um novo ativo
async function criarAtivo(req, res) {
  try {
    const {
      id, patrimonio, marca, modelo, categoria, agencia_id,
      usuario_ativo, status, processador, geracao, ram, so,
      data_aquisicao, inicio_garantia, fim_garantia, descricao
    } = req.body;

    // Validação — o ID (Service Tag) é obrigatório
    if (!id) {
      return res.status(400).json({ erro: 'Service Tag (id) é obrigatória' });
    }

    // Verifica se já existe um ativo com esse ID
    const [existe] = await db.query('SELECT id FROM ativos WHERE id = ?', [id]);

    if (existe.length > 0) {
      return res.status(409).json({ erro: 'Já existe um ativo com esta Service Tag' });
    }

    // Insere o ativo
    await db.query(
      `INSERT INTO ativos (id, patrimonio, marca, modelo, categoria, agencia_id,
        usuario_ativo, status, processador, geracao, ram, so,
        data_aquisicao, inicio_garantia, fim_garantia, descricao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patrimonio, marca, modelo, categoria || 'Desktop', agencia_id,
       usuario_ativo, status || 'Em Uso', processador, geracao, ram, so,
       data_aquisicao, inicio_garantia, fim_garantia, descricao]
    );

    // Registra no histórico
    await db.query(
      `INSERT INTO historico_ativos (ativo_id, tipo, descricao, usuario_email)
       VALUES (?, 'Criação', 'Ativo cadastrado no sistema', ?)`,
      [id, req.usuario.email]
    );

    res.status(201).json({ mensagem: 'Ativo criado com sucesso', id });
  } catch (erro) {
    console.error('Erro ao criar ativo:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

//  Atualiza um ativo existente
async function atualizarAtivo(req, res) {
  try {
    const { id } = req.params;

    // Verifica se o ativo existe
    const [existe] = await db.query('SELECT * FROM ativos WHERE id = ?', [id]);

    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Ativo não encontrado' });
    }

    const ativoAntigo = existe[0];
    const {
      patrimonio, marca, modelo, categoria, agencia_id,
      usuario_ativo, status, processador, geracao, ram, so,
      data_aquisicao, inicio_garantia, fim_garantia, descricao
    } = req.body;

    await db.query(
      `UPDATE ativos SET
        patrimonio = ?, marca = ?, modelo = ?, categoria = ?, agencia_id = ?,
        usuario_ativo = ?, status = ?, processador = ?, geracao = ?, ram = ?,
        so = ?, data_aquisicao = ?, inicio_garantia = ?, fim_garantia = ?, descricao = ?
       WHERE id = ?`,
      [patrimonio, marca, modelo, categoria, agencia_id,
       usuario_ativo, status, processador, geracao, ram, so,
       data_aquisicao, inicio_garantia, fim_garantia, descricao, id]
    );

    // Detecta mudanças para o histórico
    const mudancas = [];
    if (ativoAntigo.agencia_id !== agencia_id) mudancas.push('Transferência de agência');
    if (ativoAntigo.status !== status) mudancas.push(`Status alterado de "${ativoAntigo.status}" para "${status}"`);
    if (ativoAntigo.usuario_ativo !== usuario_ativo) mudancas.push(`Usuário alterado de "${ativoAntigo.usuario_ativo || 'N/A'}" para "${usuario_ativo || 'N/A'}"`);

    if (mudancas.length > 0) {
      await db.query(
        `INSERT INTO historico_ativos (ativo_id, tipo, descricao, usuario_email)
         VALUES (?, 'Atualização', ?, ?)`,
        [id, mudancas.join('; '), req.usuario.email]
      );
    }

    res.json({ mensagem: 'Ativo atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar ativo:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

//  Remove um ativo (com aprovação de admin)
async function deletarAtivo(req, res) {
  try {
    const { id } = req.params;

    const [existe] = await db.query('SELECT id FROM ativos WHERE id = ?', [id]);

    if (existe.length === 0) {
      return res.status(404).json({ erro: 'Ativo não encontrado' });
    }

    // Registra a baixa no histórico ANTES de deletar
    await db.query(
      `INSERT INTO historico_ativos (ativo_id, tipo, descricao, usuario_email)
       VALUES (?, 'Baixa', 'Ativo removido do sistema', ?)`,
      [id, req.usuario.email]
    );

    await db.query('DELETE FROM ativos WHERE id = ?', [id]);

    res.json({ mensagem: 'Ativo removido com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar ativo:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = {
  listarAtivos,
  buscarAtivo,
  criarAtivo,
  atualizarAtivo,
  deletarAtivo
};