



const { executeQuery, tableExists, getAllTables } = require('../src/config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

async function setupDatabase() {
  try {
    console.log('\n========================================');
    console.log('📦 DATABASE SETUP');
    console.log('   Database Type: PostgreSQL');
    console.log('========================================\n');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Check which tables already exist
    const tables = await getAllTables();
    const existingTables = tables.filter(t => t.exists).map(t => t.name);
    const missingTables = tables.filter(t => !t.exists).map(t => t.name);

    if (missingTables.length === 0) {
      console.log('✅ All tables already exist!');
      console.log('   - conversations ✅');
      console.log('   - calls ✅');
      console.log('   - transcriptions ✅');
      console.log('   - users ✅\n');
      return;
    }

    console.log(`📋 Creating missing tables: ${missingTables.join(', ')}\n`);

    // Execute SQL for missing tables
    await executeQuery(sql);
    
    console.log('✅ All tables created successfully!\n');

  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    console.log('\n⚠️  Please ensure PostgreSQL is configured correctly in .env');
    console.log('   Or run the SQL manually in pgAdmin:\n');
    console.log(`   File: ${path.join(__dirname, '../migrations/001_initial_schema.sql')}\n`);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase().then(() => process.exit(0));
}

module.exports = setupDatabase;