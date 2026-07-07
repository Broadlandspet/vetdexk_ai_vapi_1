
const { Pool } = require('pg');
const env = require('./env');
const fs = require('fs');
const path = require('path');

let pool = null;

// ============================================
// Get PostgreSQL connection pool
// ============================================
const getPgPool = () => {
  if (!pool) {
    console.log('📦 Initializing PostgreSQL connection pool...');
    console.log(`   Host: ${env.DB_HOST}`);
    console.log(`   Database: ${env.DB_NAME}`);
    
    pool = new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false // Required for Supabase SSL
      },
      family: 4, // Force IPv4
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    // Test connection
    pool.connect((err, client, release) => {
      if (err) {
        console.error('❌ PostgreSQL connection error:', err.message);
        console.error('   Please check your credentials and network');
      } else {
        console.log('✅ PostgreSQL (Supabase) connected successfully!');
        release();
      }
    });
  }
  return pool;
};

// ============================================
// Execute SQL query (raw PostgreSQL)
// ============================================
const executeQuery = async (text, params) => {
  const pgPool = getPgPool();
  try {
    const result = await pgPool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// ============================================
// MySQL-compatible execute() wrapper
// Converts MySQL ? placeholders to PostgreSQL $1, $2, etc.
// Returns [rows, fields] like MySQL2
// ============================================
const execute = async (query, params = []) => {
  const pgPool = getPgPool();
  
  try {
    // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
    let pgQuery = query;
    let paramIndex = 0;
    pgQuery = pgQuery.replace(/\?/g, () => `$${++paramIndex}`);
    
    const result = await pgPool.query(pgQuery, params);
    
    // Return in MySQL2 format: [rows, fields]
    return [result.rows, result.fields];
  } catch (error) {
    console.error('Database execute error:', error.message);
    console.error('Query:', query.substring(0, 200));
    console.error('Params:', params);
    throw error;
  }
};

// ============================================
// Get database connection for transactions
// Returns MySQL2-like connection object
// ============================================
const getConnection = async () => {
  const pgPool = getPgPool();
  const client = await pgPool.connect();
  
  return {
    execute: async (query, params = []) => {
      let pgQuery = query;
      let paramIndex = 0;
      pgQuery = pgQuery.replace(/\?/g, () => `$${++paramIndex}`);
      const result = await client.query(pgQuery, params);
      return [result.rows, result.fields];
    },
    
    beginTransaction: async () => {
      await client.query('BEGIN');
    },
    
    commit: async () => {
      await client.query('COMMIT');
    },
    
    rollback: async () => {
      await client.query('ROLLBACK');
    },
    
    release: () => {
      client.release();
    }
  };
};

// ============================================
// Check if a table exists
// ============================================
const tableExists = async (tableName) => {
  try {
    const result = await executeQuery(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.log(`   ⚠️  Error checking ${tableName}: ${error.message}`);
    return false;
  }
};

// ============================================
// Get all tables status
// ============================================
const getAllTables = async () => {
  const tables = [
    'conversations', 
    'calls', 
    'transcriptions', 
    'users',
    'patients',
    'appointments',
    'working_hours',
    'ezy_vet_call_logs',
    'email_logs'
  ];
  const result = [];
  
  for (const table of tables) {
    const exists = await tableExists(table);
    result.push({ name: table, exists });
  }
  
  return result;
};

// ============================================
// Create all tables using schema file
// ============================================
const createAllTables = async () => {
  try {
    const sqlFilePath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.log('   ⚠️  Migration file not found:', sqlFilePath);
      return false;
    }
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    await executeQuery(sql);
    console.log('✅ All tables created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    return false;
  }
};

// ============================================
// Run appointment system migration
// ============================================
const runAppointmentMigration = async () => {
  try {
    const migrationPath = path.join(__dirname, '../../migrations/003_appointment_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('   ⚠️  Appointment migration file not found');
      return false;
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        await executeQuery(statement);
      } catch (stmtError) {
        // Ignore "already exists" errors
        if (!stmtError.message.includes('already exists') && 
            !stmtError.message.includes('duplicate key') &&
            !stmtError.message.includes('ER_DUP_KEYNAME')) {
          console.log(`   ⚠️  Statement warning: ${stmtError.message.substring(0, 100)}`);
        }
      }
    }
    
    console.log('✅ Appointment system migration completed!');
    return true;
  } catch (error) {
    console.error('❌ Appointment migration error:', error.message);
    return false;
  }
};

// ============================================
// EXPORTS
// ============================================
// module.exports = {
//   // Core
//   getPgPool,
//   executeQuery,
  
//   // MySQL-compatible wrappers
//   execute,
//   getConnection,
  
//   // Table management
//   tableExists,
//   getAllTables,
//   createAllTables,
  
//   // Migration
//   runAppointmentMigration,
  
// };


module.exports = {
  // Core
  getPgPool,
  executeQuery,
  
  // MySQL-compatible wrappers
  execute,
  getConnection,
  
  // Table management
  tableExists,
  getAllTables,
  createAllTables,
  
  // Migration
  runAppointmentMigration,

  // 👇 ADD THIS LINE 👇
  pool: getPgPool()
};