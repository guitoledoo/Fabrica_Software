// public/js/usuarios.js

let idParaSenha = null;

async function carregarUsuarios() {
  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/usuarios`);
    if (!resposta.ok) throw new Error('Erro ao carregar usuários');
    const usuarios = await resposta.json();

    const tbody = document.querySelector('#tabela-usuarios tbody');
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="sem-dados">Nenhum usuário cadastrado</td></tr>';
      return;
    }

    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');

    usuarios.forEach(u => {
      const badge = u.nivel === 'Admin'
        ? '<span class="badge badge-atualização">Admin</span>'
        : '<span class="badge badge-em-estoque">Leitor</span>';

      // Indicador visual de senha temporária ativa (Opção A)
      const badgeTemp = u.troca_obrigatoria
        ? ' <span class="badge badge-baixa">senha temporária</span>'
        : '';

      const souEu = u.id === usuarioLogado.id;

      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td>${u.id}</td>
        <td><strong>${u.nome}</strong>${souEu ? ' <span style="color:var(--neutro-500); font-size:0.8rem;">(você)</span>' : ''}${badgeTemp}</td>
        <td>${u.email}</td>
        <td>${badge}</td>
        <td>${formatarData(u.criado_em)}</td>
        <td>
          <div class="acoes-tabela">
            <button class="btn-acao" onclick="abrirModalSenha(${u.id}, '${u.nome}')" title="Redefinir senha">🔑</button>
            <button class="btn-acao" onclick="alternarNivel(${u.id}, '${u.nivel}')" title="Alternar Admin/Leitor">⇄</button>
            <button class="btn-acao excluir" onclick="excluirUsuario(${u.id}, '${u.nome}', ${souEu})" title="Excluir">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(linha);
    });
  } catch (erro) {
    console.error('Erro ao carregar usuários:', erro);
    mostrarToast('Erro ao carregar usuários', 'erro');
  }
}

// ============================================================
//  MODAL: NOVO USUÁRIO
// ============================================================
document.getElementById('btn-novo').addEventListener('click', () => {
  document.getElementById('form-usuario').reset();
  document.getElementById('modal-usuario').classList.add('aberto');
});

function fecharModal() {
  document.getElementById('modal-usuario').classList.remove('aberto');
}

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const form = document.getElementById('form-usuario');
  if (!form.reportValidity()) return;

  const corpo = {
    nome: document.getElementById('f-nome').value,
    email: document.getElementById('f-email').value,
    senha: document.getElementById('f-senha').value,
    nivel: document.getElementById('f-nivel').value
  };

  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/usuarios`, {
      method: 'POST',
      body: JSON.stringify(corpo)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao criar usuário', 'erro');
      return;
    }

    fecharModal();
    mostrarToast('Usuário criado com sucesso', 'sucesso');
    carregarUsuarios();

  } catch (erro) {
    console.error('Erro ao criar usuário:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
});

// ============================================================
//  REDEFINIR SENHA (Opção A) — o SISTEMA gera a temporária
// ============================================================
function abrirModalSenha(id, nome) {
  idParaSenha = id;
  document.getElementById('senha-nome-usuario').textContent = nome;
  document.getElementById('modal-senha').classList.add('aberto');
}

function fecharModalSenha() {
  document.getElementById('modal-senha').classList.remove('aberto');
  idParaSenha = null;
}

document.getElementById('btn-confirmar-senha').addEventListener('click', async () => {
  if (!idParaSenha) return;

  try {
    // Corpo vazio de propósito: quem gera a senha é o sistema, não o admin
    const resposta = await fetchAutenticado(`${API_BASE}/api/usuarios/${idParaSenha}/senha`, {
      method: 'PUT',
      body: JSON.stringify({})
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao gerar senha temporária', 'erro');
      return;
    }

    fecharModalSenha();

    // A senha temporária é exibida UMA ÚNICA VEZ
    document.getElementById('senha-temp-valor').textContent = dados.senha_temporaria;
    document.getElementById('modal-senha-temp').classList.add('aberto');
    carregarUsuarios(); // atualiza o badge "senha temporária"

  } catch (erro) {
    console.error('Erro ao redefinir senha:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
});

function copiarSenhaTemp() {
  const senha = document.getElementById('senha-temp-valor').textContent;
  navigator.clipboard.writeText(senha)
    .then(() => mostrarToast('Senha copiada para a área de transferência', 'sucesso'))
    .catch(() => mostrarToast('Não foi possível copiar — selecione a senha manualmente', 'erro'));
}

function fecharModalSenhaTemp() {
  document.getElementById('modal-senha-temp').classList.remove('aberto');
  document.getElementById('senha-temp-valor').textContent = '—'; // a senha some da tela
}

// ============================================================
//  AÇÕES RÁPIDAS: ALTERNAR NÍVEL E EXCLUIR
// ============================================================
async function alternarNivel(id, nivelAtual) {
  const novoNivel = nivelAtual === 'Admin' ? 'Leitor' : 'Admin';

  if (!confirm(`Alterar o nível deste usuário para ${novoNivel}?`)) return;

  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/usuarios/${id}/nivel`, {
      method: 'PUT',
      body: JSON.stringify({ nivel: novoNivel })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao alterar nível', 'erro');
      return;
    }

    mostrarToast(`Nível alterado para ${novoNivel}`, 'sucesso');
    carregarUsuarios();

  } catch (erro) {
    console.error('Erro ao alterar nível:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
}

async function excluirUsuario(id, nome, souEu) {
  if (souEu) {
    mostrarToast('Você não pode excluir seu próprio usuário', 'erro');
    return;
  }

  if (!confirm(`Deseja realmente excluir o usuário "${nome}"?`)) return;

  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/usuarios/${id}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || 'Erro ao excluir', 'erro');
      return;
    }

    mostrarToast('Usuário excluído com sucesso', 'sucesso');
    carregarUsuarios();

  } catch (erro) {
    console.error('Erro ao excluir usuário:', erro);
    mostrarToast('Erro de conexão com o servidor', 'erro');
  }
}

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

carregarUsuarios();