// public/js/agencias.js

let agenciaEditando = null;

// ============================================================
//  CARREGAR E RENDERIZAR
// ============================================================
async function carregarAgencias() {
  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/agencias`);
    if (!resposta.ok) throw new Error('Erro ao carregar agências');

    const agencias = await resposta.json();

    const tbody = document.querySelector('#tabela-agencias tbody');
    tbody.innerHTML = '';

    if (agencias.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhuma agência cadastrada</td></tr>';
      return;
    }

    agencias.forEach(g => {
      const linha = document.createElement('tr');
      linha.className = 'linha-agencia';
      linha.title = 'Clique para ver os detalhes e os ativos da agência';
      linha.innerHTML = `
        <td><span class="seta-expansao" id="seta-${g.id}">▸</span> <strong>${g.codigo}</strong></td>
        <td>${g.nome}</td>
        <td>${g.cnpj || '—'}</td>
        <td>${g.total_ativos}</td>
        <td>${g.em_uso}</td>
        <td>${g.em_estoque}</td>
        <td>${g.em_manutencao}</td>
        <td onclick="event.stopPropagation()">
          <div class="acoes-tabela">
            <button class="btn-acao" onclick="abrirEditar(${g.id})" title="Editar">✏️</button>
            <button class="btn-acao excluir" onclick="abrirExcluir(${g.id}, '${g.nome}')" title="Excluir">🗑️</button>
          </div>
        </td>
      `;
      linha.addEventListener('click', () => alternarDetalhes(g.id, g));
      tbody.appendChild(linha);
    });
  } catch (erro) {
    console.error('Erro ao carregar agências:', erro);
    mostrarToast('Erro ao carregar agências', 'erro');
  }
}

// ============================================================
//  EXPANSÃO — ficha da agência + ativos alocados (sob demanda)
// ============================================================
async function alternarDetalhes(id, agencia) {
  const existente = document.getElementById(`detalhes-${id}`);

  // Já aberta → recolhe
  if (existente) {
    existente.remove();
    document.getElementById(`seta-${id}`)?.classList.remove('expandida');
    return;
  }

  // Comportamento sanfona: fecha qualquer outra agência aberta
  document.querySelectorAll('.linha-detalhes').forEach(l => l.remove());
  document.querySelectorAll('.seta-expansao.expandida').forEach(s => s.classList.remove('expandida'));

  // Monta a linha de detalhes (ficha + contêiner de ativos)
  const linha = document.createElement('tr');
  linha.className = 'linha-detalhes';
  linha.id = `detalhes-${id}`;
  linha.innerHTML = `
    <td colspan="8">
      <div class="detalhes-agencia">
        <div class="ficha-agencia">
          <div class="ficha-item">
            <span class="ficha-label">Nome</span>
            <span class="ficha-valor">${agencia.nome}</span>
          </div>
          <div class="ficha-item">
            <span class="ficha-label">Código</span>
            <span class="ficha-valor">${agencia.codigo}</span>
          </div>
          <div class="ficha-item">
            <span class="ficha-label">CNPJ</span>
            <span class="ficha-valor">${agencia.cnpj || '—'}</span>
          </div>
          <div class="ficha-item">
            <span class="ficha-label">Endereço</span>
            <span class="ficha-valor">${agencia.endereco || '—'}</span>
          </div>
        </div>
        <h4 class="ativos-titulo">Ativos alocados</h4>
        <div class="ativos-agencia-conteudo" id="ativos-${id}">Carregando...</div>
      </div>
    </td>
  `;

  // Insere imediatamente abaixo da linha da agência e marca a seta
  document.getElementById(`seta-${id}`).closest('tr').after(linha);
  document.getElementById(`seta-${id}`).classList.add('expandida');

  // Carrega os ativos apenas quando a agência é expandida
  const conteudo = document.getElementById(`ativos-${id}`);
  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/agencias/${id}/ativos`);
    if (!resposta.ok) throw new Error('Erro ao carregar ativos');
    const ativos = await resposta.json();

    if (ativos.length === 0) {
      conteudo.innerHTML = '<p class="sem-ativos-agencia">Nenhum ativo alocado nesta agência.</p>';
      return;
    }

    conteudo.innerHTML = `
      <table class="tabela tabela-ativos-agencia">
        <thead>
          <tr>
            <th>SERVICE TAG</th>
            <th>EQUIPAMENTO</th>
            <th>TIPO</th>
            <th>PATRIMÔNIO</th>
            <th>USUÁRIO</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${ativos.map(a => `
            <tr>
              <td><strong>${a.service_tag || a.tag || '—'}</strong></td>
              <td>${[a.marca, a.modelo].filter(Boolean).join(' ') || '—'}</td>
              <td>${a.tipo || '—'}</td>
              <td>${a.patrimonio || '—'}</td>
              <td>${a.usuario || '—'}</td>
              <td><span class="${classeBadgeStatus(a.status)}">${a.status || '—'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (erro) {
    console.error('Erro ao carregar ativos da agência:', erro);
    conteudo.innerHTML = '<p class="sem-ativos-agencia">Erro ao carregar os ativos.</p>';
  }
}

// Reaproveita os badges de status que já existem no CSS global
function classeBadgeStatus(status) {
  if (status === 'Em Uso') return 'badge badge-em-uso';
  if (status === 'Manutenção') return 'badge badge-manutenção';
  return 'badge badge-em-estoque';
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