module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "./dist/index.js",
      cwd: process.cwd(),
      instances: "max",
      exec_mode: "cluster",

      // Environment variables
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        HOST: "0.0.0.0"
      },

      // Production environment specific variables
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        HOST: "0.0.0.0"
      },

      // Memory and restart configuration
      max_memory_restart: "500M",
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,      // Logging configuration
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Monitoring
      pmx: true,
      monitoring: true,

      // Auto restart on file changes (disabled in production)
      watch: false,
      ignore_watch: ["node_modules", "logs", "*.log"],

      // Advanced process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Health check
      health_check_grace_period: 3000,

      // Source map support
      source_map_support: true,

      // Increment variable for rolling restarts
      increment_var: "PORT",

      // Custom startup script args
      args: [],

      // Node.js arguments
      node_args: [
        "--max-old-space-size=512",
        "--enable-source-maps"
      ],

      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: "0 3 * * *",

      // Process title
      name: "filmflex-server",

      // User and group (security)
      uid: "filmflex",
      gid: "filmflex",

      // Automation options
      autorestart: true,
      vizion: false,

      // Additional options for production
      combine_logs: true,
      time: true
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: "filmflex",
      host: ["38.54.115.156"],
      ref: "origin/main",
      repo: "git@github.com:cuongtm2012/Film_Flex_Release.git",
      path: "/var/www/filmflex",
      "pre-deploy-local": "",
      "post-deploy": "npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production",
      "pre-setup": ""
    }
  }
};