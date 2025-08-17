#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database.sqlite');
const backupPath = path.join(__dirname, `database_backup_${Date.now()}.sqlite`);
const migrationPath = path.join(__dirname, 'migrate_v2.sql');

console.log('🚀 Starting database migration for automation and graphics support...\n');

// Create backup
console.log(`📦 Creating backup at: ${backupPath}`);
fs.copyFileSync(dbPath, backupPath);
console.log('✅ Backup created successfully\n');

// Connect to database
let db;
try {
    db = new Database(dbPath);
    console.log('✅ Connected to database\n');
} catch (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
}

// Read migration SQL
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split SQL into individual statements (better-sqlite3 doesn't handle multiple statements well)
const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

// Run migration
console.log('🔄 Running migration...\n');

try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');
    
    // Execute each statement
    for (const statement of statements) {
        try {
            db.exec(statement + ';');
            console.log('  ✅ Executed: ' + statement.substring(0, 50) + '...');
        } catch (err) {
            // Ignore errors for "IF NOT EXISTS" statements that already exist
            if (!err.message.includes('already exists')) {
                throw err;
            }
            console.log('  ⏭️  Skipped (already exists): ' + statement.substring(0, 50) + '...');
        }
    }
    
    // Commit transaction
    db.exec('COMMIT');
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify migration
    console.log('🔍 Verifying migration...\n');
    
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'rundown_items'").get();
    if (row) {
        console.log('📋 rundown_items table structure:');
        console.log(row.sql);
        console.log('\n✅ Migration verified successfully!');
        console.log('\n📌 New features added:');
        console.log('  • Automation timing (manual/auto modes with duration)');
        console.log('  • Graphics overlay support (auto/manual/full-screen)');
        console.log('  • Parent-child relationships for overlays');
        console.log('  • Execution state tracking');
        console.log('  • Graphics templates table');
    }
    
    db.close();
    console.log('\n✅ Database connection closed');
    console.log('\n🎉 Migration complete! Your database is ready for the new features.');
    
} catch (err) {
    console.error('❌ Migration failed:', err);
    console.log('\n🔙 Restoring from backup...');
    try {
        db.exec('ROLLBACK');
    } catch (e) {
        // Ignore rollback errors
    }
    db.close();
    fs.copyFileSync(backupPath, dbPath);
    console.log('✅ Database restored from backup');
    process.exit(1);
}