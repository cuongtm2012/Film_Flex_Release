module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "./dist/index.js",
      cwd: "/var/www/filmflex",
      instances: 1,
      exec_mode: "fork",

      // Environment variables
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        HOST: "0.0.0.0",
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex",
        SESSION_SECRET: "filmflex_dev_secret_2024",
        ALLOWED_ORIGINS: "*"
      },      // Production environment specific variables
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        HOST: "0.0.0.0",
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex",
        SESSION_SECRET: "filmflex_dev_secret_2024",
        ALLOWED_ORIGINS: "*",
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: ""
      },

      // Memory and restart configuration
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,

      // Logging configuration
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,      // Monitoring
      pmx: false,
      monitoring: false,

      // Auto restart on file changes (disabled in production)
      watch: false,

      // Advanced process management
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,

      // Node.js arguments
      node_args: [
        "--max-old-space-size=512"
      ],

      // Automation options
      autorestart: true,
      vizion: false,

      // Additional options for production
      combine_logs: true,
      time: true
    }  ]
};