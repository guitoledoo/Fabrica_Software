// public/js/ativos.js

let agenciasCarregadas = [];
let ativoEditando = null; // null = criando; string = editando este ID

// ============================================================
//  CARREGAR AGÊNCIAS (para os selects)
// ============================================================
async function carregarAgencias() {
  const resposta = await fetchAutenticado(`${API_BASE}/api/agencias`);
  agenciasCarregadas = await resposta.json();

  // Popula o select do filtro
  const filtroAg = document.getElementById('filtro-agencia');
  filtroAg.innerHTML = '<option value="">Todas as agências</option>' +
    agenciasCarregadas.map(a => `<option value="${a.id}">${a.codigo} - ${a.nome}</option>`).join('');

  // Popula o select do modal
  const modalAg = document.getElementById('f-agencia');
  modalAg.innerHTML = '<option value="">— Sem agência —</option>' +
    agenciasCarregadas.map(a => `<option value="${a.id}">${a.codigo} - ${a.nome}</option>`).join('');
}

// ============================================================
//  CARREGAR E RENDERIZAR ATIVOS
// ============================================================
async function carregarAtivos() {
  const busca = document.getElementById('filtro-busca').value.trim();
  const agencia = document.getElementById('filtro-agencia').value;
  const status = document.getElementById('filtro-status').value;

  // Monta a query string só com os filtros preenchidos
  const params = new URLSearchParams();
  if (busca) params.set('busca', busca);
  if (agencia) params.set('agencia', agencia);
  if (status) params.set('status', status);

  const resposta = await fetchAutenticado(`${API_BASE}/api/ativos?${params}`);
  const ativos = await resposta.json();

  const tbody = document.querySelector('#tabela-ativos tbody');
  tbody.innerHTML = '';

  if (ativos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhum ativo encontrado</td></tr>';
    return;
  }

  ativos.forEach(a => {
    // Badge de status com classe CSS correspondente
    const classeStatus = a.status.toLowerCase().replace(' ', '-');

    // Formata a data de garantia
    const garantia = a.fim_garantia
      ? new Date(a.fim_garantia).toLocaleDateString('pt-BR')
      : '—';

    // Alerta visual se a garantia vence em menos de 90 dias
    let garantiaHtml = garantia;
    if (a.fim_garantia) {
      const diasRestantes = Math.ceil((new Date(a.fim_garantia) - new Date()) / (1000 * 60 * 60 * 24));
      if (diasRestantes < 0) garantiaHtml = `<span style="color:var(--perigo); font-weight:600;">${garantia} (vencida)</span>`;
      else if (diasRestantes <= 90) garantiaHtml = `<span style="color:var(--alerta); font-weight:600;">${garantia}</span>`;
    }

    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td><strong>${a.id}</strong></td>
      <td>${a.marca || '—'} ${a.modelo || ''}</td>
      <td>${a.categoria || '—'}</td>
      <td>${a.agencia_codigo ? a.agencia_codigo : '—'}</td>
      <td>${a.usuario_ativo || '—'}</td>
      <td><span class="badge badge-${classeStatus}">${a.status}</span></td>
      <td>${garantiaHtml}</td>
      <td>
        <div class="acoes-tabela">
          <button class="btn-acao" onclick="abrirEditar('${a.id}')" title="Editar">✏️</button>
          <button class="btn-acao excluir" onclick="abrirExcluir('${a.id}')" title="Excluir">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(linha);
  });
}

// ============================================================
//  MODAL — CRIAR / EDITAR
// ============================================================
function abrirModalCriar() {
  ativoEditando = null;
  document.getElementById('modal-titulo').textContent = 'Novo Ativo';
  document.getElementById('form-ativo').reset();
  document.getElementById('f-id').disabled = false; // ID editável na criação
  document.getElementById('modal-ativo').classList.add('aberto');
}

