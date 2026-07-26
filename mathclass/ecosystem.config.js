module.exports = {
  apps: [
    {
      name:       "mathclass-api",
      script:     "server.js",
      cwd:        "/var/www/mathclass/backend",
      instances:  1,
      autorestart: true,
      watch:      false,
      env: {
        NODE_ENV:    "production",
        PORT:        3001,
      },
    },
  ],
};
