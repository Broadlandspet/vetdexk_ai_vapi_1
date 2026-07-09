

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const logRoutes = require('./routes/logs');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { getAllTables, createAllTables } = require('./config/database');

const adminRoutes = require('./routes/admin');
const vapiRoutes = require('./routes/vapi');
const emailRoutes = require('./routes/email');

// NEW: Appointment System Routes
const appointmentRoutes = require('./routes/appointments');
const patientRoutes = require('./routes/patients');
const slotRoutes = require('./routes/slots');

const bookDemoRoutes = require('./routes/bookDemo');

// Import and start cron job for feedback calls
require('./cron/feedbackCron');

const ezyvetRoutes = require('./routes/ezyvet');

const superadminRoutes = require('./routes/superadmin')

// ... after other middleware


const calendlyRoutes = require("./routes/calendlyRoutes");
 
const calendlyWebhookRoutes = require("./routes/calendlyWebhookRoutes");

const animalRoutes = require('./routes/animal');
const feedbackRoutes = require('./routes/feedbackRoutes');
 
 
const paymentRoutes = require('./routes/paymentRoutes');


const app = express();

// ============================================
// 🎯 STRUCTURED REQUEST/RESPONSE LOGGER
// ============================================
app.use((req, res, next) => {
  // Store start time
  req._startTime = Date.now();
  
  // Log incoming request
  console.log('\n─────────────────────────────────────────');
  console.log(`📥 [${req.method}] ${req.originalUrl}`);
  
  if (Object.keys(req.query).length > 0) {
    console.log(`   Query:`, req.query);
  }
  
  // Don't log body here - let body-parser do its job first
  next();
});

// ============================================
// RESPONSE INTERCEPTOR (for logging)
// ============================================
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  res.json = function(data) {
    const time = Date.now() - req._startTime;
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✅ SUCCESS [${res.statusCode}] - ${time}ms`);
      console.log(`   Response:`, JSON.stringify(data).substring(0, 200));
    } else {
      console.log(`❌ FAILED [${res.statusCode}] - ${time}ms`);
      console.log(`   Reason:`, data.error || data.message || 'Request failed');
      console.log(`   Response:`, JSON.stringify(data).substring(0, 200));
    }
    console.log('─────────────────────────────────────────\n');
    
    return originalJson(data);
  };
  
  res.send = function(data) {
    const time = Date.now() - req._startTime;
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✅ SUCCESS [${res.statusCode}] - ${time}ms`);
    } else {
      console.log(`❌ FAILED [${res.statusCode}] - ${time}ms`);
    }
    console.log('─────────────────────────────────────────\n');
    
    return originalSend(data);
  };
  
  next();
});










// ============================================
// CATCH ERRORS IN ROUTES
// ============================================
app.use((err, req, res, next) => {
  if (err) {
    const time = Date.now() - (req._startTime || Date.now());
    console.log(`❌ FAILED [500] - ${time}ms`);
    console.log(`   Error: ${err.message}`);
    console.log('─────────────────────────────────────────\n');
  }
  next(err);
});

app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = env.FRONTEND_URL.split(',');
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ============================================
// ✅ FIX #1: Increase payload limit for Vapi webhook
// Vapi sends ~160KB payloads (transcript + messages)
// Default 100KB is too small - increased to 5MB
// ============================================
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ============================================
// RATE LIMITER - Exempt Vapi webhook from rate limiting
// ============================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Apply rate limiting to all routes except Vapi webhook
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for Vapi webhook endpoint
  if (req.originalUrl === '/api/vapi' || req.originalUrl.startsWith('/api/vapi')) {
    return next();
  }
  return limiter(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Broadlands Pet Hospital - AI Voice Appointment System');
});

// ============================================
// LOG REQUEST BODY AFTER PARSING (for debugging only)
// ============================================
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    const body = { ...req.body };
    if (body.password) body.password = '***';
    if (body.token) body.token = '***';
    console.log(`   Body:`, JSON.stringify(body).substring(0, 500));
  }
  next();
});

