module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "./dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      merge_logs: true,
      log_file: "/var/log/filmflex/app.log",
      error_file: "/var/log/filmflex/error.log",
      out_file: "/var/log/filmflex/out.log",
      time: true,
      max_memory_restart: "1G",
      autorestart: true
    }
  ]
};