const database = require('./server/config/database');
const logger = require('./server/utils/logger');

async function addTestItem() {
    try {
        logger.info('Initializing database connection...');
        await database.initialize();

        logger.info('Adding test news ticker item...');
        
        const result = await database.run(`
            INSERT INTO news_ticker (title, content, link_url, is_active, created_by)
            VALUES (?, ?, ?, ?, ?)
        `, [
            'Breaking News: Test Ticker Item',
            'This is a test news ticker item to verify the functionality',
            null,
            1,
            1
        ]);

        logger.info('✓ Test item added successfully');

        // Fetch and display all items
        const items = await database.all(`
            SELECT id, title, content, link_url, is_active, created_at
            FROM news_ticker
            ORDER BY created_at DESC
        `);

        console.log('\n✓ Current news ticker items:');
        items.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.title}`);
        });

        process.exit(0);
    } catch (error) {
        logger.error('Failed to add test item:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

addTestItem();
