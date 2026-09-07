module.exports = {
  apps: [{
    name: 'meetingautomator-admin',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/meetingautomator-admin',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 3010 },
    error_file: '/var/log/meetingautomator-admin.err.log',
    out_file: '/var/log/meetingautomator-admin.out.log',
    time: true,
  }],
};
