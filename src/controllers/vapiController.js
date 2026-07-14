
// // src/controllers/vapiController.js
// const LogService = require('../services/logService');
// const EmailService = require('../services/emailService');
// const appointmentController = require('./appointmentController');
// const patientController = require('./patientController');
// const slotController = require('./slotController');
// const logger = require('../utils/logger');
// const { executeQuery } = require('../config/database');
// const env = require('../config/env');

// // ============================================
// // MAIN WEBHOOK HANDLER
// // ============================================
// exports.handleWebhook = async (req, res) => {
//   const body = req.body;
//   const message = body.message || body;
//   const messageType = message.type || body.type;

//   console.log(`\n📨 VAPI WEBHOOK: ${messageType}`);

//   if (messageType === 'end-of-call-report') {
//     await exports._handleEndOfCall(message, res);
//     return;
//   }

//   if (messageType === 'function-call' || messageType === 'tool-call') {
//     await exports._handleFunctionCall(message, res);
//     return;
//   }

//   if (messageType === 'status-update') {
//     console.log(`📊 Call Status: ${message.status}`);
//     return res.json({ received: true });
//   }

//   if (messageType === 'speech-update') {
//     console.log(`💬 [${message.role || 'unknown'}]: ${message.transcript || '...'}`);
//     return res.json({ received: true });
//   }

//   return res.json({ received: true });
// };

// // ============================================
// // HANDLE END OF CALL – WITH hospital_id
// // ============================================




// // ─── Inside src/controllers/vapiController.js ──────────────────────────

// // ─── HELPER: Normalize phone for lookup ────────────────────────────────
// function normalizePhoneForLookup(phone) {
//     if (!phone) return phone;
//     // Remove all non-digit characters
//     let cleaned = phone.replace(/\D/g, '');
//     // If starts with '1' and has 11 digits, strip the leading '1'
//     if (cleaned.length === 11 && cleaned.startsWith('1')) {
//         cleaned = cleaned.substring(1);
//     }
//     return cleaned;
// }

// // ─── FULLY UPDATED _handleEndOfCall ────────────────────────────────────
// exports._handleEndOfCall = async (message, res) => {
//     const callData = message.call || message.artifact?.call;
//     const transcript = message.artifact?.transcript || message.transcript;
//     const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
//     const vapiCallId = callData?.id || message.call?.id;
//     const fromNumber = message.customer?.number || callData?.customer?.number;
//     const toNumber = process.env.TWILIO_PHONE_NUMBER || 'unknown';
//     const duration = callData?.duration || message.durationSeconds;
//     const summary = message.artifact?.summary || message.summary;
//     const structuredData = message.artifact?.structuredData || message.structuredData;

//     // ─── Extract hospital_id ──────────────────────────────────────────────
//     let hospitalId =
//         message.hospital_id ||
//         message.hospitalId ||
//         message.assistantOverrides?.variableValues?.hospital_id ||
//         callData?.hospital_id ||
//         null;

//     if (!hospitalId && message.assistantOverrides?.variableValues) {
//         const vars = message.assistantOverrides.variableValues;
//         hospitalId = vars.hospital_id || vars.hospitalId || null;
//     }

//     if (hospitalId && typeof hospitalId === 'string') {
//         hospitalId = parseInt(hospitalId, 10);
//     }

//     // ─── Fallback: get hospital_id from ezy_vet_pet_owner ────────────────
//     if (!hospitalId && fromNumber) {
//         try {
//             const normalizedPhone = normalizePhoneForLookup(fromNumber);
//             const ownerResult = await executeQuery(
//                 `SELECT hospital_id FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
//                 [normalizedPhone]
//             );
//             if (ownerResult.rows.length > 0 && ownerResult.rows[0].hospital_id) {
//                 hospitalId = ownerResult.rows[0].hospital_id;
//                 console.log(`   ✅ Found hospital_id ${hospitalId} from ezy_vet_pet_owner for phone ${normalizedPhone}`);
//             }
//         } catch (err) { /* ignore */ }
//     }

//     // ─── Fallback: get hospital_id from ezy_vet_appointments ─────────────
//     if (!hospitalId && vapiCallId) {
//         try {
//             const aptResult = await executeQuery(
//                 `SELECT hospital_id FROM ezy_vet_appointments WHERE call_sid = $1 LIMIT 1`,
//                 [vapiCallId]
//             );
//             if (aptResult.rows.length > 0 && aptResult.rows[0].hospital_id) {
//                 hospitalId = aptResult.rows[0].hospital_id;
//                 console.log(`   ✅ Found hospital_id ${hospitalId} from ezy_vet_appointments for call ${vapiCallId}`);
//             }
//         } catch (err) { /* ignore */ }
//     }