// ============================================
// EXISTING ROUTES
// ============================================
app.use('/api/logs', logRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vapi', vapiRoutes);
app.use('/api/admin', emailRoutes);

// ============================================
// NEW: APPOINTMENT SYSTEM ROUTES
// ============================================

// Appointment booking & management
app.use('/api/appointments', appointmentRoutes);

// Patient management
app.use('/api/patients', patientRoutes);

// Slot availability & working hours
app.use('/api/slots', slotRoutes);



////----super admin -----///
app.use('/api/superadmin' , superadminRoutes);






///-----for ezy vet api --------///

app.use('/api/ezyvet', ezyvetRoutes);




//////-------dummy bookinb----////
app.use('/api/demo', bookDemoRoutes);
 

app.use("/api/calendly", calendlyRoutes);
 
app.use("/api/webhooks", calendlyWebhookRoutes);


////---- animal routes-------//////
app.use('/api/animal', animalRoutes);
 

app.use('/api/feedback', feedbackRoutes);


app.use('/api/payment', paymentRoutes);






// ============================================
// 404 HANDLER
// ============================================
app.use((req, res, next) => {
  console.log(`❌ FAILED [404] - Route not found: ${req.method} ${req.originalUrl}`);
  console.log('─────────────────────────────────────────\n');
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use(errorHandler);

// ============================================
// DATABASE SETUP & MIGRATION CHECK
// ============================================

async function checkAndCreateTables() {
  try {
    console.log('\n========================================');
    console.log('🔍 DATABASE SETUP CHECK');
    console.log('   Database Type: PostgreSQL');
    console.log('========================================\n');

    const tables = await getAllTables();
    const missingTables = tables.filter(t => !t.exists).map(t => t.name);

    // Show status of existing tables
    for (const table of tables) {
      if (table.exists) {
        console.log(`   ✅ ${table.name}: EXISTS`);
      } else {
        console.log(`   ❌ ${table.name}: NOT FOUND`);
      }
    }

    // Check email tables
    const emailTables = ['email_logs', 'email_config'];
    for (const tableName of emailTables) {
      try {
        const { tableExists } = require('./config/database');
        const exists = await tableExists(tableName);
        if (exists) {
          console.log(`   ✅ ${tableName}: EXISTS`);
        } else {
          console.log(`   ❌ ${tableName}: NOT FOUND`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${tableName}: Could not check`);
      }
    }

    // ============================================
    // NEW: Check appointment system tables
    // ============================================
    console.log('\n📋 Checking Appointment System Tables...');
    
    const newTables = ['patients', 'appointments', 'working_hours', 'call_logs', 'email_logs'];
    let allNewTablesExist = true;
    
    for (const tableName of newTables) {
      try {
        const { tableExists } = require('./config/database');
        const exists = await tableExists(tableName);
        if (exists) {
          console.log(`   ✅ ${tableName}: EXISTS`);
        } else {
          console.log(`   ❌ ${tableName}: NOT FOUND`);
          allNewTablesExist = false;
        }
      } catch (e) {
        console.log(`   ⚠️  ${tableName}: Could not check`);
        allNewTablesExist = false;
      }
    }

    // Auto-run new migration if tables are missing
    if (!allNewTablesExist) {
      console.log('\n🔄 Running Appointment System Migration...\n');
      
      try {
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '../migrations/003_appointment_system.sql');
        
        if (fs.existsSync(migrationPath)) {
          const { executeQuery } = require('./config/database');
          const migrationSql = fs.readFileSync(migrationPath, 'utf8');
          
          // Split by semicolons and execute each statement
          const statements = migrationSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
          
          for (const statement of statements) {
            try {
              await executeQuery(statement);
            } catch (stmtError) {
              // Ignore "already exists" errors
              if (!stmtError.message.includes('already exists') && 
                  !stmtError.message.includes('ER_DUP_KEYNAME')) {
                console.log(`   ⚠️  Statement warning: ${stmtError.message.substring(0, 100)}`);
              }
            }
          }
          
          console.log('   ✅ Appointment system tables created!\n');
        } else {
          console.log('   ⚠️  Migration file not found: migrations/003_appointment_system.sql\n');
        }
      } catch (err) {
        console.log(`   ⚠️  Migration error: ${err.message}\n`);
        console.log('   💡 Run manually: mysql -u user -p database < migrations/003_appointment_system.sql\n');
      }
    } else {
      console.log('   ✅ All appointment system tables exist!\n');
    }

    console.log('\n----------------------------------------\n');

    // Handle missing base tables
    if (missingTables.length === 0) {
      console.log('✅ All base tables are ready!');
    } else {
      console.log(`📋 Missing tables: ${missingTables.join(', ')}`);
      console.log('\n🔄 Attempting to create missing tables...\n');
      
      const created = await createAllTables();
      
      if (created) {
        console.log('✅ All tables created successfully!\n');
      } else {
        console.log('\n💡 Please create missing tables manually:');
        console.log('   File: migrations/001_initial_schema.sql\n');
      }
    }







    // ============================================
// ✅ NEW: Check book_demo table
// ============================================
console.log('\n📋 Checking Book Demo Table...');
 
try {
  const { tableExists } = require('./config/database');
  const exists = await tableExists('book_demo');
  if (exists) {
    console.log('   ✅ book_demo: EXISTS');
  } else {
    console.log('   ❌ book_demo: NOT FOUND');
    console.log('\n🔄 Creating book_demo table...\n');
   
    const createBookDemoTable = `
      CREATE TABLE IF NOT EXISTS book_demo (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        hospital_name VARCHAR(255) NOT NULL,
        hospital_address TEXT NOT NULL,
        hospital_email VARCHAR(255) NOT NULL,
        hospital_phone VARCHAR(50) NOT NULL,
        preferred_date DATE NOT NULL,
        preferred_time TIME NOT NULL,
        timezone VARCHAR(50) DEFAULT 'UTC',
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
   
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_book_demo_email ON book_demo(email);
      CREATE INDEX IF NOT EXISTS idx_book_demo_status ON book_demo(status);
      CREATE INDEX IF NOT EXISTS idx_book_demo_date ON book_demo(preferred_date);
    `;
   
    const createTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
     
      DROP TRIGGER IF EXISTS update_book_demo_updated_at ON book_demo;
     
      CREATE TRIGGER update_book_demo_updated_at
          BEFORE UPDATE ON book_demo
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `;
   
    const { executeQuery } = require('./config/database');
    await executeQuery(createBookDemoTable);
    await executeQuery(createIndexes);
    await executeQuery(createTrigger);
   
    console.log('   ✅ book_demo table created successfully!\n');
  }
} catch (e) {
  console.log(`   ⚠️  book_demo: Could not check/create - ${e.message}`);
}








    // Check and create email tables
    console.log('\n📧 Checking email tables...');
    try {
      const fs = require('fs');
      const path = require('path');
      const emailMigrationPath = path.join(__dirname, '../migrations/002_email_logs.sql');
      
      if (fs.existsSync(emailMigrationPath)) {
        const { executeQuery } = require('./config/database');
        const emailSql = fs.readFileSync(emailMigrationPath, 'utf8');
        await executeQuery(emailSql);
        console.log('   ✅ Email tables ready!\n');
      } else {
        console.log('   ⚠️  Email migration file not found\n');
      }
    } catch (err) {
      console.log(`   ⚠️  Email tables setup: ${err.message}\n`);
    }

    // ============================================
    // VERIFY GOOGLE API CONFIGURATION
    // ============================================
    console.log('🔐 Checking Google API Configuration...');
    
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
      console.log('   ✅ Google Client ID: Configured');
      console.log('   ✅ Google Client Secret: Configured');
      console.log('   ✅ Google Refresh Token: Configured');
      
      if (env.GOOGLE_CALENDAR_ID) {
        console.log(`   ✅ Google Calendar ID: ${env.GOOGLE_CALENDAR_ID}`);
      } else {
        console.log('   ℹ️  Google Calendar ID: Using primary calendar');
      }
      
      if (env.ADMIN_EMAIL) {
        console.log(`   ✅ Admin Email: ${env.ADMIN_EMAIL}`);
      } else {
        console.log('   ⚠️  Admin Email: Not configured (emails may fail)');
      }
    } else {
      console.log('   ⚠️  Google API not fully configured!');
      console.log('   ℹ️  Calendar & Email features will use fallback mode');
    }
    
    console.log('\n========================================\n');

    return true;

  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    console.log('\n⚠️  Please check your PostgreSQL configuration in .env\n');
    return false;
  }
}

// ============================================
// START SERVER
// ============================================

async function startServer() {
  // Run database checks
  await checkAndCreateTables();

  const PORT = env.PORT || 3000;

   // Start cron job
  require('./cron/feedbackCron');
  
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Frontend URL: ${env.FRONTEND_URL}`);
    
    console.log(`\n🚀 Server is running on http://localhost:${PORT}\n`);
    console.log('📋 Available API Endpoints:');
    console.log('   📅 /api/appointments - Appointment booking & management');
    console.log('   👤 /api/patients     - Patient lookup & management');
    console.log('   🕐 /api/slots        - Slot availability & working hours');
    console.log('   📞 /api/vapi         - VAPI webhook integration');
    console.log('   📊 /api/logs         - Call logs & transcriptions');
    console.log('   🔐 /api/auth         - Authentication');
    console.log('   ⚙️  /api/admin        - Admin dashboard APIs');
    console.log('   ✉️  /api/admin/email  - Email configuration\n');
  });
}

startServer();

module.exports = app;