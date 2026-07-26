/**
 * Centralny error handler Express.
 * Musi być OSTATNIM app.use() w server.js.
 *
 * Loguje pełny stack na serwerze, ale do klienta wysyła
 * tylko bezpieczny komunikat — bez wycieków stacku/danych DB.
 */
function errorHandler(err, req, res, next) {
  // Loguj techniczne szczegóły (tylko server-side)
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${req.method} ${req.path}`);
  console.error(err.stack || err.message || err);

  // Nie wysyłaj już odpowiedzi jeśli headers poszły
  if (res.headersSent) return next(err);

  // Mapuj znane kody błędów PG
  if (err.code === "23505") {
    return res.status(409).json({ error: "Rekord już istnieje (duplikat)." });
  }
  if (err.code === "23503") {
    return res.status(400).json({ error: "Naruszenie klucza obcego." });
  }
  if (err.code === "22P02") {
    return res.status(400).json({ error: "Nieprawidłowy format UUID." });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token nieprawidłowy lub wygasły." });
  }

  // Domyślny 500
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : "Wewnętrzny błąd serwera.";
  res.status(status).json({ error: message });
}

/**
 * Obsługuje trasy których nie znaleziono (404).
 * Używaj przed errorHandler.
 */
function notFound(req, res) {
  res.status(404).json({ error: `Endpoint nie istnieje: ${req.method} ${req.path}` });
}

module.exports = { errorHandler, notFound };
