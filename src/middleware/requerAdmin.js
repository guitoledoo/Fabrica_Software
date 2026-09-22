// src/middleware/requerAdmin.js
// Este middleware deve rodar DEPOIS do autenticar.js
// Ele verifica se o usuário autenticado tem nível "Admin"
function requerAdmin(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ erro: 'Usuário não autenticado' });
  }

  if (req.usuario.nivel !== 'Admin') {
    return res.status(403).json({
      erro: 'Acesso negado. Apenas administradores podem executar esta ação.'
    });
  }

  next();
}

module.exports = requerAdmin;