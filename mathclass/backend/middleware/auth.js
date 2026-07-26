const jwt = require("jsonwebtoken");

/**
 * Weryfikuje JWT z nagłówka Authorization: Bearer <token>
 * Dodaje req.user = { userId, role, sid }
 */
function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Brak tokenu autoryzacji." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token nieprawidłowy lub wygasły." });
  }
}

/**
 * Sprawdza czy zalogowany użytkownik ma wymagane role.
 * Użycie: requireRole("admin", "teacher")
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Brak autoryzacji." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Brak uprawnień." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
