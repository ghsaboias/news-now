module.exports = {
  apps: [
    {
      name: 'news-now',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      exp_backoff_restart_delay: 1000,
      max_restarts: 5,
      // error_file: 'logs/err.log',
      // out_file: 'logs/out.log',
      // merge_logs: true,
      time: true
    }
  ]
} 