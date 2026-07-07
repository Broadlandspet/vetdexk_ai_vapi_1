

-- -- Enable UUID extension (required for gen_random_uuid)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -- =========================
-- -- 1. CONVERSATIONS TABLE
-- -- =========================
-- CREATE TABLE IF NOT EXISTS conversations (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

--     from_number VARCHAR(20) NOT NULL,
--     to_number VARCHAR(20) NOT NULL,

--     -- Normalized pair (for bidirectional matching)
--     number_1 VARCHAR(20) GENERATED ALWAYS AS (LEAST(from_number, to_number)) STORED,
--     number_2 VARCHAR(20) GENERATED ALWAYS AS (GREATEST(from_number, to_number)) STORED,

--     created_at TIMESTAMP DEFAULT NOW(),
--     updated_at TIMESTAMP DEFAULT NOW()
-- );

-- -- Unique constraint → ensures 1 conversation per number pair
-- CREATE UNIQUE INDEX IF NOT EXISTS unique_conversation_pair
-- ON conversations (number_1, number_2);


-- -- =========================
-- -- 2. ezy_vet_calls TABLE
-- -- =========================
-- CREATE TABLE IF NOT EXISTS ezy_vet_calls (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

--     call_sid VARCHAR(50) UNIQUE NOT NULL,

--     conversation_id UUID NOT NULL,
--     CONSTRAINT fk_conversation
--         FOREIGN KEY (conversation_id)
--         REFERENCES conversations(id)
--         ON DELETE CASCADE,

--     call_status VARCHAR(20),
--     menu_digit VARCHAR(10),

--     from_number VARCHAR(20),
--     to_number VARCHAR(20),
--     direction VARCHAR(20),

--     created_at TIMESTAMP DEFAULT NOW(),
--     updated_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE INDEX IF NOT EXISTS idx_ezy_vet_calls_conversation_id ON ezy_vet_calls(conversation_id);
-- CREATE INDEX IF NOT EXISTS idx_ezy_vet_calls_call_sid ON ezy_vet_calls(call_sid);


-- -- =========================
-- -- 3. TRANSCRIPTIONS TABLE
-- -- =========================
-- CREATE TABLE IF NOT EXISTS transcriptions (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

--     call_id UUID NOT NULL,
--     CONSTRAINT fk_call
--         FOREIGN KEY (call_id)
--         REFERENCES ezy_vet_calls(id)
--         ON DELETE CASCADE,

--     recording_sid VARCHAR(50),
--     recording_url TEXT,
--     recording_duration INT,

--     transcription_sid VARCHAR(50),
--     transcription_text TEXT,
--     transcription_status VARCHAR(20),

--     created_at TIMESTAMP DEFAULT NOW(),
--     updated_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE INDEX IF NOT EXISTS idx_transcriptions_call_id ON transcriptions(call_id);


-- -- =========================
-- -- 4. USERS TABLE (NEW)
-- -- =========================
-- CREATE TABLE IF NOT EXISTS users (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
--     name VARCHAR(100) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     username VARCHAR(50) UNIQUE NOT NULL,
--     role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
--     password_hash VARCHAR(255) NOT NULL,
    
--     -- Optional fields
--     is_active BOOLEAN DEFAULT true,
--     last_login TIMESTAMP WITH TIME ZONE,
    
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- -- Create indexes for users table (only if they don't exist)
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
-- CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- -- =========================
-- -- AUTO UPDATE updated_at (for all tables)
-- -- =========================
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--    NEW.updated_at = NOW();
--    RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- -- Triggers for all tables (drop and recreate to avoid duplicates)
-- DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
-- CREATE TRIGGER update_conversations_updated_at
-- BEFORE UPDATE ON conversations
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();

-- DROP TRIGGER IF EXISTS update_ezy_vet_calls_updated_at ON ezy_vet_calls;
-- CREATE TRIGGER update_ezy_vet_calls_updated_at
-- BEFORE UPDATE ON ezy_vet_calls
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();

-- DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;
-- CREATE TRIGGER update_transcriptions_updated_at
-- BEFORE UPDATE ON transcriptions
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();

-- DROP TRIGGER IF EXISTS update_users_updated_at ON users;
-- CREATE TRIGGER update_users_updated_at
-- BEFORE UPDATE ON users
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();




-- Enable UUID extension (required for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1. CONVERSATIONS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    number_1 VARCHAR(20) GENERATED ALWAYS AS (LEAST(from_number, to_number)) STORED,
    number_2 VARCHAR(20) GENERATED ALWAYS AS (GREATEST(from_number, to_number)) STORED,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_conversation_pair
ON conversations (number_1, number_2);

-- =========================
-- 2. ezy_vet_calls TABLE
-- =========================
CREATE TABLE IF NOT EXISTS ezy_vet_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_sid VARCHAR(50) UNIQUE NOT NULL,
    conversation_id UUID NOT NULL,
    CONSTRAINT fk_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,
    call_status VARCHAR(20),
    menu_digit VARCHAR(10),
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    direction VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ezy_vet_calls_conversation_id ON ezy_vet_calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ezy_vet_calls_call_sid ON ezy_vet_calls(call_sid);

-- =========================
-- 3. TRANSCRIPTIONS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL,
    CONSTRAINT fk_call
        FOREIGN KEY (call_id)
        REFERENCES ezy_vet_calls(id)
        ON DELETE CASCADE,
    recording_sid VARCHAR(50),
    recording_url TEXT,
    recording_duration INT,
    transcription_sid VARCHAR(50),
    transcription_text TEXT,
    transcription_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcriptions_call_id ON transcriptions(call_id);

-- =========================
-- 4. USERS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =========================
-- 5. PATIENTS TABLE (NEW)
-- =========================
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    pet_name VARCHAR(255),
    pet_species VARCHAR(100),
    pet_breed VARCHAR(255),
    pet_gender VARCHAR(50),
    pet_age VARCHAR(100),
    is_returning BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

-- =========================
-- 6. APPOINTMENTS TABLE (NEW)
-- =========================
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255),
    appointment_type VARCHAR(50) DEFAULT 'consultation',
    date DATE NOT NULL,
    time VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_google_event ON appointments(google_event_id);

-- =========================
-- 7. WORKING HOURS TABLE (NEW)
-- =========================
CREATE TABLE IF NOT EXISTS working_hours (
    id SERIAL PRIMARY KEY,
    day_of_week VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT TRUE,
    open_time TIME,
    close_time TIME,
    appointment_type VARCHAR(50) DEFAULT 'all',
    slot_duration INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(day_of_week, appointment_type)
);

-- =========================
-- 8. CALL LOGS TABLE (NEW)
-- =========================
CREATE TABLE IF NOT EXISTS ezy_vet_call_logs (
    id SERIAL PRIMARY KEY,
    call_sid VARCHAR(255) UNIQUE,
    caller_phone VARCHAR(20),
    caller_name VARCHAR(255),
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    call_duration INTEGER,
    call_status VARCHAR(50),
    transcription TEXT,
    summary TEXT,
    recording_url TEXT,
    vapi_call_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ezy_vet_call_logs_caller_phone ON ezy_vet_call_logs(caller_phone);
CREATE INDEX IF NOT EXISTS idx_ezy_vet_call_logs_call_sid ON ezy_vet_call_logs(call_sid);

-- =========================
-- 9. EMAIL LOGS TABLE (NEW - if not exists from migration 002)
-- =========================
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    email_type VARCHAR(50) DEFAULT 'confirmation',
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    gmail_message_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_appointment ON email_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- =========================
-- INSERT DEFAULT WORKING HOURS
-- =========================
INSERT INTO working_hours (day_of_week, is_open, open_time, close_time, appointment_type) VALUES
    ('Monday', TRUE, '16:30', '20:30', 'all'),
    ('Tuesday', FALSE, NULL, NULL, 'all'),
    ('Wednesday', TRUE, '10:00', '19:30', 'all'),
    ('Thursday', TRUE, '10:00', '19:30', 'all'),
    ('Friday', TRUE, '15:00', '19:30', 'all'),
    ('Saturday', TRUE, '10:00', '15:30', 'all'),
    ('Sunday', TRUE, '10:00', '15:30', 'all')
ON CONFLICT (day_of_week, appointment_type) DO NOTHING;

-- =========================
-- AUTO UPDATE updated_at FUNCTION
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all tables
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ezy_vet_calls_updated_at ON ezy_vet_calls;
CREATE TRIGGER update_ezy_vet_calls_updated_at
BEFORE UPDATE ON ezy_vet_calls
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;
CREATE TRIGGER update_transcriptions_updated_at
BEFORE UPDATE ON transcriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_working_hours_updated_at ON working_hours;
CREATE TRIGGER update_working_hours_updated_at
BEFORE UPDATE ON working_hours
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();