module.exports = {
  apps: [{
    name: 'chooncme-fan-letter',
    cwd: '/Users/chooncme/Desktop/chooncme-fan-letter',
    script: 'node_modules/.bin/next',
    args: 'dev',
    interpreter: 'none',
    watch: false,
    autorestart: true,
    max_memory_restart: '500M',
  }]
};
