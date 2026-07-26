#!/usr/bin/env node
/**
 * Prosty runner migracji SQL.
 * Uruchom: node migrations/migrate.js
 *
 * Tworzy tabelę _migrations i wykonuje tylko nowe pliki .sql
 * w kolejności numerycznej.
 */
require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "mathclass",
  user:     process.env.DB_USER     || "mathclass_user",
  password: process.env.DB_PASSWORD || "",
});

async function run() {
  const client = await pool.connect();
  try {
    // Tabela śledzenia migracji
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Znajdź wszystkie pliki SQL posortowane numerycznie
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    // Sprawdź które już były wykonane
    const { rows: done } = await client.query("SELECT filename FROM _migrations");
    const applied = new Set(done.map(r => r.filename));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  ✓ ${file} (już wykonana)`);
        continue;
      }

      console.log(`  → Wykonuję: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`  ✓ ${file} OK`);
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ ${file} BŁĄD:`, err.message);
        process.exit(1);
      }
    }

    if (count === 0) {
      console.log("\nBaza aktualna — brak nowych migracji.");
    } else {
      console.log(`\nWykonano ${count} migracj${count === 1 ? "ę" : "e"}.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error("Błąd migratora:", err);
  process.exit(1);
});
