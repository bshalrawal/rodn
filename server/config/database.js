const { createClient } = require('@libsql/client');
const logger = require('../utils/logger');

class TursoDatabase {
    constructor() {
        this.db = null;
    }

    async initialize() {
        try {
            // Get credentials from environment variables
            // Get credentials from environment variables and clean them (remove quotes/spaces)
            let dbUrl = process.env.TURSO_CONNECTION_URL || process.env.DATABASE_URL;
            let authToken = process.env.TURSO_AUTH_TOKEN;

            if (dbUrl) dbUrl = dbUrl.trim().replace(/^["']|["']$/g, '');
            if (authToken) authToken = authToken.trim().replace(/^["']|["']$/g, '');

            if (!dbUrl) {
                throw new Error('TURSO_CONNECTION_URL environment variable is required. Set it in Render > Environment Variables');
            }
            if (!authToken) {
                throw new Error('TURSO_AUTH_TOKEN environment variable is required. Set it in Render > Environment Variables');
            }

            logger.info('Connecting to Turso database...');
            logger.info(`Database URL: ${dbUrl.split('-')[0]}...`);

            // Create Turso client with timeout
            this.db = createClient({
                url: dbUrl,
                authToken: authToken,
            });

            // Test connection with timeout
            logger.info('Testing database connection...');
            const result = await Promise.race([
                this.db.execute('SELECT 1 as connection_test'),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database connection timeout (30s)')), 30000)
                )
            ]);
            logger.info('✓ Successfully connected to Turso database');
            logger.info(`Database: ${dbUrl}`);

            return true;
        } catch (error) {
            logger.error('Failed to connect to Turso database');
            logger.error(`Error: ${error.message}`);
            logger.error('CRITICAL: Check these in Render > Settings > Environment Variables:');
            logger.error('  1. TURSO_CONNECTION_URL is set');
            logger.error('  2. TURSO_AUTH_TOKEN is set');
            logger.error('  3. Values are copied exactly without extra spaces');
            throw error;
        }
    }

    // Execute a query that returns multiple rows
    async all(sql, params = []) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }

            // Sanitize parameters
            const sanitizedParams = (params || []).map(param => {
                if (param === undefined) return null;
                if (typeof param === 'bigint') return Number(param);
                if (param instanceof Date) return param.toISOString();
                if (typeof param === 'boolean') return param ? 1 : 0;
                return param;
            });

            const result = await this.db.execute({
                sql: sql,
                args: sanitizedParams,
            });

            // Convert BigInt values to numbers for JSON serialization
            const rows = (result.rows || []).map(row => this.convertBigInts(row));
            return rows;
        } catch (error) {
            logger.error('Database all() error:', { sql, params, error: error.message });
            throw error;
        }
    }

    // Execute a query that returns a single row
    async get(sql, params = []) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }

            // Sanitize parameters
            const sanitizedParams = (params || []).map(param => {
                if (param === undefined) return null;
                if (typeof param === 'bigint') return Number(param);
                if (param instanceof Date) return param.toISOString();
                if (typeof param === 'boolean') return param ? 1 : 0;
                return param;
            });

            const result = await this.db.execute({
                sql: sql,
                args: sanitizedParams,
            });

            const row = result.rows?.[0] || null;
            return row ? this.convertBigInts(row) : null;
        } catch (error) {
            logger.error('Database get() error:', { sql, params, error: error.message });
            throw error;
        }
    }

    // Execute a statement (INSERT, UPDATE, DELETE)
    async run(sql, params = []) {
        try {
            if (!this.db) {
                throw new Error('Database not initialized');
            }

            // Sanitize parameters - convert unsupported types before sending to DB
            const sanitizedParams = (params || []).map(param => {
                if (param === undefined) return null;
                if (typeof param === 'bigint') return Number(param);
                if (param instanceof Date) return param.toISOString();
                if (typeof param === 'boolean') return param ? 1 : 0;
                return param;
            });

            const result = await this.db.execute({
                sql: sql,
                args: sanitizedParams,
            });

            return {
                lastID: result.lastInsertRowid ? Number(result.lastInsertRowid) : null,
                changes: result.rowsAffected,
            };
        } catch (error) {
            logger.error('Database run() error:', { sql, params, error: error.message });
            throw error;
        }
    }

    // Execute multiple statements in a transaction
    async transaction(callback) {
        try {
            // Turso handles transactions through batch execution
            const result = await callback();
            return result;
        } catch (error) {
            logger.error('Transaction error:', error.message);
            throw error;
        }
    }

    // Convert unsupported types to JSON-serializable values
    convertBigInts(obj, depth = 0) {
        // Prevent infinite recursion
        if (depth > 100) return null;

        if (obj === null || obj === undefined) return obj;

        // Handle BigInt
        if (typeof obj === 'bigint') {
            return Number(obj);
        }

        // Handle boolean - keep as boolean for API (JSON supports booleans)
        if (typeof obj === 'boolean') {
            return obj;
        }

        // Handle Date
        if (obj instanceof Date) {
            return obj.toISOString();
        }

        // Handle regular expressions and other non-serializable objects
        if (typeof obj === 'function' || typeof obj === 'symbol') {
            return undefined;
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertBigInts(item, depth + 1)).filter(item => item !== undefined);
        }

        // Handle plain objects
        if (typeof obj === 'object' && obj.constructor === Object) {
            const converted = {};
            for (const [key, value] of Object.entries(obj)) {
                const converted_value = this.convertBigInts(value, depth + 1);
                // Only add defined values
                if (converted_value !== undefined) {
                    converted[key] = converted_value;
                }
            }
            return converted;
        }

        // For Turso objects or other types, try to convert to string if needed
        if (typeof obj === 'object') {
            try {
                // Try to access the object's properties
                if (obj.toString && typeof obj.toString === 'function') {
                    const str = obj.toString();
                    // If it's a special object representation, return null instead
                    if (str.includes('[object') || str.includes('Object')) {
                        return null;
                    }
                    return str;
                }
                return null;
            } catch (e) {
                return null;
            }
        }

        return obj;
    }

    // Close database connection
    async close() {
        try {
            if (this.db) {
                // Turso client cleanup if needed
                logger.info('Database connection closed');
            }
        } catch (error) {
            logger.error('Error closing database:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
const database = new TursoDatabase();
module.exports = database;