//     console.log(`\n${'='.repeat(60)}`);
//     console.log(`📞 CALL ENDED`);
//     console.log(`${'='.repeat(60)}`);
//     console.log(`   Vapi Call ID : ${vapiCallId}`);
//     console.log(`   From         : ${fromNumber}`);
//     console.log(`   Duration     : ${duration} seconds`);
//     console.log(`   Recording    : ${recordingUrl}`);
//     console.log(`   Hospital ID  : ${hospitalId || 'Not provided'}`);

//     if (structuredData) {
//         console.log(`\n📋 STRUCTURED DATA:`);
//         console.log(JSON.stringify(structuredData, null, 2));
//     }
//     if (summary) {
//         console.log(`\n📊 SUMMARY:`);
//         console.log(summary);
//     }
//     console.log(`\n📝 TRANSCRIPT:`);
//     console.log(`${'-'.repeat(40)}`);
//     console.log(transcript || 'No transcript available');
//     console.log(`${'-'.repeat(40)}`);

//     const dbSid = vapiCallId;
//     let conversationId = null;
//     let callId = null;           // UUID from ezy_vet_calls
//     let petOwnerId = null;
//     let petOwnerName = null;
//     let registeredNumber = null;
//     let appointmentType = null;
//     let appointmentId = null;

//     if (dbSid) {
//         try {
//             // ─── Step 1: Find or create conversation ──────────────────
//             const num1 = fromNumber < toNumber ? fromNumber : toNumber;
//             const num2 = fromNumber < toNumber ? toNumber : fromNumber;

//             const convResult = await executeQuery(
//                 `SELECT id FROM ezy_vet_conversations WHERE number_1 = $1 AND number_2 = $2`,
//                 [num1, num2]
//             );

//             if (convResult.rows.length > 0) {
//                 conversationId = convResult.rows[0].id;
//                 console.log(`   Existing conversation: ${conversationId}`);
//             } else {
//                 const newConv = await executeQuery(
//                     `INSERT INTO ezy_vet_conversations (from_number, to_number, hospital_id)
//                      VALUES ($1, $2, $3) RETURNING id`,
//                     [fromNumber, toNumber, hospitalId || null]
//                 );
//                 conversationId = newConv.rows[0].id;
//                 console.log(`   New conversation created: ${conversationId}`);
//             }

//             // ─── Step 2: Create call record ──────────────────────────
//             const callUuid = uuidv4();
//             const callInsert = await executeQuery(
//                 `INSERT INTO ezy_vet_calls 
//                  (id, call_sid, conversation_id, call_status, from_number, to_number, direction, hospital_id)
//                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//                  RETURNING id`,
//                 [
//                     callUuid,
//                     dbSid,
//                     conversationId,
//                     'completed',
//                     fromNumber || null,
//                     toNumber || null,
//                     'inbound',
//                     hospitalId || null
//                 ]
//             );
//             callId = callInsert.rows[0].id;
//             console.log(`   Call created with UUID: ${callId} (hospital_id: ${hospitalId || 'NULL'})`);

//             // ─── Step 3: Save transcript/recording ────────────────────
        

//             // ─── Step 3: Save transcript/recording with hospital_id ──────────────
// if (transcript && transcript.trim().length > 0) {
//     await executeQuery(
//         `INSERT INTO ezy_vet_transcriptions (call_id, transcription_text, recording_url, transcription_status, hospital_id)
//          VALUES ($1, $2, $3, 'completed', $4)`,
//         [callId, transcript, recordingUrl || null, hospitalId || null]
//     );
//     console.log(`   ✅ Transcript saved to ezy_vet_transcriptions with hospital_id: ${hospitalId || 'NULL'}`);
// } else if (recordingUrl) {
//     await executeQuery(
//         `INSERT INTO ezy_vet_transcriptions (call_id, recording_url, transcription_status, hospital_id)
//          VALUES ($1, $2, 'completed', $3)`,
//         [callId, recordingUrl, hospitalId || null]
//     );
//     console.log(`   ✅ Recording URL saved to ezy_vet_transcriptions with hospital_id: ${hospitalId || 'NULL'}`);
// }

//             // ─── Step 4: Lookup pet owner ─────────────────────────────
//             if (fromNumber) {
//                 const normalizedPhone = normalizePhoneForLookup(fromNumber);
//                 let ownerResult = await executeQuery(
//                     `SELECT id, name, phone, email FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
//                     [normalizedPhone]
//                 );
//                 // Also try with the original raw number if not found
//                 if (ownerResult.rows.length === 0 && normalizedPhone !== fromNumber) {
//                     ownerResult = await executeQuery(
//                         `SELECT id, name, phone, email FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
//                         [fromNumber]
//                     );
//                 }
//                 if (ownerResult.rows.length > 0) {
//                     petOwnerId = ownerResult.rows[0].id;
//                     petOwnerName = ownerResult.rows[0].name;
//                     registeredNumber = ownerResult.rows[0].phone;
//                     console.log(`   ✅ Found pet owner: ${petOwnerName} (ID ${petOwnerId}, phone ${registeredNumber})`);
//                 } else {
//                     console.log(`   ⚠️ No pet owner found for number: ${fromNumber}`);
//                 }
//             }

