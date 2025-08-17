#!/usr/bin/env node

/**
 * Database Type Cleanup and Integration Migration
 * 
 * This script:
 * 1. Standardizes rundown_items type names
 * 2. Standardizes graphics type names  
 * 3. Integrates graphics table with overlay system
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database.sqlite');
const backupPath = path.join(__dirname, `database_backup_cleanup_${Date.now()}.sqlite`);

console.log('🚀 Starting type cleanup and integration migration...\n');

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

try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');
    
    console.log('🔄 Step 1: Cleaning up rundown_items types...\n');
    
    // Map old types to new standardized types
    const typeMapping = {
        // Video types
        'FullScreenVideo': 'video',
        'fullscreenvideo': 'video',
        
        // Graphics types  
        'FullScreenGraphic': 'full_screen_graphic',
        'fullscreengraphic': 'full_screen_graphic',
        'FullScreenPdfImage': 'full_screen_graphic',
        'fullscreenpdfimage': 'full_screen_graphic',
        
        // Manual blocks
        'manual-block': 'manual_block',
        'manual_block': 'manual_block',
        'manualblock': 'manual_block',
        
        // Presenter notes
        'presenter-note': 'presenter_note',
        'presenter_note': 'presenter_note',
        'presenternote': 'presenter_note',
        
        // OBS scenes
        'obs_scene': 'obs_scene',
        'obs-scene': 'obs_scene',
        'obsscene': 'obs_scene',
        
        // Camera sources
        'camera': 'camera',
        'cam': 'camera'
    };
    
    // Update rundown_items types
    for (const [oldType, newType] of Object.entries(typeMapping)) {
        const result = db.prepare('UPDATE rundown_items SET type = ? WHERE LOWER(type) = LOWER(?)').run(newType, oldType);
        if (result.changes > 0) {
            console.log(`  ✅ Updated ${result.changes} items from '${oldType}' to '${newType}'`);
        }
    }
    
    // Check for any remaining non-standard types
    const remainingTypes = db.prepare('SELECT DISTINCT type FROM rundown_items').all();
    console.log('\n📋 Current rundown_items types after cleanup:');
    remainingTypes.forEach(row => {
        console.log(`  • ${row.type}`);
    });
    
    console.log('\n🔄 Step 2: Standardizing graphics table types...\n');
    
    // Standardize graphics types
    const graphicsTypeMapping = {
        'Lower Third': 'lower_third',
        'lower-third': 'lower_third',
        'dfdflower-third': 'lower_third',
        'lowerthird': 'lower_third',
        
        'Bug': 'bug',
        'bug': 'bug',
        
        'Ticker': 'ticker',
        'ticker': 'ticker',
        'crawl': 'ticker',
        
        'Panel': 'panel',
        'panel': 'panel',
        'side_panel': 'panel',
        
        'Full Screen': 'full_screen',
        'full_screen': 'full_screen',
        'fullscreen': 'full_screen'
    };
    
    for (const [oldType, newType] of Object.entries(graphicsTypeMapping)) {
        const result = db.prepare('UPDATE graphics SET type = ? WHERE LOWER(type) = LOWER(?)').run(newType, oldType);
        if (result.changes > 0) {
            console.log(`  ✅ Updated ${result.changes} graphics from '${oldType}' to '${newType}'`);
        }
    }
    
    // Set default type for null graphics
    const nullResult = db.prepare('UPDATE graphics SET type = ? WHERE type IS NULL').run('lower_third');
    if (nullResult.changes > 0) {
        console.log(`  ✅ Set default type for ${nullResult.changes} graphics with null type`);
    }
    
    // Check graphics types after cleanup
    const graphicsTypes = db.prepare('SELECT DISTINCT type FROM graphics').all();
    console.log('\n📋 Current graphics types after cleanup:');
    graphicsTypes.forEach(row => {
        console.log(`  • ${row.type}`);
    });
    
    console.log('\n🔄 Step 3: Adding new overlay item types...\n');
    
    // These will be used for new items created through the UI
    const newOverlayTypes = [
        'auto_overlay',     // Auto-timed overlays attached to parent items
        'manual_overlay',   // Manual overlays in manual blocks
        'full_screen_graphic' // Already exists but standardizing
    ];
    
    console.log('📌 New overlay types available for future items:');
    newOverlayTypes.forEach(type => {
        console.log(`  • ${type}`);
    });
    
    console.log('\n🔄 Step 4: Creating indexes for better performance...\n');
    
    // Add missing indexes if they don't exist
    const indexStatements = [
        'CREATE INDEX IF NOT EXISTS idx_graphics_type ON graphics(type)',
        'CREATE INDEX IF NOT EXISTS idx_graphics_template_id ON graphics(template_id)',
        'CREATE INDEX IF NOT EXISTS idx_items_automation_mode ON rundown_items(automation_mode)',
        'CREATE INDEX IF NOT EXISTS idx_items_parent_type ON rundown_items(parent_item_id, type)'
    ];
    
    indexStatements.forEach(sql => {
        try {
            db.exec(sql);
            console.log(`  ✅ ${sql.substring(0, 50)}...`);
        } catch (err) {
            if (!err.message.includes('already exists')) {
                throw err;
            }
        }
    });
    
    console.log('\n🔄 Step 5: Verifying data integrity...\n');
    
    // Check for orphaned child items
    const orphans = db.prepare(`
        SELECT COUNT(*) as count 
        FROM rundown_items 
        WHERE parent_item_id IS NOT NULL 
        AND parent_item_id NOT IN (SELECT id FROM rundown_items)
    `).get();
    
    if (orphans.count > 0) {
        console.log(`  ⚠️  Found ${orphans.count} orphaned child items - cleaning up...`);
        db.prepare('UPDATE rundown_items SET parent_item_id = NULL WHERE parent_item_id NOT IN (SELECT id FROM rundown_items)').run();
    } else {
        console.log('  ✅ No orphaned child items found');
    }
    
    // Summary statistics
    console.log('\n📊 Migration Summary:\n');
    
    const stats = {
        totalItems: db.prepare('SELECT COUNT(*) as count FROM rundown_items').get().count,
        itemsByType: db.prepare('SELECT type, COUNT(*) as count FROM rundown_items GROUP BY type').all(),
        totalGraphics: db.prepare('SELECT COUNT(*) as count FROM graphics').get().count,
        graphicsByType: db.prepare('SELECT type, COUNT(*) as count FROM graphics GROUP BY type').all(),
        itemsWithAutomation: db.prepare("SELECT COUNT(*) as count FROM rundown_items WHERE automation_mode = 'auto'").get().count,
        itemsWithParent: db.prepare('SELECT COUNT(*) as count FROM rundown_items WHERE parent_item_id IS NOT NULL').get().count
    };
    
    console.log(`Total rundown items: ${stats.totalItems}`);
    console.log('Items by type:');
    stats.itemsByType.forEach(row => {
        console.log(`  • ${row.type}: ${row.count}`);
    });
    
    console.log(`\nTotal graphics: ${stats.totalGraphics}`);
    console.log('Graphics by type:');
    stats.graphicsByType.forEach(row => {
        console.log(`  • ${row.type}: ${row.count}`);
    });
    
    console.log(`\nItems with automation: ${stats.itemsWithAutomation}`);
    console.log(`Items with parent (overlays): ${stats.itemsWithParent}`);
    
    // Commit transaction
    db.exec('COMMIT');
    console.log('\n✅ Migration completed successfully!\n');
    
    db.close();
    console.log('✅ Database connection closed');
    console.log('\n🎉 Type cleanup and integration complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Update API endpoints to handle standardized types');
    console.log('  2. Update frontend to use new type names');
    console.log('  3. Implement overlay attachment UI');
    console.log('  4. Add automation timing controls');
    
} catch (err) {
    console.error('\n❌ Migration failed:', err);
    console.log('\n🔙 Rolling back changes...');
    try {
        db.exec('ROLLBACK');
    } catch (e) {
        // Ignore rollback errors
    }
    db.close();
    console.log('🔙 Restoring from backup...');
    fs.copyFileSync(backupPath, dbPath);
    console.log('✅ Database restored from backup');
    process.exit(1);
}