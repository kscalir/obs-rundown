const Database = require('better-sqlite3');
const path = require('path');

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../database.sqlite');
  }

  // Initialize database connection
  initialize() {
    if (this.db) {
      return this.db;
    }

    try {
      this.db = new Database(this.dbPath);
      
      // Enable foreign keys and other pragmas for better performance
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      
      console.log('Connected to SQLite database with better-sqlite3');
      return this.db;
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }
  }

  // Get database instance (initialize if needed)
  getDb() {
    if (!this.db) {
      this.initialize();
    }
    return this.db;
  }

  // Helper method for safe query execution with error handling
  executeQuery(query, params = []) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(query);
      return stmt.all(params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Helper method for single row queries
  executeGet(query, params = []) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(query);
      return stmt.get(params);
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  }

  // Helper method for insert/update/delete operations
  executeRun(query, params = []) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(query);
      return stmt.run(params);
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  }

  // Helper for handling errors in route handlers
  handleError(res, error, operation) {
    console.error(`DB ${operation} error:`, error);
    return res.status(500).json({ 
      error: `Database ${operation} failed`,
      details: error.message 
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;