//             // ─── Step 5: Lookup appointment ───────────────────────────
//             if (dbSid) {
//                 const aptResult = await executeQuery(
//                     `SELECT id, appointment_type, pet_owner_id, pet_id FROM ezy_vet_appointments 
//                      WHERE call_sid = $1 
//                      ORDER BY created_at DESC LIMIT 1`,
//                     [dbSid]
//                 );
//                 if (aptResult.rows.length > 0) {
//                     appointmentId = aptResult.rows[0].id;
//                     appointmentType = aptResult.rows[0].appointment_type;
//                     if (!petOwnerId && aptResult.rows[0].pet_owner_id) {
//                         petOwnerId = aptResult.rows[0].pet_owner_id;
//                         const ownerResult = await executeQuery(
//                             `SELECT name, phone FROM ezy_vet_pet_owner WHERE id = $1`,
//                             [petOwnerId]
//                         );
//                         if (ownerResult.rows.length > 0) {
//                             petOwnerName = ownerResult.rows[0].name;
//                             registeredNumber = ownerResult.rows[0].phone;
//                         }
//                     }
//                     console.log(`   ✅ Found appointment type from call_sid: ${appointmentType}`);
//                 }
//             }

//             // ─── Step 6: Insert into ezy_vet_call_logs ────────────────
//             await executeQuery(
//                 `INSERT INTO ezy_vet_call_logs 
//                  (call_sid, caller_phone, caller_name, pet_owner_id, appointment_id, 
//                   call_duration, call_status, transcription, summary, recording_url, 
//                   vapi_call_id, hospital_id, created_at)
//                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
//                  ON CONFLICT (call_sid) DO UPDATE SET
//                    caller_name = EXCLUDED.caller_name,
//                    pet_owner_id = EXCLUDED.pet_owner_id,
//                    appointment_id = EXCLUDED.appointment_id,
//                    call_duration = EXCLUDED.call_duration,
//                    call_status = EXCLUDED.call_status,
//                    transcription = EXCLUDED.transcription,
//                    summary = EXCLUDED.summary,
//                    recording_url = EXCLUDED.recording_url,
//                    updated_at = NOW()`,
//                 [
//                     dbSid,
//                     fromNumber || 'unknown',
//                     petOwnerName || 'Unknown',
//                     petOwnerId || null,
//                     appointmentId || null,
//                     Math.round(duration || 0),
//                     'completed',
//                     transcript || null,
//                     summary || null,
//                     recordingUrl || null,
//                     vapiCallId || null,
//                     hospitalId || null
//                 ]
//             );
//             console.log(`   ✅ ezy_vet_call_logs record saved with hospital_id: ${hospitalId || 'NULL'}`);

//             // ─── Step 7: Send email ───────────────────────────────────
//             if (transcript && transcript.trim().length > 0) {
//                 console.log(`\n📧 SENDING CALL SUMMARY EMAIL TO ADMIN...`);
//                 console.log(`${'-'.repeat(40)}`);

//                 let finalCallerName = petOwnerName || 'Unknown';
//                 if (!finalCallerName || finalCallerName === 'Unknown') {
//                     if (transcript) {
//                         const nameMatch = transcript.match(/Welcome back[, ]+([A-Za-z]+ [A-Za-z]+)/i);
//                         if (nameMatch) finalCallerName = nameMatch[1] || 'Unknown';
//                     }
//                 }

//                 const finalReasonForCall = (appointmentType && appointmentType !== 'null')
//                     ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
//                     : 'Query Purpose';

//                 const finalRegisteredNumber = registeredNumber || null;

//                 try {
//                     // ─── Pass callId as null to avoid foreign key constraint on old calls table ───
//                     const emailResult = await EmailService.sendCallSummaryEmail({
//                         callSid: dbSid,
//                         callId: null,  // ⬅️ Set to null to bypass old foreign key
//                         callerNumber: fromNumber || 'unknown',
//                         callerName: finalCallerName,
//                         reasonForCall: finalReasonForCall,
//                         patientId: petOwnerId,
//                         registeredNumber: finalRegisteredNumber,
//                         appointmentType: appointmentType,
//                         transcription: transcript,
//                         callDuration: duration || 0,
//                         callDate: new Date(),
//                         summary: summary || null,
//                         recordingUrl: recordingUrl || null,
//                         hospitalId: hospitalId  // ⬅️ Pass hospital_id to email service
//                     });

