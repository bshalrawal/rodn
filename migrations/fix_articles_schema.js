/**
 * Migration script to fix articles table schema
 * This ensures the articles table uses 'status' and 'published_at' columns correctly
 * Run with: node migrations/fix_articles_schema.js
 */

const database = require('../server/config/database');
const logger = require('../server/utils/logger');

async function migrate() {
    try {
        logger.info('Starting articles schema fix migration...');
        
        // Get all columns from articles table
        const tableInfo = await database.all('PRAGMA table_info(articles)');
        const columns = tableInfo.map(col => ({
            name: col.name,
            type: col.type
        }));

        logger.info('Current articles table columns:', columns.map(c => c.name));

        // Check if 'published' column exists
        const hasPublishedColumn = columns.some(c => c.name === 'published');
        
        if (hasPublishedColumn) {
            logger.warn('⚠ Found deprecated "published" column - attempting to remove...');
            
            // For SQLite, we need to recreate the table without the column
            try {
                // Get all needed columns for recreation
                const keepColumns = columns
                    .filter(c => c.name !== 'published')
                    .map(c => c.name)
                    .join(', ');

                logger.info('Recreating articles table without "published" column...');
                
                // Start transaction
                await database.run('BEGIN TRANSACTION');
                
                try {
                    // Create temporary table with correct schema
                    await database.run(`
                        CREATE TABLE articles_fixed AS
                        SELECT ${keepColumns} FROM articles
                    `);
                    
                    // Drop old table
                    await database.run('DROP TABLE articles');
                    
                    // Rename new table
                    await database.run('ALTER TABLE articles_fixed RENAME TO articles');
                    
                    // Recreate indices if needed
                    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)');
                    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id)');
                    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)');
                    
                    await database.run('COMMIT');
                    logger.info('✓ Successfully removed "published" column');
                    
                } catch (txError) {
                    await database.run('ROLLBACK');
                    throw txError;
                }
                
            } catch (error) {
                logger.error('Error recreating table:', error);
                throw error;
            }
        } else {
            logger.info('✓ No "published" column found - schema appears correct');
        }

        // Verify fix
        const finalTableInfo = await database.all('PRAGMA table_info(articles)');
        const finalColumns = finalTableInfo.map(col => col.name);
        
        if (!finalColumns.includes('published')) {
            logger.info('✓ Schema verification passed - no "published" column');
        }

        logger.info('✓ Migration completed successfully');
        
    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    }
}

// Run migration
if (require.main === module) {
    (async () => {
        try {
            await database.initialize();
            await migrate();
            logger.info('✓ All fixes applied successfully');
            process.exit(0);
        } catch (error) {
            logger.error('Fatal error:', error);
            process.exit(1);
        }
    })();
}

module.exports = { migrate };
