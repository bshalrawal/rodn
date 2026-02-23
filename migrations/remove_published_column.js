/**
 * CRITICAL: Remove deprecated 'published' column from articles table
 * This column should not exist - we use 'status' and 'published_at' instead
 * 
 * Run with: node migrations/remove_published_column.js
 */

const database = require('../server/config/database');
const logger = require('../server/utils/logger');

async function migrate() {
    try {
        logger.info('Checking for deprecated "published" column in articles table...');
        
        await database.initialize();
        logger.info('✓ Database connected');

        // Get all columns from articles table
        const tableInfo = await database.all('PRAGMA table_info(articles)');
        const columns = tableInfo.map(col => ({
            name: col.name,
            type: col.type
        }));

        logger.info('Current articles table columns:');
        columns.forEach(col => logger.info(`  - ${col.name} (${col.type})`));

        // Check if 'published' column exists
        const hasPublishedColumn = columns.some(c => c.name === 'published');
        
        if (!hasPublishedColumn) {
            logger.info('✓ No deprecated "published" column found - database schema is correct');
            process.exit(0);
        }

        logger.warn('⚠ CRITICAL: Found deprecated "published" column - removing it...');
        
        // Get the columns we want to keep (everything except 'published')
        const keepColumns = columns
            .filter(c => c.name !== 'published')
            .map(c => c.name)
            .join(', ');

        logger.info('Recreating articles table without "published" column...');
        logger.info('This may take a moment...');
        
        // Start transaction
        await database.run('BEGIN TRANSACTION');
        
        try {
            // Create backup of data without the published column
            logger.info('Creating temporary table...');
            await database.run(`
                CREATE TABLE articles_fixed AS
                SELECT ${keepColumns} FROM articles
            `);
            
            // Drop old table
            logger.info('Dropping old articles table...');
            await database.run('DROP TABLE articles');
            
            // Rename new table
            logger.info('Renaming new table to articles...');
            await database.run('ALTER TABLE articles_fixed RENAME TO articles');
            
            // Recreate indices for performance
            logger.info('Recreating indices...');
            await database.run('CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)');
            await database.run('CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at)');
            await database.run('CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id)');
            await database.run('CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id)');
            await database.run('CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)');
            
            await database.run('COMMIT');
            logger.info('✓ Transaction committed successfully');
            
        } catch (txError) {
            logger.error('Transaction error, rolling back...');
            try {
                await database.run('ROLLBACK');
            } catch (rollbackError) {
                logger.error('Rollback error:', rollbackError.message);
            }
            throw txError;
        }

        // Verify the fix
        logger.info('Verifying schema fix...');
        const finalTableInfo = await database.all('PRAGMA table_info(articles)');
        const finalColumns = finalTableInfo.map(col => col.name);
        
        logger.info('Final articles table columns:');
        finalColumns.forEach(col => logger.info(`  - ${col}`));

        if (!finalColumns.includes('published')) {
            logger.info('✓✓✓ SUCCESS: Deprecated "published" column has been removed!');
            logger.info('✓ Articles table schema is now correct');
            logger.info('✓ Restart the server to apply the fix');
        } else {
            logger.error('✗ FAILED: "published" column still exists after migration');
            process.exit(1);
        }
        
        process.exit(0);
        
    } catch (error) {
        logger.error('Migration error:', error.message);
        logger.error('Full error:', error);
        process.exit(1);
    }
}

// Run migration
if (require.main === module) {
    migrate().catch(err => {
        logger.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { migrate };
