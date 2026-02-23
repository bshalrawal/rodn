const database = require('./server/config/database');
const logger = require('./server/utils/logger');

/**
 * Fix database schema - Remove 'published' column if it exists (replaced by 'status')
 * This script checks if the articles table has a 'published' column and removes it
 */

async function fixSchema() {
    try {
        logger.info('Starting database schema fix...');
        
        await database.initialize();
        logger.info('✓ Database connected');

        // Check if articles table has a 'published' column
        const tableInfo = await database.all('PRAGMA table_info(articles)');
        const columnNames = tableInfo.map(col => col.name);
        
        logger.info('Columns in articles table:', columnNames);

        if (columnNames.includes('published')) {
            logger.info('Found deprecated "published" column, removing it...');
            
            // Try to drop the column if it exists
            try {
                await database.run('ALTER TABLE articles DROP COLUMN published');
                logger.info('✓ Removed deprecated "published" column');
            } catch (e) {
                // SQLite doesn't support DROP COLUMN directly in older versions
                // Try an alternative approach
                logger.info('ALTER TABLE DROP not supported, using workaround...');
                
                // Create new table without the published column
                await database.run(`
                    CREATE TABLE articles_new AS 
                    SELECT id, headline, sub_headline, summary, body, slug,
                           featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit,
                           category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured,
                           is_opinion, is_fact_checked, language, location_tag, source_attribution,
                           seo_title, seo_description, reading_time, view_count, like_count, comment_count,
                           published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at
                    FROM articles
                `);
                
                await database.run('DROP TABLE articles');
                await database.run('ALTER TABLE articles_new RENAME TO articles');
                logger.info('✓ Recreated articles table without "published" column');
            }
        } else {
            logger.info('✓ No deprecated "published" column found - schema is correct');
        }

        // Verify the schema is correct
        const updatedTableInfo = await database.all('PRAGMA table_info(articles)');
        const updatedColumnNames = updatedTableInfo.map(col => col.name);
        
        if (!updatedColumnNames.includes('published')) {
            logger.info('✓ Schema fix verified - "published" column removed or never existed');
            logger.info('✓ Database schema is now correct');
        } else {
            logger.error('✗ Failed to remove "published" column');
        }

        process.exit(0);
    } catch (error) {
        logger.error('Schema fix error:', error);
        process.exit(1);
    }
}

fixSchema();