//                     if (emailResult.success) {
//                         console.log(`   ✅ Email sent successfully using professional template!`);
//                         console.log(`   Message ID: ${emailResult.messageId}`);
//                         console.log(`   ✅ Email log saved by EmailService with hospital_id: ${hospitalId || 'NULL'}`);
//                     } else {
//                         console.log(`   ❌ Email failed: ${emailResult.error}`);
//                     }
//                 } catch (emailErr) {
//                     console.error(`   ❌ Email error: ${emailErr.message}`);
//                 }
//                 console.log(`${'-'.repeat(40)}`);
//             } else {
//                 console.log(`\n📧 No transcript available, skipping email.`);
//             }

//         } catch (err) {
//             console.error(`   ❌ Database error: ${err.message}`);
//         }
//     } else {
//         console.log(`   ❌ No valid Vapi Call ID to save with`);
//     }
//     console.log(`${'='.repeat(60)}\n`);
//     return res.json({ received: true });
// };











// // ============================================
// // HANDLE FUNCTION CALLS
// // ============================================


// // ============================================
// // CHECK WORKING HOURS
// // ============================================
// exports._checkWorkingHours = async (args) => {
//   const hospitalId = args.hospital_id || args.hospitalId || 1;

//   const result = await executeQuery(
//     `SELECT day_of_week, is_open, open_time, close_time
//      FROM working_hours
//      WHERE hospital_id = $1 AND appointment_type = 'all'
//      ORDER BY id ASC`,
//     [hospitalId]
//   );

//   const hoursMap = {};
//   result.rows.forEach(row => {
//     const day = row.day_of_week.toLowerCase();
//     hoursMap[day] = {
//       open: row.is_open ? row.open_time : null,
//       close: row.is_open ? row.close_time : null,
//       closed: !row.is_open
//     };
//   });

//   return hoursMap;
// };


// // ============================================
// // FIND PATIENT BY PHONE
// // ============================================


// // ============================================
// // HANDLE FUNCTION CALL API
// // ============================================
// exports.handleFunctionCallAPI = async (req, res) => {
//   const { function: functionName, parameters, toolCallId } = req.body;
//   console.log(`\n🔧 VAPI FUNCTION API CALL: ${functionName}`);

//   try {
//     let result;
//     switch (functionName) {
//       case 'check_working_hours':
//         result = await exports._checkWorkingHours(parameters);
//         break;
//       case 'get_available_slots':
//         result = await exports._getAvailableSlots(parameters);
//         break;
//       case 'find_patient_by_phone':
//         result = await exports._findPatientByPhone(parameters);
//         break;
//       default:
//         return res.status(200).json({
//           results: [{ toolCallId: toolCallId || req.body.id || 'unknown', error: `Unknown function: ${functionName}` }]
//         });
//     }

//     let resultString;
//     if (functionName === 'check_working_hours' && result && typeof result === 'object') {
//       const hours = result;
//       resultString = Object.entries(hours).map(([day, data]) => {
//         if (data.closed) return `${day}: Closed`;
//         return `${day}: ${data.open}-${data.close}`;
//       }).join(", ");
//     } else {
//       resultString = typeof result === 'string' ? result : JSON.stringify(result);
//     }

//     return res.status(200).json({
//       results: [{ toolCallId: toolCallId || req.body.id || 'unknown', result: resultString }]
//     });
//   } catch (error) {
//     console.error(`Function error: ${error.message}`);
//     return res.status(200).json({
//       results: [{ toolCallId: req.body.toolCallId || req.body.id || 'unknown', error: error.message }]
//     });
//   }
// };








const { v4: uuidv4 } = require('uuid');
const LogService = require('../services/logService');
const EmailService = require('../services/emailService');
const appointmentController = require('./appointmentController');
const patientController = require('./patientController');
const slotController = require('./slotController');
const logger = require('../utils/logger');
const { executeQuery } = require('../config/database');
const env = require('../config/env');

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
exports.handleWebhook = async (req, res) => {
  const body = req.body;
  const message = body.message || body;
  const messageType = message.type || body.type;

  console.log(`\n📨 VAPI WEBHOOK: ${messageType}`);

  if (messageType === 'end-of-call-report') {
    await exports._handleEndOfCall(message, res);
    return;
  }

  if (messageType === 'function-call' || messageType === 'tool-call') {
    await exports._handleFunctionCall(message, res);
    return;
  }

  if (messageType === 'status-update') {
    console.log(`📊 Call Status: ${message.status}`);
    return res.json({ received: true });
  }

  if (messageType === 'speech-update') {
    console.log(`💬 [${message.role || 'unknown'}]: ${message.transcript || '...'}`);
    return res.json({ received: true });
  }

  return res.json({ received: true });
};

// ============================================
// HELPER: Normalize phone for lookup
// ============================================
function normalizePhoneForLookup(phone) {
    if (!phone) return phone;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = cleaned.substring(1);
    }
    return cleaned;
}

