#!/usr/bin/env node

// Production startup script for Christopher's Massage Therapy website
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Christopher\'s Massage Therapy Production System...\n');

class ProductionManager {
    constructor() {
        this.processes = [];
        this.serverPath = path.join(__dirname, 'server');
    }

    async checkEnvironment() {
        console.log('🔍 Checking production environment...');
        
        // Check if server directory exists
        if (!fs.existsSync(this.serverPath)) {
            throw new Error('Server directory not found. Run npm install first.');
        }

        // Check if .env file exists
        const envPath = path.join(this.serverPath, '.env');
        if (!fs.existsSync(envPath)) {
            console.log('⚠️  No .env file found. Creating from template...');
            const examplePath = path.join(this.serverPath, '.env.example');
            if (fs.existsSync(examplePath)) {
                fs.copyFileSync(examplePath, envPath);
                console.log('📝 Please edit server/.env with your production values');
            }
        }

        // Check if database exists
        const dbPath = path.join(this.serverPath, 'dev-database.sqlite');
        if (!fs.existsSync(dbPath)) {
            console.log('🗄️  Database not found. Initializing...');
            await this.runCommand('npm', ['run', 'setup'], this.serverPath);
        }

        console.log('✅ Environment check completed\n');
    }

    async installDependencies() {
        console.log('📦 Installing server dependencies...');
        await this.runCommand('npm', ['install'], this.serverPath);
        console.log('✅ Dependencies installed\n');
    }

    async runCommand(command, args, cwd = process.cwd()) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd,
                stdio: 'inherit',
                shell: true
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });

            child.on('error', reject);
        });
    }

    async startServer() {
        console.log('🌐 Starting production server...');
        
        const serverProcess = spawn('node', ['server.js'], {
            cwd: this.serverPath,
            stdio: 'inherit',
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'production'
            }
        });

        serverProcess.on('error', (error) => {
            console.error('❌ Server failed to start:', error);
            process.exit(1);
        });

        serverProcess.on('close', (code) => {
            console.log(`🔄 Server process exited with code ${code}`);
            if (code !== 0) {
                console.log('🔄 Restarting server...');
                setTimeout(() => this.startServer(), 5000);
            }
        });

        this.processes.push(serverProcess);

        console.log('✅ Server started successfully!');
        console.log('🌐 API available at: http://localhost:3050/api');
        console.log('📊 Health check: http://localhost:3050/health');
        console.log('💻 Admin panel: http://localhost:3050/admin.html');
        console.log('\n📝 Press Ctrl+C to stop all processes\n');
    }

    async startDevelopmentServer() {
        console.log('🔧 Starting development server...');
        
        const devProcess = spawn('npm', ['run', 'dev'], {
            cwd: this.serverPath,
            stdio: 'inherit',
            shell: true
        });

        devProcess.on('error', (error) => {
            console.error('❌ Development server failed to start:', error);
            process.exit(1);
        });

        this.processes.push(devProcess);
        console.log('✅ Development server started with auto-reload\n');
    }

    setupGracefulShutdown() {
        const shutdown = () => {
            console.log('\n🛑 Shutting down gracefully...');
            
            this.processes.forEach((process, index) => {
                console.log(`🔄 Stopping process ${index + 1}...`);
                process.kill('SIGTERM');
            });

            setTimeout(() => {
                console.log('👋 Goodbye!');
                process.exit(0);
            }, 2000);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    async start() {
        try {
            this.setupGracefulShutdown();
            
            await this.checkEnvironment();
            await this.installDependencies();
            
            const isDevelopment = process.argv.includes('--dev');
            
            if (isDevelopment) {
                await this.startDevelopmentServer();
            } else {
                await this.startServer();
            }

        } catch (error) {
            console.error('❌ Startup failed:', error.message);
            process.exit(1);
        }
    }
}

// Start the production system
const manager = new ProductionManager();

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node start-production.js [options]

Options:
  --dev         Start in development mode with auto-reload
  --help, -h    Show this help message

Examples:
  node start-production.js        # Start production server
  node start-production.js --dev  # Start development server

Environment:
  The server will use the .env file in the server directory.
  Copy server/.env.example to server/.env and configure as needed.

Production Setup:
  1. Configure server/.env with your production values
  2. Set up SSL certificates (see PRODUCTION-DEPLOYMENT.md)
  3. Configure reverse proxy (Nginx recommended)
  4. Set up process manager (PM2 recommended for production)

For detailed deployment instructions, see PRODUCTION-DEPLOYMENT.md
    `);
    process.exit(0);
}

manager.start();