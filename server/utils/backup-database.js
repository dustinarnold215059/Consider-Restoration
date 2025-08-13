const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { sequelize } = require('../models');

class DatabaseBackup {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.maxBackups = 10; // Keep last 10 backups
    }

    async ensureBackupDir() {
        try {
            await fs.access(this.backupDir);
        } catch {
            await fs.mkdir(this.backupDir, { recursive: true });
        }
    }

    async createBackup() {
        try {
            await this.ensureBackupDir();
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`);
            
            console.log('🔄 Creating database backup...');
            
            // For SQLite, we can copy the database file
            const dbPath = process.env.DATABASE_URL || './dev-database.sqlite';
            const dbBackupPath = path.join(this.backupDir, `backup-${timestamp}.sqlite`);
            
            // Copy SQLite file
            await fs.copyFile(dbPath, dbBackupPath);
            
            // Also create SQL dump for portability
            await this.createSQLDump(backupFile);
            
            console.log(`✅ Backup created: ${backupFile}`);
            
            // Clean old backups
            await this.cleanOldBackups();
            
            return {
                success: true,
                file: backupFile,
                sqliteFile: dbBackupPath,
                timestamp
            };
            
        } catch (error) {
            console.error('❌ Backup failed:', error);
            throw error;
        }
    }

    async createSQLDump(backupFile) {
        try {
            // Get all table data and create SQL dump
            const tables = ['Users', 'Appointments', 'Services', 'Payments', 'GiftCertificates', 'ContactMessages'];
            let sqlDump = '-- Database Backup\n';
            sqlDump += `-- Generated: ${new Date().toISOString()}\n\n`;
            
            for (const table of tables) {
                try {
                    const [results] = await sequelize.query(`SELECT * FROM ${table}`);
                    
                    if (results.length > 0) {
                        sqlDump += `-- Table: ${table}\n`;
                        sqlDump += `DELETE FROM ${table};\n`;
                        
                        // Get column names
                        const columns = Object.keys(results[0]);
                        
                        for (const row of results) {
                            const values = columns.map(col => {
                                const value = row[col];
                                if (value === null) return 'NULL';
                                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                                if (typeof value === 'boolean') return value ? '1' : '0';
                                return value;
                            }).join(', ');
                            
                            sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`;
                        }
                        sqlDump += '\n';
                    }
                } catch (tableError) {
                    console.warn(`Warning: Could not backup table ${table}:`, tableError.message);
                }
            }
            
            await fs.writeFile(backupFile, sqlDump, 'utf8');
            
        } catch (error) {
            console.error('SQL dump creation failed:', error);
            throw error;
        }
    }

    async restoreBackup(backupFile) {
        try {
            console.log('🔄 Restoring database backup...');
            
            // Read SQL backup
            const sqlContent = await fs.readFile(backupFile, 'utf8');
            
            // Split into individual statements
            const statements = sqlContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('--'));
            
            // Execute each statement
            for (const statement of statements) {
                if (statement) {
                    await sequelize.query(statement);
                }
            }
            
            console.log('✅ Database restored successfully');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Restore failed:', error);
            throw error;
        }
    }

    async cleanOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter(f => f.startsWith('backup-') && (f.endsWith('.sql') || f.endsWith('.sqlite')))
                .map(f => ({
                    name: f,
                    path: path.join(this.backupDir, f),
                    time: fs.stat(path.join(this.backupDir, f)).then(stats => stats.mtime)
                }));

            // Sort by modification time (newest first)
            const sortedFiles = await Promise.all(
                backupFiles.map(async (file) => ({
                    ...file,
                    time: await file.time
                }))
            );
            
            sortedFiles.sort((a, b) => b.time - a.time);

            // Remove excess backups
            if (sortedFiles.length > this.maxBackups * 2) { // SQL + SQLite files
                const toDelete = sortedFiles.slice(this.maxBackups * 2);
                
                for (const file of toDelete) {
                    await fs.unlink(file.path);
                    console.log(`🗑️ Removed old backup: ${file.name}`);
                }
            }
            
        } catch (error) {
            console.warn('Warning: Could not clean old backups:', error);
        }
    }

    async listBackups() {
        try {
            await this.ensureBackupDir();
            
            const files = await fs.readdir(this.backupDir);
            const backupFiles = await Promise.all(
                files
                    .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
                    .map(async (f) => {
                        const filePath = path.join(this.backupDir, f);
                        const stats = await fs.stat(filePath);
                        return {
                            name: f,
                            path: filePath,
                            size: stats.size,
                            created: stats.mtime,
                            readable: this.formatFileSize(stats.size)
                        };
                    })
            );

            // Sort by creation time (newest first)
            backupFiles.sort((a, b) => b.created - a.created);

            return backupFiles;
            
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Automated backup scheduling
    async scheduleBackups() {
        const cron = require('node-cron');
        
        // Daily backup at 2 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                console.log('🕐 Running scheduled backup...');
                await this.createBackup();
            } catch (error) {
                console.error('❌ Scheduled backup failed:', error);
            }
        });
        
        console.log('⏰ Daily backup scheduled for 2:00 AM');
    }
}

// CLI interface
if (require.main === module) {
    const backup = new DatabaseBackup();
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
            backup.createBackup()
                .then(result => {
                    console.log('✅ Backup completed:', result);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Backup failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'restore':
            const backupFile = process.argv[3];
            if (!backupFile) {
                console.error('❌ Please provide backup file path');
                process.exit(1);
            }
            
            backup.restoreBackup(backupFile)
                .then(() => {
                    console.log('✅ Restore completed');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Restore failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'list':
            backup.listBackups()
                .then(backups => {
                    console.log('\n📋 Available Backups:');
                    backups.forEach(b => {
                        console.log(`  ${b.name} - ${b.readable} (${b.created.toLocaleString()})`);
                    });
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Failed to list backups:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log(`
Usage: node backup-database.js <command>

Commands:
  create          Create a new backup
  restore <file>  Restore from backup file
  list           List available backups

Examples:
  node backup-database.js create
  node backup-database.js restore ./backups/backup-2024-01-15.sql
  node backup-database.js list
            `);
    }
}

module.exports = DatabaseBackup;