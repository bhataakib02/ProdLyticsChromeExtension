const { spawn } = require('child_process');
const path = require('path');

const services = [
    { name: 'auth', dir: 'backend-services/auth-service', cmd: 'npm', args: ['start'] },
    { name: 'track', dir: 'backend-services/tracking-service', cmd: 'npm', args: ['start'] },
    { name: 'real', dir: 'backend-services/realtime-service', cmd: 'npm', args: ['start'] },
    { name: 'gate', dir: 'backend-services/api-gateway', cmd: 'npm', args: ['start'] },
    { name: 'dash', dir: 'dashboard', cmd: 'npm', args: ['run', 'dev'] }
];

const colors = {
    auth: '\x1b[34m', // blue
    track: '\x1b[32m', // green
    real: '\x1b[35m', // magenta
    gate: '\x1b[36m', // cyan
    dash: '\x1b[33m', // yellow
    reset: '\x1b[0m'
};

console.log('🚀 Starting AERO Microservices + Dashboard in integrated mode...');

services.forEach(service => {
    const proc = spawn(service.cmd, service.args, {
        cwd: path.resolve(__dirname, service.dir),
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe']
    });

    const prefix = `${colors[service.name]}[${service.name}]${colors.reset} `;

    proc.stdout.on('data', (data) => {
        data.toString().split('\n').forEach(line => {
            if (line.trim()) console.log(prefix + line);
        });
    });

    proc.stderr.on('data', (data) => {
        data.toString().split('\n').forEach(line => {
            if (line.trim()) console.error(prefix + line);
        });
    });

    proc.on('close', (code) => {
        console.log(`${prefix} exited with code ${code}`);
    });
});

process.on('SIGINT', () => {
    console.log('Shutting down all services...');
    process.exit();
});
