module.exports = {
  apps: [
    {
      name: "opencpr-backend",
      cwd: process.env.APP_CWD,
      script: "dist/index.js",
      node_args: "--enable-source-maps",
      exec_mode: "cluster",
      instances: "max",
      watch: false,
      max_memory_restart: "512M",
      kill_timeout: 10000,
      autorestart: true,
      merge_logs: true,
      time: true,
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
