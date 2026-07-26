/**
 * Middleware fabryka do walidacji body requestu.
 * Przyjmuje schemat Joi i zwraca middleware Express.
 *
 * Użycie:
 *   const { validate } = require("../middleware/validate");
 *   router.post("/", validate(myJoiSchema), handler);
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // zbierz wszystkie błędy naraz
      stripUnknown: true,  // usuń pola których nie ma w schemacie
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({ error: "Błąd walidacji.", details: messages });
    }

    req.body = value; // podmień body na oczyszczone dane
    next();
  };
}

module.exports = { validate };
