const database = require('./server/config/database');
const logger = require('./server/utils/logger');

async function addMultipleItems() {
    try {
        logger.info('Initializing database connection...');
        await database.initialize();

        const items = [
            {
                title: 'Breaking News: Important Announcement',
                content: 'An important announcement about the latest developments',
                link_url: null
            },
            {
                title: 'Update: Weather Report',
                content: 'Check the latest weather updates for your area',
                link_url: null
            },
            {
                title: 'Alert: Community Event',
                content: 'Join us for the upcoming community event',
                link_url: null
            }
        ];

        logger.info(`Adding ${items.length} news ticker items...`);
        
        for (const item of items) {
            await database.run(`
                INSERT INTO news_ticker (title, content, link_url, is_active, created_by)
                VALUES (?, ?, ?, ?, ?)
            `, [
                item.title,
                item.content,
                item.link_url,
                1,
                1
            ]);
        }

        logger.info('✓ All items added successfully');

        // Fetch and display all items
        const allItems = await database.all(`
            SELECT id, title, content, link_url, is_active, created_at
            FROM news_ticker
            ORDER BY created_at DESC
        `);

        console.log('\n✓ Current news ticker items:');
        allItems.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.title}`);
        });

        process.exit(0);
    } catch (error) {
        logger.error('Failed to add items:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

addMultipleItems();
