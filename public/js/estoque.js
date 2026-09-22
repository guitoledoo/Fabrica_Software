// public/js/estoque.js

let catalogo = [];

// ============================================================
//  CARREGAR SALDO E MOVIMENTAÇÕES
// ============================================================
async function carregarEstoque() {
  const resposta = await fetchAutenticado(`${API_BASE}/api/estoque`);
  catalogo = await resposta.json();

  const tbody = document.querySelector('#tabela-estoque tbody');
  tbody.innerHTML = '';

  if (catalogo.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhum item no catálogo</td></tr>';
    return;
  }

  catalogo.forEach(item => {
    const emAlerta = item.alerta_baixo === 1 || item.alerta_baixo === true;
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td><strong>${item.tag}</strong></td>
      <td>${item.descricao}</td>
      <td>${item.categoria}</td>
      <td>${item.entradas}</td>
      <td>${item.saidas}</td>
      <td class="${emAlerta ? 'valor-alerta' : ''}"><strong>${item.saldo}</strong></td>
      <td>${item.minimo}</td>
      <td>${emAlerta
        ? '<span class="badge badge-baixa">⚠️ Repor</span>'
        : '<span class="badge badge-em-uso">OK</span>'}</td>
    `;
    tbody.appendChild(linha);
  });

  // Popula o select do modal com os itens do catálogo
  const selectTag = document.getElementById('m-tag');
  selectTag.innerHTML = catalogo
    .map(item => `<option value="${item.tag}">${item.tag} — ${item.descricao} (saldo: ${item.saldo})</option>`)
    .join('');
}

async function carregarMovimentacoes() {
  const resposta = await fetchAutenticado(`${API_BASE}/api/estoque/movimentacoes?limite=20`);
  const dados = await resposta.json();

  const tbody = document.querySelector('#tabela-movimentacoes tbody');
  tbody.innerHTML = '';

  if (dados.registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="sem-dados">Nenhuma movimentação registrada</td></tr>';
    return;
  }

  dados.registros.forEach(m => {
    const linha = document.createElement('tr');
    const origemDestino = m.tipo === 'Entrada'
      ? `${m.quem_entregou || '—'} → ${m.setor_entrada || '—'}`
      : `${m.setor_saida || '—'} → ${m.para_quem || '—'}`;

    linha.innerHTML = `
      <td>${formatarData(m.data_hora)}</td>
      <td><strong>${m.tag}</strong></td>
      <td><span class="badge ${m.tipo === 'Entrada' ? 'badge-criação' : 'badge-atualização'}">${m.tipo}</span></td>
      <td>${m.quantidade}</td>
      <td>${origemDestino}</td>
      <td>${m.descricao || '—'}</td>
    `;
    tbody.appendChild(linha);
  });
}

// ============================================================
//  MODAL — alternância dos campos Entrada/Saída
// ============================================================
function alternarCampos() {
  const tipo = document.getElementById('m-tipo').value;
  document.querySelector('.grupo-entrada').style.display = tipo === 'Entrada' ? 'block' : 'none';
  document.querySelector('.grupo-saida').style.display = tipo === 'Saída' ? 'block' : 'none';
}

document.getElementById('m-tipo').addEventListener('change', alternarCampos);

function abrirModal() {
  document.getElementById('form-mov').reset();
  alternarCampos();
  document.getElementById('modal-mov').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal-mov').classList.remove('aberto');
}

// ============================================================
//  REGISTRAR MOVIMENTAÇÃO
// ============================================================
document.getElementById('btn-salvar').addEventListener('click', async () => {
  const form = document.getElementById('form-mov');
  if (!form.reportValidity()) return;

  const tipo = document.getElementById('m-tipo').value;

  const corpo = {
    tag: document.getElementById('m-tag').value,
    tipo: tipo,
    quantidade: parseInt(document.getElementById('m-quantidade').value),
    descricao: document.getElementById('m-descricao').value
  };

  if (tipo === 'Entrada') {
    corpo.quem_entregou = document.getElementById('m-quem-entregou').value;
    corpo.setor_entrada = document.getElementById('m-setor-entrada').value;
  } else {
    corpo.para_quem = document.getElementById('m-para-quem').value;
    corpo.setor_saida = document.getElementById('m-setor-saida').value;
  }

  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/estoque/movimentacao`, {
      method: 'POST',
      body: JSON.stringify(corpo)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao registrar', 'erro');
      return;
    }

    fecharModal();
    mostrarToast('Movimentação registrada com sucesso', 'sucesso');
    carregarEstoque();
    carregarMovimentacoes();

  } catch (erro) {
    console.error('Erro ao registrar movimentação:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
});

// ============================================================
//  TOAST
// ============================================================
function mostrarToast(mensagem, tipo) {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `toast ${tipo}`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ============================================================
//  INICIALIZAÇÃO
// ============================================================
document.getElementById('btn-movimentacao').addEventListener('click', abrirModal);
carregarEstoque().then(carregarMovimentacoes);