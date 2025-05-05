module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "./server/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      merge_logs: true,
      log_file: "/var/log/filmflex.log",
      error_file: "/var/log/filmflex-error.log",
      out_file: "/var/log/filmflex-out.log",
      time: true,
      max_memory_restart: "1G",
      autorestart: true,
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000
    }
  ]
};