// ============================================
// HELPER: Extract appointment info from transcript
// ============================================
function extractAppointmentDataFromTranscript(transcript) {
    if (!transcript) return null;

    const datePattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[, ]+([A-Za-z]+) (\d{1,2}),? (\d{4})/i;
    const timePattern = /(\d{1,2}):(\d{2}) (AM|PM)/i;
    const petNamePattern = /appointment for ([A-Za-z ]+?) (?:on|at|for)/i;

    const dateMatch = transcript.match(datePattern);
    const timeMatch = transcript.match(timePattern);
    const petMatch = transcript.match(petNamePattern);

    if (!dateMatch || !timeMatch) return null;

    const monthNames = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    };
    const month = dateMatch[2].toLowerCase();
    const day = parseInt(dateMatch[3], 10);
    const year = parseInt(dateMatch[4], 10);

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const dateObj = new Date(year, monthNames[month] - 1, day);
    const formattedDate = dateObj.toISOString().split('T')[0];
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    let petName = null;
    if (petMatch) {
        petName = petMatch[1].trim();
    }

    return {
        date: formattedDate,
        time: formattedTime,
        dateObj: dateObj,
        petName: petName
    };
}

// ============================================
// HELPER: Find appointment by transcript data
// ============================================
async function findAppointmentByTranscript(transcript, hospitalId) {
    const extracted = extractAppointmentDataFromTranscript(transcript);
    if (!extracted) return null;

    let query = `
        SELECT id, appointment_type, pet_owner_id, pet_id, date, time, ezy_vet_appointment_type_id
        FROM ezy_vet_appointments
        WHERE hospital_id = $1
          AND date = $2
          AND time = $3
          AND status != 'Cancelled'
          AND ezy_vet_appointment_active = 'true'
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const params = [hospitalId, extracted.date, extracted.time];

    try {
        const result = await executeQuery(query, params);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
    } catch (err) {
        console.log(`   ⚠️ Error in findAppointmentByTranscript: ${err.message}`);
    }
    return null;
}

// ============================================
// _handleEndOfCall – Fully Updated
// ============================================
exports._handleEndOfCall = async (message, res) => {
    const callData = message.call || message.artifact?.call;
    const transcript = message.artifact?.transcript || message.transcript;
    const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
    const vapiCallId = callData?.id || message.call?.id;
    const fromNumber = message.customer?.number || callData?.customer?.number;
    const toNumber = process.env.TWILIO_PHONE_NUMBER || 'unknown';
    const duration = callData?.duration || message.durationSeconds;
    const summary = message.artifact?.summary || message.summary;
    const structuredData = message.artifact?.structuredData || message.structuredData;

    // ─── Extract hospital_id ──────────────────────────────────────────────
    let hospitalId =
        message.hospital_id ||
        message.hospitalId ||
        message.assistantOverrides?.variableValues?.hospital_id ||
        callData?.hospital_id ||
        null;

    if (!hospitalId && message.assistantOverrides?.variableValues) {
        const vars = message.assistantOverrides.variableValues;
        hospitalId = vars.hospital_id || vars.hospitalId || null;
    }

    if (hospitalId && typeof hospitalId === 'string') {
        hospitalId = parseInt(hospitalId, 10);
    }

    // ─── Fallback: get hospital_id from ezy_vet_pet_owner ────────────────
    if (!hospitalId && fromNumber) {
        try {
            const normalizedPhone = normalizePhoneForLookup(fromNumber);
            const ownerResult = await executeQuery(
                `SELECT hospital_id FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
                [normalizedPhone]
            );
            if (ownerResult.rows.length > 0 && ownerResult.rows[0].hospital_id) {
                hospitalId = ownerResult.rows[0].hospital_id;
                console.log(`   ✅ Found hospital_id ${hospitalId} from ezy_vet_pet_owner for phone ${normalizedPhone}`);
            }
        } catch (err) { /* ignore */ }
    }

    // ─── Fallback: get hospital_id from ezy_vet_appointments ─────────────
    if (!hospitalId && vapiCallId) {
        try {
            const aptResult = await executeQuery(
                `SELECT hospital_id FROM ezy_vet_appointments WHERE call_sid = $1 LIMIT 1`,
                [vapiCallId]
            );
            if (aptResult.rows.length > 0 && aptResult.rows[0].hospital_id) {
                hospitalId = aptResult.rows[0].hospital_id;
                console.log(`   ✅ Found hospital_id ${hospitalId} from ezy_vet_appointments for call ${vapiCallId}`);
            }
        } catch (err) { /* ignore */ }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📞 CALL ENDED`);
    console.log(`${'='.repeat(60)}`);
    console.log(`   Vapi Call ID : ${vapiCallId}`);
    console.log(`   From         : ${fromNumber}`);
    console.log(`   Duration     : ${duration} seconds`);
    console.log(`   Recording    : ${recordingUrl}`);
    console.log(`   Hospital ID  : ${hospitalId || 'Not provided'}`);

    if (structuredData) {
        console.log(`\n📋 STRUCTURED DATA:`);
        console.log(JSON.stringify(structuredData, null, 2));
    }
    if (summary) {
        console.log(`\n📊 SUMMARY:`);
        console.log(summary);
    }
    console.log(`\n📝 TRANSCRIPT:`);
    console.log(`${'-'.repeat(40)}`);
    console.log(transcript || 'No transcript available');
    console.log(`${'-'.repeat(40)}`);

    const dbSid = vapiCallId;
    let conversationId = null;
    let callId = null;
    let petOwnerId = null;
    let petOwnerName = null;
    let petOwnerEmail = null;
    let registeredNumber = null;
    let appointmentType = null;
    let appointmentId = null;
    let appointmentBooked = false;
    let appointmentDetails = null;

    if (dbSid) {
        try {
            // ─── Step 1: Find or create conversation ──────────────────
            const num1 = fromNumber < toNumber ? fromNumber : toNumber;
            const num2 = fromNumber < toNumber ? toNumber : fromNumber;

            const convResult = await executeQuery(
                `SELECT id FROM ezy_vet_conversations WHERE number_1 = $1 AND number_2 = $2`,
                [num1, num2]
            );

            if (convResult.rows.length > 0) {
                conversationId = convResult.rows[0].id;
                console.log(`   Existing conversation: ${conversationId}`);
            } else {
                const newConv = await executeQuery(
                    `INSERT INTO ezy_vet_conversations (from_number, to_number, hospital_id)
                     VALUES ($1, $2, $3) RETURNING id`,
                    [fromNumber, toNumber, hospitalId || null]
                );
                conversationId = newConv.rows[0].id;
                console.log(`   New conversation created: ${conversationId}`);
            }

            // ─── Step 2: Create call record ──────────────────────────
            const callUuid = uuidv4();
            const callInsert = await executeQuery(
                `INSERT INTO ezy_vet_calls 
                 (id, call_sid, conversation_id, call_status, from_number, to_number, direction, hospital_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id`,
                [
                    callUuid,
                    dbSid,
                    conversationId,
                    'completed',
                    fromNumber || null,
                    toNumber || null,
                    'inbound',
                    hospitalId || null
                ]
            );
            callId = callInsert.rows[0].id;
            console.log(`   Call created with UUID: ${callId} (hospital_id: ${hospitalId || 'NULL'})`);

            // ─── Step 3: Save transcript/recording ────────────────────
            if (transcript && transcript.trim().length > 0) {
                await executeQuery(
                    `INSERT INTO ezy_vet_transcriptions (call_id, transcription_text, recording_url, transcription_status, hospital_id)
                     VALUES ($1, $2, $3, 'completed', $4)`,
                    [callId, transcript, recordingUrl || null, hospitalId || null]
                );
                console.log(`   ✅ Transcript saved to ezy_vet_transcriptions with hospital_id: ${hospitalId || 'NULL'}`);
            } else if (recordingUrl) {
                await executeQuery(
                    `INSERT INTO ezy_vet_transcriptions (call_id, recording_url, transcription_status, hospital_id)
                     VALUES ($1, $2, 'completed', $3)`,
                    [callId, recordingUrl, hospitalId || null]
                );
                console.log(`   ✅ Recording URL saved to ezy_vet_transcriptions with hospital_id: ${hospitalId || 'NULL'}`);
            }

            // ─── Step 4: Lookup pet owner (by caller's number) ──────
            if (fromNumber) {
                const normalizedPhone = normalizePhoneForLookup(fromNumber);
                let ownerResult = await executeQuery(
                    `SELECT id, name, phone, email FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
                    [normalizedPhone]
                );
                if (ownerResult.rows.length === 0 && normalizedPhone !== fromNumber) {
                    ownerResult = await executeQuery(
                        `SELECT id, name, phone, email FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
                        [fromNumber]
                    );
                }
                if (ownerResult.rows.length > 0) {
                    petOwnerId = ownerResult.rows[0].id;
                    petOwnerName = ownerResult.rows[0].name;
                    petOwnerEmail = ownerResult.rows[0].email;
                    registeredNumber = ownerResult.rows[0].phone;
                    console.log(`   ✅ Found pet owner: ${petOwnerName} (ID ${petOwnerId}, phone ${registeredNumber}, email ${petOwnerEmail || 'none'})`);
                } else {
                    console.log(`   ⚠️ No pet owner found for number: ${fromNumber}`);
                }
            }

            // ─── Step 5: Lookup appointment ──────────────────────────────
            let aptResult = null;
            if (dbSid) {
                aptResult = await executeQuery(
                    `SELECT id, appointment_type, pet_owner_id, pet_id, date, time, ezy_vet_appointment_type_id
                     FROM ezy_vet_appointments 
                     WHERE call_sid = $1 
                     ORDER BY created_at DESC LIMIT 1`,
                    [dbSid]
                );
                if (aptResult.rows.length > 0) {
                    console.log(`   ✅ Found appointment by call_sid: ID ${aptResult.rows[0].id}`);
                }
            }

            // ─── If no appointment by call_sid, try transcript fallback ──
            if (!aptResult || aptResult.rows.length === 0) {
                console.log(`   ℹ️ No appointment found by call_sid, attempting transcript fallback...`);
                if (transcript && hospitalId) {
                    const fallbackApt = await findAppointmentByTranscript(transcript, hospitalId);
                    if (fallbackApt) {
                        aptResult = { rows: [fallbackApt] };
                        console.log(`   ✅ Found appointment via transcript: ID ${fallbackApt.id}`);
                    } else {
                        console.log(`   ⚠️ No appointment found via transcript fallback.`);
                    }
                } else {
                    console.log(`   ⚠️ Transcript or hospitalId missing for fallback.`);
                }
            }

            // ─── Process appointment if found ──────────────────────────────
            if (aptResult && aptResult.rows.length > 0) {
                const apt = aptResult.rows[0];
                appointmentId = apt.id;
                appointmentType = apt.appointment_type;
                appointmentBooked = true;

                // ─── Override owner with the one from the appointment ─────
                if (apt.pet_owner_id) {
                    const ownerResult = await executeQuery(
                        `SELECT name, phone, email FROM ezy_vet_pet_owner WHERE id = $1`,
                        [apt.pet_owner_id]
                    );
                    if (ownerResult.rows.length > 0) {
                        petOwnerId = apt.pet_owner_id;
                        petOwnerName = ownerResult.rows[0].name;
                        petOwnerEmail = ownerResult.rows[0].email;
                        registeredNumber = ownerResult.rows[0].phone;
                        console.log(`   ✅ Owner from appointment: ${petOwnerName} (${petOwnerEmail || 'no email'})`);
                    }
                }

                // ─── Fetch pet name ──────────────────────────────────────
                let petName = 'Unknown';
                if (apt.pet_id) {
                    const petResult = await executeQuery(
                        `SELECT pet_name FROM ezy_vet_pets WHERE id = $1`,
                        [apt.pet_id]
                    );
                    if (petResult.rows.length > 0) {
                        petName = petResult.rows[0].pet_name;
                    }
                }

                // ─── Format date and time as strings ────────────────────
                const formattedDate = apt.date instanceof Date
                    ? apt.date.toISOString().split('T')[0]
                    : apt.date;
                const formattedTime = typeof apt.time === 'string'
                    ? apt.time
                    : (apt.time ? apt.time.toString() : '');

                appointmentDetails = {
                    petName: petName,
                    date: formattedDate,
                    time: formattedTime,
                    appointmentType: apt.appointment_type || 'Consult',
                    doctorName: 'Doctor', // placeholder – could be improved
                    appointmentId: apt.id
                };
                console.log(`   ✅ Appointment booked: ${petName} on ${formattedDate} at ${formattedTime}`);
            } else {
                console.log(`   ℹ️ No appointment found for this call.`);
            }

            // ─── Step 6: Insert into ezy_vet_call_logs ────────────────
            await executeQuery(
                `INSERT INTO ezy_vet_call_logs 
                 (call_sid, caller_phone, caller_name, pet_owner_id, appointment_id, 
                  call_duration, call_status, transcription, summary, recording_url, 
                  vapi_call_id, hospital_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
                 ON CONFLICT (call_sid) DO UPDATE SET
                   caller_name = EXCLUDED.caller_name,
                   pet_owner_id = EXCLUDED.pet_owner_id,
                   appointment_id = EXCLUDED.appointment_id,
                   call_duration = EXCLUDED.call_duration,
                   call_status = EXCLUDED.call_status,
                   transcription = EXCLUDED.transcription,
                   summary = EXCLUDED.summary,
                   recording_url = EXCLUDED.recording_url,
                   updated_at = NOW()`,
                [
                    dbSid,
                    fromNumber || 'unknown',
                    petOwnerName || 'Unknown',
                    petOwnerId || null,
                    appointmentId || null,
                    Math.round(duration || 0),
                    'completed',
                    transcript || null,
                    summary || null,
                    recordingUrl || null,
                    vapiCallId || null,
                    hospitalId || null
                ]
            );
            console.log(`   ✅ ezy_vet_call_logs record saved with hospital_id: ${hospitalId || 'NULL'}`);

            // ─── Step 7: Send email ───────────────────────────────────
            if (transcript && transcript.trim().length > 0) {
                console.log(`\n📧 SENDING CALL SUMMARY EMAIL TO ADMIN...`);
                console.log(`${'-'.repeat(40)}`);

                let finalCallerName = petOwnerName || 'Unknown';
                if (!finalCallerName || finalCallerName === 'Unknown') {
                    if (transcript) {
                        const nameMatch = transcript.match(/Welcome back[, ]+([A-Za-z]+ [A-Za-z]+)/i);
                        if (nameMatch) finalCallerName = nameMatch[1] || 'Unknown';
                    }
                }

                const finalReasonForCall = (appointmentType && appointmentType !== 'null')
                    ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
                    : 'Query Purpose';

                const finalRegisteredNumber = registeredNumber || null;

                try {
                    const emailData = {
                        callSid: dbSid,
                        callId: null,
                        callerNumber: fromNumber || 'unknown',
                        callerName: finalCallerName,
                        reasonForCall: finalReasonForCall,
                        patientId: petOwnerId,
                        registeredNumber: finalRegisteredNumber,
                        appointmentType: appointmentType,
                        transcription: transcript,
                        callDuration: duration || 0,
                        callDate: new Date(),
                        summary: summary || null,
                        recordingUrl: recordingUrl || null,
                        hospitalId: hospitalId,
                        appointmentBooked: appointmentBooked,
                        appointmentDetails: appointmentDetails,
                        callerEmail: petOwnerEmail
                    };

                    const emailResult = await EmailService.sendCallSummaryEmail(emailData);

                    if (emailResult.success) {
                        console.log(`   ✅ Email sent successfully using professional template!`);
                        console.log(`   Message ID: ${emailResult.messageId}`);
                        console.log(`   ✅ Email log saved by EmailService with hospital_id: ${hospitalId || 'NULL'}`);
                    } else {
                        console.log(`   ❌ Email failed: ${emailResult.error}`);
                    }
                } catch (emailErr) {
                    console.error(`   ❌ Email error: ${emailErr.message}`);
                }
                console.log(`${'-'.repeat(40)}`);
            } else {
                console.log(`\n📧 No transcript available, skipping email.`);
            }

        } catch (err) {
            console.error(`   ❌ Database error: ${err.message}`);
        }
    } else {
        console.log(`   ❌ No valid Vapi Call ID to save with`);
    }
    console.log(`${'='.repeat(60)}\n`);
    return res.json({ received: true });
};

// ============================================
// HANDLE FUNCTION CALLS
// ============================================
exports._checkWorkingHours = async (args) => {
  const hospitalId = args.hospital_id || args.hospitalId || 1;

  const result = await executeQuery(
    `SELECT day_of_week, is_open, open_time, close_time
     FROM working_hours
     WHERE hospital_id = $1 AND appointment_type = 'all'
     ORDER BY id ASC`,
    [hospitalId]
  );

  const hoursMap = {};
  result.rows.forEach(row => {
    const day = row.day_of_week.toLowerCase();
    hoursMap[day] = {
      open: row.is_open ? row.open_time : null,
      close: row.is_open ? row.close_time : null,
      closed: !row.is_open
    };
  });

  return hoursMap;
};

// Placeholders
exports._findPatientByPhone = async (args) => {
  return { found: false };
};

exports._getAvailableSlots = async (args) => {
  return { slots: [] };
};

// ============================================
// HANDLE FUNCTION CALL API
// ============================================
exports.handleFunctionCallAPI = async (req, res) => {
  const { function: functionName, parameters, toolCallId } = req.body;
  console.log(`\n🔧 VAPI FUNCTION API CALL: ${functionName}`);

  try {
    let result;
    switch (functionName) {
      case 'check_working_hours':
        result = await exports._checkWorkingHours(parameters);
        break;
      case 'get_available_slots':
        result = await exports._getAvailableSlots(parameters);
        break;
      case 'find_patient_by_phone':
        result = await exports._findPatientByPhone(parameters);
        break;
      default:
        return res.status(200).json({
          results: [{ toolCallId: toolCallId || req.body.id || 'unknown', error: `Unknown function: ${functionName}` }]
        });
    }

    let resultString;
    if (functionName === 'check_working_hours' && result && typeof result === 'object') {
      const hours = result;
      resultString = Object.entries(hours).map(([day, data]) => {
        if (data.closed) return `${day}: Closed`;
        return `${day}: ${data.open}-${data.close}`;
      }).join(", ");
    } else {
      resultString = typeof result === 'string' ? result : JSON.stringify(result);
    }

    return res.status(200).json({
      results: [{ toolCallId: toolCallId || req.body.id || 'unknown', result: resultString }]
    });
  } catch (error) {
    console.error(`Function error: ${error.message}`);
    return res.status(200).json({
      results: [{ toolCallId: req.body.toolCallId || req.body.id || 'unknown', error: error.message }]
    });
  }
};