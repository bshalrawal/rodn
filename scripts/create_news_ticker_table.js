const database = require('./server/config/database');
const logger = require('./server/utils/logger');

async function createTable() {
    try {
        logger.info('Initializing database connection...');
        
        // Initialize the database
        await database.initialize();

        logger.info('Creating news_ticker table...');
        
        // Create the table
        await database.run(`
            CREATE TABLE IF NOT EXISTS news_ticker (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                link_url VARCHAR(500),
                is_active BOOLEAN DEFAULT 1,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        logger.info('✓ News ticker table created successfully');

        // Create indexes
        await database.run(`
            CREATE INDEX IF NOT EXISTS idx_news_ticker_active ON news_ticker(is_active)
        `);
        
        await database.run(`
            CREATE INDEX IF NOT EXISTS idx_news_ticker_created_by ON news_ticker(created_by)
        `);

        logger.info('✓ Indexes created successfully');

        console.log('\n✓ News ticker table creation complete!');
        process.exit(0);
    } catch (error) {
        logger.error('Failed to create news_ticker table:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

createTable();
