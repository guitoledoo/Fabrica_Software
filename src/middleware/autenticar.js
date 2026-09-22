// src/middleware/autenticar.js
const jwt = require('jsonwebtoken');

// Este middleware verifica se o token JWT está presente
// e é válido. Se sim, anexa os dados do usuário em req.usuario
// para que as rotas possam saber quem está fazendo a requisição.
function autenticar(req, res, next) {
  // 1. Pega o token do header Authorization
  //    Formato esperado: "Bearer eyJhbGciOiJIUzI1..."
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  // 2. Separa "Bearer" do token em si
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ erro: 'Token mal formatado' });
  }

  const token = parts[1];

  try {
    // 3. Verifica se o token é válido e não expirou
    //    jwt.verify decodifica e valida a assinatura
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Anexa os dados do usuário na requisição
    //    Agora qualquer rota pode acessar req.usuario.id, req.usuario.nivel, etc.
    req.usuario = decoded;

    // 5. next() passa para a próxima função (a rota em si)
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

module.exports = autenticar;