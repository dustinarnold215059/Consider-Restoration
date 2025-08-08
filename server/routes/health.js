const express = require('express');
const { sequelize } = require('../models');
const router = express.Router();

// Basic health check endpoint
router.get('/', async (req, res) => {
    try {
        // Check database connection
        await sequelize.authenticate();
        
        const healthCheck = {
            uptime: process.uptime(),
            message: 'OK',
            timestamp: Date.now(),
            status: 'healthy',
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: 'connected',
                server: 'running'
            }
        };

        res.status(200).json(healthCheck);
    } catch (error) {
        const errorResponse = {
            uptime: process.uptime(),
            message: 'Service Unavailable',
            timestamp: Date.now(),
            status: 'unhealthy',
            error: error.message,
            services: {
                database: 'disconnected',
                server: 'running'
            }
        };

        res.status(503).json(errorResponse);
    }
});

// Detailed health check for monitoring systems
router.get('/detailed', async (req, res) => {
    try {
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            system: {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    external: Math.round(process.memoryUsage().external / 1024 / 1024),
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
                },
                cpu: {
                    loadAverage: process.loadaverage?.() || [],
                    usage: process.cpuUsage()
                }
            },
            services: {}
        };

        // Test database connection
        try {
            await sequelize.authenticate();
            const dbStats = await sequelize.query('SELECT version() as version;');
            healthData.services.database = {
                status: 'connected',
                version: dbStats[0][0]?.version || 'unknown',
                connectionPool: {
                    max: sequelize.options.pool.max,
                    min: sequelize.options.pool.min,
                    idle: sequelize.options.pool.idle,
                    acquire: sequelize.options.pool.acquire
                }
            };
        } catch (dbError) {
            healthData.services.database = {
                status: 'disconnected',
                error: dbError.message
            };
            healthData.status = 'degraded';
        }

        // Test external services
        if (process.env.STRIPE_SECRET_KEY) {
            healthData.services.stripe = {
                status: 'configured',
                environment: process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'live' : 'test'
            };
        }

        if (process.env.SENDGRID_API_KEY || process.env.EMAIL_USER) {
            healthData.services.email = {
                status: 'configured',
                provider: process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp'
            };
        }

        const statusCode = healthData.status === 'healthy' ? 200 : 
                          healthData.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(healthData);

    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            uptime: process.uptime()
        });
    }
});

// Database connectivity check
router.get('/db', async (req, res) => {
    try {
        const startTime = Date.now();
        await sequelize.authenticate();
        const responseTime = Date.now() - startTime;

        // Test a simple query
        const testQuery = await sequelize.query('SELECT 1 as test');
        
        res.json({
            status: 'connected',
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
            testQuery: testQuery[0][0]?.test === 1 ? 'passed' : 'failed'
        });

    } catch (error) {
        res.status(503).json({
            status: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Service dependencies check
router.get('/dependencies', async (req, res) => {
    const dependencies = {};

    // Check database
    try {
        await sequelize.authenticate();
        dependencies.database = { status: 'ok', responseTime: '< 100ms' };
    } catch (error) {
        dependencies.database = { status: 'error', error: error.message };
    }

    // Check required environment variables
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'STRIPE_SECRET_KEY',
        'FRONTEND_URL'
    ];

    dependencies.environment = {};
    requiredEnvVars.forEach(envVar => {
        dependencies.environment[envVar] = process.env[envVar] ? 'configured' : 'missing';
    });

    // Check file system permissions
    try {
        const fs = require('fs');
        const testFile = '/tmp/health-check-test';
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        dependencies.filesystem = { status: 'ok', permissions: 'read/write' };
    } catch (error) {
        dependencies.filesystem = { status: 'error', error: error.message };
    }

    const overallStatus = Object.values(dependencies).every(dep => 
        dep.status === 'ok' || (dep.status !== 'error' && !Object.values(dep).includes('missing'))
    ) ? 'healthy' : 'unhealthy';

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        dependencies
    });
});

// Performance metrics endpoint
router.get('/metrics', async (req, res) => {
    try {
        const metrics = {
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: Math.floor(process.uptime()),
                human: formatUptime(process.uptime())
            },
            memory: {
                heapUsed: formatBytes(process.memoryUsage().heapUsed),
                heapTotal: formatBytes(process.memoryUsage().heapTotal),
                external: formatBytes(process.memoryUsage().external),
                rss: formatBytes(process.memoryUsage().rss)
            },
            cpu: process.cpuUsage(),
            eventLoop: {
                delay: await getEventLoopDelay()
            },
            process: {
                pid: process.pid,
                version: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };

        // Add database metrics if available
        try {
            const dbMetrics = await sequelize.query(`
                SELECT 
                    count(*) as total_connections,
                    sum(case when state = 'active' then 1 else 0 end) as active_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            `);
            
            metrics.database = {
                connections: dbMetrics[0][0] || { total_connections: 0, active_connections: 0 }
            };
        } catch (error) {
            metrics.database = { error: 'Unable to fetch database metrics' };
        }

        res.json(metrics);

    } catch (error) {
        res.status(500).json({
            error: 'Failed to collect metrics',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Readiness probe (for Kubernetes/container orchestration)
router.get('/ready', async (req, res) => {
    try {
        // Check if all required services are ready
        await sequelize.authenticate();
        
        // Check if required environment variables are set
        const required = ['DATABASE_URL', 'JWT_SECRET'];
        const missing = required.filter(env => !process.env[env]);
        
        if (missing.length > 0) {
            return res.status(503).json({
                status: 'not ready',
                missing_config: missing,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });

    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Liveness probe (for Kubernetes/container orchestration)
router.get('/live', (req, res) => {
    // Simple liveness check - if the server can respond, it's alive
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Helper functions
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function getEventLoopDelay() {
    return new Promise((resolve) => {
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const delta = process.hrtime.bigint() - start;
            resolve(Number(delta / 1000000n)); // Convert to milliseconds
        });
    });
}

module.exports = router;