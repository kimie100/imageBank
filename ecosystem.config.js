// ecosystem.config.js
module.exports = {
  apps: [{
    name: "image",
    script: "npm",  // Use npm as the script
    args: "start",  // Pass 'start' as an argument to npm
    instances: "max",   // Match your 2 vCPUs
    exec_mode: "cluster",
    autorestart: true,
    max_memory_restart: "2G",
    env: {
      NODE_ENV: "production",
      NODE_OPTIONS: "--max-old-space-size=2048"
    }
  }]
}