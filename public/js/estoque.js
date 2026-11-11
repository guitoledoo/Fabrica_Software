// ============================================================
// ESTOQUE — Gestão de Ativos TI
// Depende de app.js: API_BASE e fetchAutenticado (globais)
// ============================================================

let itensCache = [];
let tagEditando = null;
let tagExcluindo = null;

// ---------- UTILITÁRIOS ----------
function mostrarToast(mensagem, tipo) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.className = 'toast ' + (tipo === 'erro' ? 'erro' : 'sucesso');
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function formatarData(dataHora) {
  if (!dataHora) return '-';
  const d = new Date(dataHora);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------- CARREGAMENTO ----------
async function carregarEstoque() {
  try {
    // Saldo por item
    const respostaItens = await fetchAutenticado(`${API_BASE}/api/estoque`);
    if (!respostaItens.ok) throw new Error('Erro ao carregar itens');
    itensCache = await respostaItens.json();
    renderizarTabelaItens();
    preencherSeletor();

    // Últimas movimentações
    const respostaMovs = await fetchAutenticado(`${API_BASE}/api/estoque/movimentacoes?limite=20`);
    if (!respostaMovs.ok) throw new Error('Erro ao carregar movimentações');
    const movimentacoes = await respostaMovs.json();
    renderizarMovimentacoes(movimentacoes);
  } catch (erro) {
    console.error('Erro ao carregar estoque:', erro);
    mostrarToast('Erro ao carregar dados do estoque', 'erro');
  }
}

// ---------- TABELA DE SALDOS ----------
function renderizarTabelaItens() {
  const tbody = document.getElementById('tabela-estoque');
  if (!tbody) return;

  tbody.innerHTML = itensCache.map(item => {
    const emAlerta = item.saldo < item.minimo;
    return `
      <tr>
        <td><strong>${item.tag}</strong></td>
        <td>${item.descricao}</td>
        <td>${item.categoria || '-'}</td>
        <td>${item.entradas}</td>
        <td>${item.saidas}</td>
        <td class="${emAlerta ? 'valor-alerta' : ''}">${item.saldo}</td>
        <td>${item.minimo}</td>
        <td>${emAlerta
          ? '<span class="badge badge-baixa">Abaixo do mínimo</span>'
          : '<span class="badge badge-em-uso">OK</span>'}</td>
        <td>
          <div class="acoes-tabela">
            <button class="btn-acao" onclick="editarItem('${item.tag}')" title="Editar">✏️</button>
            <button class="btn-acao excluir" onclick="excluirItem('${item.tag}')" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}


function renderizarMovimentacoes(movimentacoes) {
  const tbody = document.getElementById('tabela-movimentacoes');
  if (!tbody) return;

  tbody.innerHTML = movimentacoes.map(mov => {
    const origemDestino = mov.tipo === 'Entrada'
      ? (mov.quem_entregou || '-')
      : (mov.para_quem || '-');
    return `
      <tr>
        <td>${formatarData(mov.data_hora)}</td>
        <td><strong>${mov.tag}</strong></td>
        <td>${mov.tipo}</td>
        <td>${mov.quantidade}</td>
        <td>${origemDestino}</td>
        <td>${mov.descricao || '-'}</td>
        <td>
          <div class="acoes-tabela">
            <button class="btn-acao excluir"
                    onclick="excluirMovimentacao(${mov.id}, '${mov.tag}', ${mov.quantidade}, '${mov.tipo}')"
                    title="Excluir movimentação">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------- MODAL EXCLUIR MOVIMENTAÇÃO (Admin) ----------
let movExcluindo = null;

function excluirMovimentacao(id, tag, quantidade, tipo) {
  movExcluindo = id;
  document.getElementById('excluir-mov-mensagem').textContent =
    `Excluir a ${tipo.toLowerCase()} de ${quantidade} unidade(s) do item ${tag}?`;
  document.getElementById('modal-excluir-mov').classList.add('aberto');
}

function fecharModalExcluirMov() {
  document.getElementById('modal-excluir-mov').classList.remove('aberto');
  movExcluindo = null;
}

// ---------- MODAL MOVIMENTAÇÃO ----------
function preencherSeletor() {
  const seletor = document.getElementById('m-tag');
  if (!seletor) return;

  seletor.innerHTML = itensCache
    .map(item => `<option value="${item.tag}">${item.tag} — ${item.descricao} (saldo: ${item.saldo})</option>`)
    .join('');
}

function abrirModal() {
  document.getElementById('modal-mov').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal-mov').classList.remove('aberto');
}

// Mostra/esconde os campos conforme o tipo (Entrada x Saída)
function alternarCampos() {
  const tipo = document.getElementById('m-tipo').value;
  const gEntrada = document.getElementById('grupo-entrada');
  const gEntradaSetor = document.getElementById('grupo-entrada-setor');
  const gSaida = document.getElementById('grupo-saida');
  const gSaidaSetor = document.getElementById('grupo-saida-setor');
  if (gEntrada) gEntrada.style.display = tipo === 'Entrada' ? 'block' : 'none';
  if (gEntradaSetor) gEntradaSetor.style.display = tipo === 'Entrada' ? 'block' : 'none';
  if (gSaida) gSaida.style.display = tipo === 'Saída' ? 'block' : 'none';
  if (gSaidaSetor) gSaidaSetor.style.display = tipo === 'Saída' ? 'block' : 'none';
}

// ---------- REGISTRAR MOVIMENTAÇÃO ----------
async function salvarMovimentacao() {
  const tipo = document.getElementById('m-tipo').value;
  const tag = document.getElementById('m-tag').value;
  const quantidade = Number(document.getElementById('m-quantidade').value);
  const quem_entregou = document.getElementById('m-quem-entregou')?.value || '';
  const setor_entrada = document.getElementById('m-setor-entrada')?.value || '';
  const para_quem = document.getElementById('m-para-quem')?.value || '';
  const setor_saida = document.getElementById('m-setor-saida')?.value || '';
  const observacao = document.getElementById('m-descricao')?.value || '';

  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/estoque/movimentacao`, {
      method: 'POST',
      body: JSON.stringify({ tipo, tag, quantidade, quem_entregou, setor_entrada, para_quem, setor_saida, observacao })
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao registrar movimentação', 'erro');
      return;
    }

    mostrarToast('Movimentação registrada com sucesso', 'sucesso');
    fecharModal();
    document.getElementById('form-mov').reset();
    alternarCampos();
    carregarEstoque();
  } catch (erro) {
    console.error('Erro ao registrar movimentação:', erro);
    mostrarToast('Erro interno do servidor', 'erro');
  }
}

// ---------- MODAL EDITAR ITEM (Admin) ----------
function editarItem(tag) {
  const item = itensCache.find(i => i.tag === tag);
  if (!item) { mostrarToast('Item não encontrado', 'erro'); return; }

  tagEditando = tag;
  document.getElementById('edit-tag-info').textContent = item.tag;
  document.getElementById('edit-descricao').value = item.descricao;
  document.getElementById('edit-categoria').value = item.categoria || '';
  document.getElementById('edit-minimo').value = item.minimo;
  document.getElementById('modal-editar').classList.add('aberto');
}

function fecharModalEditar() {
  document.getElementById('modal-editar').classList.remove('aberto');
  tagEditando = null;
}

// ---------- MODAL EXCLUIR ITEM (Admin) ----------
function excluirItem(tag) {
  const item = itensCache.find(i => i.tag === tag);
  tagExcluindo = tag;
  document.getElementById('excluir-mensagem').textContent =
    `Excluir o item "${item ? item.descricao : tag}" (${tag}) do catálogo?`;
  document.getElementById('modal-excluir').classList.add('aberto');
}

function fecharModalExcluir() {
  document.getElementById('modal-excluir').classList.remove('aberto');
  tagExcluindo = null;
}

// ---------- INICIALIZAÇÃO ----------
document.addEventListener('DOMContentLoaded', () => {
  carregarEstoque();

  // Modal de movimentação
  document.getElementById('btn-movimentacao')?.addEventListener('click', abrirModal);
  document.getElementById('btn-fechar-mov')?.addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-mov')?.addEventListener('click', fecharModal);
  document.getElementById('btn-salvar')?.addEventListener('click', salvarMovimentacao);
  document.getElementById('m-tipo')?.addEventListener('change', alternarCampos);

  // Confirmações dos modais de editar/excluir
  document.getElementById('btn-confirmar-edicao')?.addEventListener('click', async () => {
    if (!tagEditando) return;
    try {
      const resposta = await fetchAutenticado(`${API_BASE}/api/estoque/itens/${encodeURIComponent(tagEditando)}`, {
        method: 'PUT',
        body: JSON.stringify({
          descricao: document.getElementById('edit-descricao').value,
          categoria: document.getElementById('edit-categoria').value,
          minimo: Number(document.getElementById('edit-minimo').value)
        })
      });
      const dados = await resposta.json();
      if (!resposta.ok) { mostrarToast(dados.erro || 'Erro ao atualizar item', 'erro'); return; }
      mostrarToast('Item atualizado com sucesso', 'sucesso');
      fecharModalEditar();
      carregarEstoque();
    } catch (erro) {
      console.error('Erro ao editar item:', erro);
      mostrarToast('Erro ao atualizar item', 'erro');
    }
  });

  document.getElementById('btn-confirmar-exclusao')?.addEventListener('click', async () => {
    if (!tagExcluindo) return;
    try {
      const resposta = await fetchAutenticado(`${API_BASE}/api/estoque/itens/${encodeURIComponent(tagExcluindo)}`, {
        method: 'DELETE'
      });
      const dados = await resposta.json();
      if (!resposta.ok) { mostrarToast(dados.erro || 'Erro ao excluir item', 'erro'); return; }
      mostrarToast('Item excluído com sucesso', 'sucesso');
      fecharModalExcluir();
      carregarEstoque();
    } catch (erro) {
      console.error('Erro ao excluir item:', erro);
      mostrarToast('Erro ao excluir item', 'erro');
    }
  });

  // Fechar modais clicando fora do box
  document.getElementById('modal-mov')?.addEventListener('click', e => {
    if (e.target.id === 'modal-mov') fecharModal();
  });
  document.getElementById('modal-editar')?.addEventListener('click', e => {
    if (e.target.id === 'modal-editar') fecharModalEditar();
  });
  document.getElementById('modal-excluir')?.addEventListener('click', e => {
    if (e.target.id === 'modal-excluir') fecharModalExcluir();
  });

  alternarCampos(); // estado inicial correto dos campos do modal

  document.getElementById('btn-confirmar-exclusao-mov')?.addEventListener('click', async () => {
  if (!movExcluindo) return;
  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/estoque/movimentacoes/${movExcluindo}`, {
      method: 'DELETE'
    });
    const dados = await resposta.json();
    if (!resposta.ok) { mostrarToast(dados.erro || 'Erro ao excluir movimentação', 'erro'); return; }
    mostrarToast('Movimentação excluída com sucesso', 'sucesso');
    fecharModalExcluirMov();
    carregarEstoque();
  } catch (erro) {
    console.error('Erro ao excluir movimentação:', erro);
    mostrarToast('Erro ao excluir movimentação', 'erro');
  }
});

document.getElementById('modal-excluir-mov')?.addEventListener('click', e => {
  if (e.target.id === 'modal-excluir-mov') fecharModalExcluirMov();
});
});