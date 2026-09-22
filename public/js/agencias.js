// public/js/agencias.js

let agenciaEditando = null;

// ============================================================
//  CARREGAR E RENDERIZAR
// ============================================================
async function carregarAgencias() {
  const resposta = await fetchAutenticado(`${API_BASE}/api/agencias`);
  const agencias = await resposta.json();

  const tbody = document.querySelector('#tabela-agencias tbody');
  tbody.innerHTML = '';

  if (agencias.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhuma agência cadastrada</td></tr>';
    return;
  }

  agencias.forEach(g => {
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td><strong>${g.codigo}</strong></td>
      <td>${g.nome}</td>
      <td>${g.cnpj || '—'}</td>
      <td>${g.total_ativos}</td>
      <td>${g.em_uso}</td>
      <td>${g.em_estoque}</td>
      <td>${g.em_manutencao}</td>
      <td>
        <div class="acoes-tabela">
          <button class="btn-acao" onclick="abrirEditar(${g.id})" title="Editar">✏️</button>
          <button class="btn-acao excluir" onclick="abrirExcluir(${g.id}, '${g.nome}')" title="Excluir">🗑️</button>
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
  agenciaEditando = null;
  document.getElementById('modal-titulo').textContent = 'Nova Agência';
  document.getElementById('form-agencia').reset();
  document.getElementById('f-codigo').disabled = false;
  document.getElementById('modal-agencia').classList.add('aberto');
}

async function abrirEditar(id) {
  agenciaEditando = id;

  const resposta = await fetchAutenticado(`${API_BASE}/api/agencias`);
  const agencias = await resposta.json();
  const g = agencias.find(x => x.id === id);

  document.getElementById('modal-titulo').textContent = `Editar Agência: ${g.codigo}`;
  document.getElementById('f-codigo').value = g.codigo;
  document.getElementById('f-codigo').disabled = true;
  document.getElementById('f-nome').value = g.nome;
  document.getElementById('f-endereco').value = g.endereco || '';
  document.getElementById('f-cnpj').value = g.cnpj || '';

  document.getElementById('modal-agencia').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal-agencia').classList.remove('aberto');
}

// ============================================================
//  SALVAR
// ============================================================
document.getElementById('btn-salvar').addEventListener('click', async () => {
  const form = document.getElementById('form-agencia');
  if (!form.reportValidity()) return;

  const corpo = {
    codigo: document.getElementById('f-codigo').value.trim().toUpperCase(),
    nome: document.getElementById('f-nome').value,
    endereco: document.getElementById('f-endereco').value,
    cnpj: document.getElementById('f-cnpj').value
  };

  try {
    let resposta;

    if (agenciaEditando) {
      resposta = await fetchAutenticado(`${API_BASE}/api/agencias/${agenciaEditando}`, {
        method: 'PUT',
        body: JSON.stringify(corpo)
      });
    } else {
      resposta = await fetchAutenticado(`${API_BASE}/api/agencias`, {
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
    mostrarToast(agenciaEditando ? 'Agência atualizada com sucesso' : 'Agência criada com sucesso', 'sucesso');
    carregarAgencias();

  } catch (erro) {
    console.error('Erro ao salvar agência:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
});

// ============================================================
//  EXCLUIR (com confirmação nativa + proteção de ativos)
// ============================================================
async function abrirExcluir(id, nome) {
  const confirmado = confirm(`Deseja realmente excluir a agência "${nome}"?\n\nA exclusão será bloqueada se houver ativos alocados nela.`);
  if (!confirmado) return;

  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/agencias/${id}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao excluir', 'erro');
      return;
    }

    mostrarToast('Agência removida com sucesso', 'sucesso');
    carregarAgencias();

  } catch (erro) {
    console.error('Erro ao excluir agência:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
}

// ============================================================
//  TOAST (mesma função da página de ativos)
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
carregarAgencias();