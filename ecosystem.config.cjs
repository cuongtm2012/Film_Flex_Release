module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "./dist/index.js",
      cwd: "/var/www/filmflex",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      
      // Default environment variables
      env: {
        NODE_ENV: "development",
        PORT: 5000,
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex",
        SESSION_SECRET: "filmflex_dev_secret_2024",
        ALLOWED_ORIGINS: "*"
      },
      
      // Production environment variables
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex",
        SESSION_SECRET: "filmflex_dev_secret_2024",
        ALLOWED_ORIGINS: "*",
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: ""
      },      
      // Logging configuration (use local paths)
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      merge_logs: true,
      
      // Memory and restart configuration
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      
      // Additional options
      autorestart: true,
      time: true
    }
  ]
};