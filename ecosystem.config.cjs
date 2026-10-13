/**
 * SportsPulse — PM2 Production Process Manager Configuration
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'sportspulse',
      script: './dist/server.cjs',
      cwd: __dirname,
      instances: 1, // Single instance required to ensure LowDB JSON database consistency
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        STORAGE_PATH: 'uploads',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        STORAGE_PATH: 'uploads',
      },
      error_file: './data/logs/pm2-error.log',
      out_file: './data/logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
