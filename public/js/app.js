// public/js/app.js

// API_BASE: endereço da API. Em produção, isso viraria do .env
// ou seria o domínio real do servidor
const API_BASE = 'http://localhost:3001';

// ============================================================
//  GUARDA DE AUTENTICAÇÃO
//  Roda em TODAS as páginas (menos login). Se não tem token,
//  expulsa o usuário de volta para o login
// ============================================================
const token = localStorage.getItem('token');

if (!token) {
  window.location.href = '/login.html';
}

// ============================================================
//  FUNÇÃO fetchAutenticado
//  Envolve o fetch() padrão e injeta automaticamente o header
//  Authorization com o token salvo. Todas as chamadas da API
//  usam esta função — assim não repetimos o header toda vez
// ============================================================
async function fetchAutenticado(url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      ...opcoes.headers
    }
  });

  // Se o token expirou, a API responde 401.
  // Nesse caso, limpamos a sessão e mandamos para o login
  if (resposta.status === 401) {
    localStorage.clear();
    window.location.href = '/login.html';
    throw new Error('Sessão expirada');
  }

  return resposta;
}

// ============================================================
//  MOSTRAR USUÁRIO LOGADO NA NAVBAR
// ============================================================
const usuarioSalvo = JSON.parse(localStorage.getItem('usuario') || '{}');

const spanNome = document.getElementById('usuario-nome');
if (spanNome && usuarioSalvo.nome) {
  spanNome.textContent = `${usuarioSalvo.nome} (${usuarioSalvo.nivel})`;
}

// ============================================================
//  BOTÃO SAIR
//  Limpa o localStorage e volta para o login
// ============================================================
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login.html';
  });
}

// ============================================================
//  FORMATADOR DE DATA (usado em várias telas)
// ============================================================
function formatarData(dataISO) {
  if (!dataISO) return '-';
  const d = new Date(dataISO);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}