const Joi = require("joi");

// ── Auth ────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required(),
  password: Joi.string().min(1).max(200).required(),
});

const logoutSchema = Joi.object({
  sid: Joi.string().uuid().required(),
  remaining_seconds: Joi.number().integer().min(0).allow(null).optional(),
});

// ── Users ───────────────────────────────────────────────────────
const createUserSchema = Joi.object({
  username: Joi.string().trim().min(2).max(100).required(),
  name:     Joi.string().trim().min(2).max(200).required(),
  // pole przyjmuje hasło w plaintext, backend hashuje
  password_hash: Joi.string().min(4).max(200).required(),
  role:     Joi.string().valid("admin", "student", "teacher").default("student"),
  class_id: Joi.string().uuid().allow(null, "").optional(),
  active:   Joi.boolean().default(true),
  session_minutes: Joi.number().integer().min(1).max(480).allow(null).optional(),
  session_locked:  Joi.boolean().default(false),
});

const patchUserSchema = Joi.object({
  username: Joi.string().trim().min(2).max(100).optional(),
  name:     Joi.string().trim().min(2).max(200).optional(),
  password_hash: Joi.string().min(4).max(200).optional(),
  role:     Joi.string().valid("admin", "student", "teacher").optional(),
  class_id: Joi.string().uuid().allow(null, "").optional(),
  active:   Joi.boolean().optional(),
  session_minutes: Joi.number().integer().min(1).max(480).allow(null).optional(),
  session_locked:  Joi.boolean().optional(),
  remaining_seconds: Joi.number().integer().min(0).allow(null).optional(),
}).min(1); // przynajmniej jedno pole

const generateClassSchema = Joi.object({
  class_id:   Joi.string().uuid().required(),
  class_name: Joi.string().trim().min(1).max(20).required(),
  count:      Joi.number().integer().min(1).max(60).required(),
  session_minutes: Joi.number().integer().min(1).max(480).allow(null).optional(),
});

// ── Tasks ───────────────────────────────────────────────────────
const createTaskSchema = Joi.object({
  question:   Joi.string().trim().min(2).max(2000).required(),
  answer:     Joi.string().trim().min(1).max(500).required(),
  category:   Joi.string().trim().min(1).max(100).default("Różne"),
  difficulty: Joi.string().valid("łatwe", "średnie", "trudne").default("łatwe"),
  image_url:  Joi.string().uri().allow(null, "").optional(),
  active:     Joi.boolean().default(true),
});

// ── Answers ─────────────────────────────────────────────────────
const createAnswerSchema = Joi.object({
  user_id:      Joi.string().uuid().required(),
  task_id:      Joi.string().uuid().required(),
  given_answer: Joi.string().trim().min(0).max(500).required(),
  correct:      Joi.boolean().required(),
  attempt_no:   Joi.number().integer().min(1).default(1),
});

module.exports = {
  loginSchema,
  logoutSchema,
  createUserSchema,
  patchUserSchema,
  generateClassSchema,
  createTaskSchema,
  createAnswerSchema,
};
