module.exports = {
  apps: [
    {
      name:        "mathclass-api",
      script:      "server.js",
      cwd:         "/var/www/mathclass/backend",
      instances:   1,
      autorestart: true,
      watch:       false,
      // Zmienne środowiskowe czytane z .env przez dotenv w server.js
      // NIE wpisuj tu haseł — trzymaj je w /var/www/mathclass/backend/.env
      env: {
        NODE_ENV: "production",
        PORT:     3001,
      },
    },
  ],
};
