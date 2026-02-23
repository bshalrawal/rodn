const database = require('./database');
const logger = require('../utils/logger');

async function createSchema() {
  try {
    logger.info('Creating database schema...');

    // Users table
    await database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        full_name VARCHAR(255),
        bio TEXT,
        avatar_url VARCHAR(500),
        oauth_provider VARCHAR(20),
        oauth_id VARCHAR(255),
        oauth_email VARCHAR(255),
        is_journalist BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        is_suspended BOOLEAN DEFAULT 0,
        failed_login_attempts INTEGER DEFAULT 0,
        last_failed_login DATETIME,
        locked_until DATETIME,
        two_factor_enabled BOOLEAN DEFAULT 0,
        two_factor_secret VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Roles table
    await database.run(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Permissions table
    await database.run(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        resource VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Role permissions junction table
    await database.run(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);

    // User roles junction table
    await database.run(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      )
    `);

    // Categories table
    await database.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        parent_id INTEGER,
        image_url VARCHAR(500),
        is_enabled BOOLEAN DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        seo_title VARCHAR(255),
        seo_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    // Tags table
    await database.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Articles table
    await database.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        headline VARCHAR(500) NOT NULL,
        sub_headline VARCHAR(500),
        summary TEXT,
        body TEXT NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        featured_image_url VARCHAR(500),
        featured_image_caption TEXT,
        featured_image_alt TEXT,
        featured_image_credit VARCHAR(255),
        category_id INTEGER,
        author_id INTEGER NOT NULL,
        editor_id INTEGER,
        status VARCHAR(20) DEFAULT 'draft',
        is_breaking BOOLEAN DEFAULT 0,
        is_pinned BOOLEAN DEFAULT 0,
        is_featured BOOLEAN DEFAULT 0,
        is_opinion BOOLEAN DEFAULT 0,
        is_fact_checked BOOLEAN DEFAULT 0,
        language VARCHAR(10) DEFAULT 'en',
        location_tag VARCHAR(100),
        source_attribution TEXT,
        seo_title VARCHAR(255),
        seo_description TEXT,
        reading_time INTEGER,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        published_at DATETIME,
        scheduled_publish_at DATETIME,
        scheduled_unpublish_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (author_id) REFERENCES users(id),
        FOREIGN KEY (editor_id) REFERENCES users(id)
      )
    `);

    // Article tags junction table
    await database.run(`
      CREATE TABLE IF NOT EXISTS article_tags (
        article_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (article_id, tag_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Article versions table
    await database.run(`
      CREATE TABLE IF NOT EXISTS article_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        headline VARCHAR(500),
        body TEXT,
        changed_by INTEGER,
        change_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id)
      )
    `);

    // Media library table
    await database.run(`
      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        width INTEGER,
        height INTEGER,
        alt_text TEXT,
        caption TEXT,
        credit VARCHAR(255),
        is_public BOOLEAN DEFAULT 1,
        uploaded_by INTEGER NOT NULL,
        folder VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);

    // Comments table
    await database.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        user_id INTEGER,
        parent_id INTEGER,
        author_name VARCHAR(255),
        author_email VARCHAR(255),
        content TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        like_count INTEGER DEFAULT 0,
        dislike_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT 0,
        is_spam BOOLEAN DEFAULT 0,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // Advertisements table
    await database.run(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        ad_type VARCHAR(50) NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        image_url VARCHAR(500),
        link_url VARCHAR(500),
        html_code TEXT,
        placement VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        start_date DATETIME,
        end_date DATETIME,
        impression_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Analytics table
    await database.run(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER,
        event_type VARCHAR(50) NOT NULL,
        user_id INTEGER,
        session_id VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer VARCHAR(500),
        page_url VARCHAR(500),
        scroll_depth INTEGER,
        time_spent INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Audit logs table
    await database.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        resource_id INTEGER,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Sessions table
    await database.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token VARCHAR(500) UNIQUE NOT NULL,
        refresh_token VARCHAR(500) UNIQUE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Notifications table
    await database.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // User tips/submissions table
    await database.run(`
      CREATE TABLE IF NOT EXISTS user_tips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submitter_name VARCHAR(255),
        submitter_email VARCHAR(255),
        submitter_phone VARCHAR(50),
        is_anonymous BOOLEAN DEFAULT 0,
        subject VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(255),
        attachments TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        assigned_to INTEGER,
        internal_notes TEXT,
        ip_address VARCHAR(45),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Settings table
    await database.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // Create indexes for performance
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_analytics_article ON analytics(article_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)');

    logger.info('Database schema created successfully');
    return true;
  } catch (error) {
    logger.error('Schema creation error:', error);
    throw error;
  }
}

// Validation function to check and remove deprecated columns
async function validateSchema() {
  try {
    logger.info('Validating database schema...');
    
    // Check articles table for deprecated 'published' column
    const tableInfo = await database.all('PRAGMA table_info(articles)');
    const columnNames = tableInfo.map(col => col.name);
    
    if (columnNames.includes('published')) {
      logger.warn('Found deprecated "published" column, removing...');
      
      try {
        // Recreate table without published column
        const keepColumns = columnNames
          .filter(c => c !== 'published')
          .join(', ');
        
        await database.run('BEGIN TRANSACTION');
        try {
          await database.run(`
            CREATE TABLE articles_new AS
            SELECT ${keepColumns} FROM articles
          `);
          await database.run('DROP TABLE articles');
          await database.run('ALTER TABLE articles_new RENAME TO articles');
          
          // Recreate indices
          await database.run('CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)');
          await database.run('CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at)');
          await database.run('CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id)');
          
          await database.run('COMMIT');
          logger.info('✓ Removed deprecated "published" column');
        } catch (txError) {
          await database.run('ROLLBACK');
          throw txError;
        }
      } catch (e) {
        logger.error('Failed to remove deprecated column:', e.message);
      }
    }
    
    logger.info('✓ Schema validation completed');
  } catch (error) {
    logger.error('Schema validation error:', error);
  }
}

module.exports = { createSchema, validateSchema };