async function abrirEditar(id) {
  ativoEditando = id;

  // Busca os dados completos do ativo
  const resposta = await fetchAutenticado(`${API_BASE}/api/ativos/${id}`);
  const a = await resposta.json();

  document.getElementById('modal-titulo').textContent = `Editar Ativo: ${id}`;
  document.getElementById('f-id').value = a.id;
  document.getElementById('f-id').disabled = true; // ID não muda na edição (chave primária)
  document.getElementById('f-patrimonio').value = a.patrimonio || '';
  document.getElementById('f-categoria').value = a.categoria || 'Desktop';
  document.getElementById('f-marca').value = a.marca || '';
  document.getElementById('f-modelo').value = a.modelo || '';
  document.getElementById('f-agencia').value = a.agencia_id || '';
  document.getElementById('f-usuario').value = a.usuario_ativo || '';
  document.getElementById('f-status').value = a.status || 'Em Uso';
  document.getElementById('f-processador').value = a.processador || '';
  document.getElementById('f-geracao').value = a.geracao || '';
  document.getElementById('f-ram').value = a.ram || '';
  document.getElementById('f-so').value = a.so || '';
  document.getElementById('f-aquisicao').value = a.data_aquisicao ? a.data_aquisicao.split('T')[0] : '';
  document.getElementById('f-inicio-garantia').value = a.inicio_garantia ? a.inicio_garantia.split('T')[0] : '';
  document.getElementById('f-fim-garantia').value = a.fim_garantia ? a.fim_garantia.split('T')[0] : '';
  document.getElementById('f-descricao').value = a.descricao || '';

  document.getElementById('modal-ativo').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal-ativo').classList.remove('aberto');
}

// ============================================================
//  SALVAR (POST ou PUT conforme o modo)
// ============================================================
document.getElementById('btn-salvar').addEventListener('click', async () => {
  const form = document.getElementById('form-ativo');

  // Validação nativa do HTML5 (required, etc.)
  if (!form.reportValidity()) return;

  const corpo = {
    patrimonio: document.getElementById('f-patrimonio').value,
    marca: document.getElementById('f-marca').value,
    modelo: document.getElementById('f-modelo').value,
    categoria: document.getElementById('f-categoria').value,
    agencia_id: document.getElementById('f-agencia').value || null,
    usuario_ativo: document.getElementById('f-usuario').value,
    status: document.getElementById('f-status').value,
    processador: document.getElementById('f-processador').value,
    geracao: document.getElementById('f-geracao').value,
    ram: document.getElementById('f-ram').value,
    so: document.getElementById('f-so').value,
    data_aquisicao: document.getElementById('f-aquisicao').value || null,
    inicio_garantia: document.getElementById('f-inicio-garantia').value || null,
    fim_garantia: document.getElementById('f-fim-garantia').value || null,
    descricao: document.getElementById('f-descricao').value
  };

  try {
    let resposta;

    if (ativoEditando) {
      // EDITAR → PUT
      resposta = await fetchAutenticado(`${API_BASE}/api/ativos/${ativoEditando}`, {
        method: 'PUT',
        body: JSON.stringify(corpo)
      });
    } else {
      // CRIAR → POST (o ID vai junto)
      corpo.id = document.getElementById('f-id').value.trim().toUpperCase();
      resposta = await fetchAutenticado(`${API_BASE}/api/ativos`, {
        method: 'POST',
        body: JSON.stringify(corpo)
      });
    }

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao salvar', 'erro');
      return;
    }

    fecharModal();
    mostrarToast(ativoEditando ? 'Ativo atualizado com sucesso' : 'Ativo criado com sucesso', 'sucesso');
    carregarAtivos();

  } catch (erro) {
    console.error('Erro ao salvar ativo:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
});

// ============================================================
//  MODAL — EXCLUIR
// ============================================================
let idParaExcluir = null;

function abrirExcluir(id) {
  idParaExcluir = id;
  document.getElementById('excluir-id').textContent = id;
  document.getElementById('modal-excluir').classList.add('aberto');
}

function fecharModalExcluir() {
  document.getElementById('modal-excluir').classList.remove('aberto');
}

document.getElementById('btn-confirmar-excluir').addEventListener('click', async () => {
  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/ativos/${idParaExcluir}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao excluir', 'erro');
      return;
    }

    fecharModalExcluir();
    mostrarToast('Ativo removido com sucesso', 'sucesso');
    carregarAtivos();

  } catch (erro) {
    console.error('Erro ao excluir ativo:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
});

// ============================================================
//  FILTROS COM DEBOUNCE
//  A busca dispara a cada tecla — mas com 400ms de espera
//  para não bombardear a API enquanto o usuário digita
// ============================================================
let timeoutBusca = null;
document.getElementById('filtro-busca').addEventListener('input', () => {
  clearTimeout(timeoutBusca);
  timeoutBusca = setTimeout(carregarAtivos, 400);
});

document.getElementById('filtro-agencia').addEventListener('change', carregarAtivos);
document.getElementById('filtro-status').addEventListener('change', carregarAtivos);

// ============================================================
//  TOAST DE NOTIFICAÇÃO
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
document.getElementById('btn-novo').addEventListener('click', abrirModalCriar);

carregarAgencias().then(carregarAtivos);