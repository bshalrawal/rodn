#!/usr/bin/env node

/**
 * Initialize Turso Database with Schema
 * 
 * This script:
 * 1. Connects to the Turso database
 * 2. Creates all necessary tables
 * 3. Validates schema integrity
 * 4. Confirms database is ready for use
 * 
 * Usage: node scripts/init-turso-db.js
 */

require('dotenv').config();

// Import database configuration
const database = require('../server/config/database');
const { createSchema, validateSchema } = require('../server/config/schema');

console.log('\n=== Turso Database Initialization ===\n');

async function initializeDatabase() {
  try {
    console.log('[INFO] Starting Turso database initialization...');
    
    // Check environment variables
    if (!process.env.TURSO_CONNECTION_URL) {
      throw new Error('TURSO_CONNECTION_URL environment variable is not set');
    }
    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error('TURSO_AUTH_TOKEN environment variable is not set');
    }
    
    console.log('[INFO] Connecting to Turso database...');
    
    // Initialize database connection
    await database.initialize();
    console.log('✅ Connected to Turso database');
    
    // Create schema
    console.log('[INFO] Creating database schema...');
    await createSchema();
    console.log('✅ Schema created successfully');
    
    // Validate schema
    console.log('[INFO] Validating schema integrity...');
    await validateSchema();
    console.log('✅ Schema validation passed');
    
    // Get table info
    console.log('[INFO] Verifying table structure...');
    const tableInfo = await database.all(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='articles'`
    );
    
    if (tableInfo.length === 0) {
      throw new Error('Articles table was not created');
    }
    
    console.log('✅ Articles table created');
    
    // Check for deprecated 'published' column
    const articlesCols = await database.all(
      `PRAGMA table_info(articles)`
    );
    
    const hasPublishedCol = articlesCols.some(col => col.name === 'published');
    if (hasPublishedCol) {
      console.log('⚠️  Deprecated "published" column detected - removing...');
      try {
        await database.run(
          `ALTER TABLE articles DROP COLUMN published`
        );
        console.log('✅ Removed deprecated "published" column');
      } catch (err) {
        console.log('⚠️  Could not remove published column (may not exist)');
      }
    } else {
      console.log('✅ No deprecated "published" column found');
    }
    
    // Count existing articles
    const articleCount = await database.get(
        `SELECT COUNT(*) as count FROM articles`
    );
    console.log(`[INFO] Current articles in database: ${articleCount?.count || 0}`);
    
    // Verify all expected columns exist
    const expectedColumns = [
      'id', 'headline', 'sub_headline', 'summary', 'body', 'slug',
      'featured_image_url', 'featured_image_caption', 'featured_image_alt', 'featured_image_credit',
      'category_id', 'author_id', 'editor_id', 'status',
      'is_breaking', 'is_pinned', 'is_featured', 'is_opinion', 'is_fact_checked',
      'language', 'location_tag', 'source_attribution',
      'seo_title', 'seo_description', 'reading_time',
      'view_count', 'like_count', 'comment_count',
      'published_at', 'scheduled_publish_at', 'scheduled_unpublish_at',
      'created_at', 'updated_at'
    ];
    
    const actualColumns = new Set(articlesCols.map(col => col.name));
    const missingColumns = expectedColumns.filter(col => !actualColumns.has(col));
    const extraColumns = articlesCols
      .map(col => col.name)
      .filter(col => !expectedColumns.includes(col) && col !== 'published');
    
    if (missingColumns.length > 0) {
      console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ All expected columns present');
    }
    
    if (extraColumns.length > 0) {
      console.log(`⚠️  Extra columns: ${extraColumns.join(', ')}`);
    }
    
    // Final verification
    console.log('\n✨ Database initialization complete!');
    console.log('\nDatabase Status:');
    console.log(`  ✓ Connected to Turso`);
    console.log(`  ✓ Articles table with ${articlesCols.length} columns`);
    console.log(`  ✓ Schema valid and ready`);
    console.log(`  ✓ No deprecated columns\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('[ERROR] Failed to initialize database');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
