
// // // src/controllers/vapiController.js
// // const LogService = require('../services/logService');
// // const EmailService = require('../services/emailService');
// // const appointmentController = require('./appointmentController');
// // const patientController = require('./patientController');
// // const slotController = require('./slotController');
// // const logger = require('../utils/logger');
// // const { executeQuery } = require('../config/database');
// // const env = require('../config/env');

// // class VapiController {

// //   // ============================================
// //   // MAIN WEBHOOK HANDLER
// //   // ============================================
// //   static async handleWebhook(req, res) {
// //     const body = req.body;
// //     const message = body.message || body;
// //     const messageType = message.type || body.type;

// //     console.log(`\n📨 VAPI WEBHOOK: ${messageType}`);

// //     if (messageType === 'end-of-call-report') {
// //       await VapiController._handleEndOfCall(message, res);
// //       return;
// //     }

// //     if (messageType === 'function-call' || messageType === 'tool-call') {
// //       await VapiController._handleFunctionCall(message, res);
// //       return;
// //     }

// //     if (messageType === 'status-update') {
// //       console.log(`📊 Call Status: ${message.status}`);
// //       return res.json({ received: true });
// //     }

// //     if (messageType === 'speech-update') {
// //       console.log(`💬 [${message.role || 'unknown'}]: ${message.transcript || '...'}`);
// //       return res.json({ received: true });
// //     }

// //     return res.json({ received: true });
// //   }

// //   // ============================================
// //   // HANDLE END OF CALL – WITH hospital_id
// //   // ============================================
// //   static async _handleEndOfCall(message, res) {
// //     const callData = message.call || message.artifact?.call;
// //     const transcript = message.artifact?.transcript || message.transcript;
// //     const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
// //     const vapiCallId = callData?.id || message.call?.id;
// //     const fromNumber = message.customer?.number || callData?.customer?.number;
// //     const duration = callData?.duration || message.durationSeconds;
// //     const summary = message.artifact?.summary || message.summary;
// //     const structuredData = message.artifact?.structuredData || message.structuredData;

// //     // ============================================
// //     // ✅ EXTRACT hospital_id from webhook payload
// //     // ============================================
// //     let hospitalId =
// //       message.hospital_id ||
// //       message.hospitalId ||
// //       message.assistantOverrides?.variableValues?.hospital_id ||
// //       callData?.hospital_id ||
// //       null;

// //     if (!hospitalId && message.assistantOverrides?.variableValues) {
// //       const vars = message.assistantOverrides.variableValues;
// //       hospitalId = vars.hospital_id || vars.hospitalId || null;
// //     }

// //     // Convert to integer if string
// //     if (hospitalId && typeof hospitalId === 'string') {
// //       hospitalId = parseInt(hospitalId, 10);
// //     }

// //     // Fallback: try to get from patient record (if known)
// //     if (!hospitalId && fromNumber) {
// //       try {
// //         const patientResult = await executeQuery(
// //           `SELECT hospital_id FROM patients WHERE phone = $1 LIMIT 1`,
// //           [fromNumber]
// //         );
// //         if (patientResult.rows.length > 0 && patientResult.rows[0].hospital_id) {
// //           hospitalId = patientResult.rows[0].hospital_id;
// //           console.log(`   ✅ Found hospital_id ${hospitalId} from patient record for phone ${fromNumber}`);
// //         }
// //       } catch (err) { /* ignore */ }
// //     }

// //     // Fallback: try to get from appointment linked to this call
// //     if (!hospitalId && vapiCallId) {
// //       try {
// //         const aptResult = await executeQuery(
// //           `SELECT hospital_id FROM appointments WHERE call_sid = $1 LIMIT 1`,
// //           [vapiCallId]
// //         );
// //         if (aptResult.rows.length > 0 && aptResult.rows[0].hospital_id) {
// //           hospitalId = aptResult.rows[0].hospital_id;
// //           console.log(`   ✅ Found hospital_id ${hospitalId} from appointment for call ${vapiCallId}`);
// //         }
// //       } catch (err) { /* ignore */ }
// //     }

// //     console.log(`\n${'='.repeat(60)}`);
// //     console.log(`📞 CALL ENDED`);
// //     console.log(`${'='.repeat(60)}`);
// //     console.log(`   Vapi Call ID : ${vapiCallId}`);
// //     console.log(`   From         : ${fromNumber}`);
// //     console.log(`   Duration     : ${duration} seconds`);
// //     console.log(`   Recording    : ${recordingUrl}`);
// //     console.log(`   Hospital ID  : ${hospitalId || 'Not provided'}`);

// //     if (structuredData) {
// //       console.log(`\n📋 STRUCTURED DATA:`);
// //       console.log(JSON.stringify(structuredData, null, 2));
// //     }
// //     if (summary) {
// //       console.log(`\n📊 SUMMARY:`);
// //       console.log(summary);
// //     }
// //     console.log(`\n📝 TRANSCRIPT:`);
// //     console.log(`${'-'.repeat(40)}`);
// //     console.log(transcript || 'No transcript available');
// //     console.log(`${'-'.repeat(40)}`);

// //     const dbSid = vapiCallId;
// //     let savedCallId = null;
// //     let patientId = null;
// //     let patientName = null;
// //     let registeredNumber = null;
// //     let appointmentType = null;

// //     if (dbSid) {
// //       try {
// //         let callRecord = await LogService.getCallBySid(dbSid);
// //         if (!callRecord) {
// //           // ✅ Pass hospitalId to createCall
// //           const newCallId = await LogService.createCall({
// //             twilio_call_sid: dbSid,
// //             caller_number: fromNumber || 'unknown',
// //             callee_number: process.env.TWILIO_PHONE_NUMBER,
// //             call_status: 'completed',
// //             vapi_call_id: vapiCallId || null,
// //             call_duration: Math.round(duration || 0),
// //             hospital_id: hospitalId
// //           });
// //           savedCallId = newCallId;
// //           console.log(`   Call created with DB ID: ${newCallId} (hospital_id: ${hospitalId || 'NULL'})`);
// //         } else {
// //           savedCallId = callRecord.id;
// //           console.log(`   Found existing call record: ${callRecord.id}`);
// //         }

// //         // Save transcript/recording
// //         if (transcript && transcript.trim().length > 0) {
// //           await LogService.updateCallWithTranscription(dbSid, transcript, recordingUrl);
// //           console.log(`   ✅ Transcript saved`);
// //         } else if (recordingUrl) {
// //           await LogService.saveRecordingInfo(dbSid, recordingUrl, summary || null, duration);
// //           console.log(`   ✅ Recording URL saved`);
// //         }

// //         if (summary) {
// //           try {
// //             await LogService.updateCall(dbSid, { call_status: 'completed', summary: summary });
// //             console.log(`   ✅ Summary saved`);
// //           } catch (summaryErr) {
// //             console.log(`   ⚠️  Summary save error: ${summaryErr.message}`);
// //           }
// //         } else {
// //           await LogService.updateCall(dbSid, { call_status: 'completed' });
// //         }

// //         // Find patient by phone (unchanged)
// //         if (fromNumber) {
// //           let patientResult = await executeQuery(
// //             `SELECT id, name, phone FROM patients WHERE phone = $1 LIMIT 1`,
// //             [fromNumber]
// //           );
// //           if (patientResult.rows.length === 0 && fromNumber.startsWith('+')) {
// //             const withoutCountry = fromNumber.substring(1);
// //             patientResult = await executeQuery(
// //               `SELECT id, name, phone FROM patients WHERE phone = $1 OR phone LIKE $2 LIMIT 1`,
// //               [withoutCountry, `%${withoutCountry}`]
// //             );
// //           }
// //           if (patientResult.rows.length === 0 && fromNumber.length > 10) {
// //             const last10Digits = fromNumber.slice(-10);
// //             patientResult = await executeQuery(
// //               `SELECT id, name, phone FROM patients WHERE phone LIKE $1 LIMIT 1`,
// //               [`%${last10Digits}`]
// //             );
// //           }
// //           if (patientResult.rows.length > 0) {
// //             patientId = patientResult.rows[0].id;
// //             patientName = patientResult.rows[0].name;
// //             registeredNumber = patientResult.rows[0].phone;
// //             console.log(`   ✅ Found patient: ${patientName} (ID ${patientId}, phone ${registeredNumber})`);
// //           } else {
// //             console.log(`   ⚠️ No patient found for number: ${fromNumber}`);
// //           }
// //         }

// //         // Get appointment details (unchanged)
// //         if (dbSid) {
// //           const aptResult = await executeQuery(
// //             `SELECT appointment_type, patient_id FROM appointments 
// //              WHERE call_sid = $1 
// //              ORDER BY created_at DESC LIMIT 1`,
// //             [dbSid]
// //           );
// //           if (aptResult.rows.length > 0) {
// //             appointmentType = aptResult.rows[0].appointment_type;
// //             const aptPatientId = aptResult.rows[0].patient_id;
// //             if (!patientId && aptPatientId) {
// //               const patResult = await executeQuery(
// //                 `SELECT id, name, phone FROM patients WHERE id = $1 LIMIT 1`,
// //                 [aptPatientId]
// //               );
// //               if (patResult.rows.length > 0) {
// //                 patientId = patResult.rows[0].id;
// //                 patientName = patResult.rows[0].name;
// //                 registeredNumber = patResult.rows[0].phone;
// //                 console.log(`   ✅ Found patient from appointment: ${patientName} (ID ${patientId})`);
// //               }
// //             }
// //             console.log(`   ✅ Found appointment type from call_sid: ${appointmentType}`);
// //           }
// //         }

// //         // ============================================
// //         // ✅ Insert into call_logs WITH hospital_id
// //         // ============================================
// //         await executeQuery(
// //           `INSERT INTO call_logs (call_sid, caller_phone, patient_id, call_duration, call_status, transcription, summary, recording_url, vapi_call_id, hospital_id, created_at)
// //            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
// //            ON CONFLICT (call_sid) DO UPDATE SET
// //              transcription = EXCLUDED.transcription,
// //              summary = EXCLUDED.summary,
// //              hospital_id = EXCLUDED.hospital_id`,
// //           [
// //             dbSid,
// //             fromNumber || 'unknown',
// //             patientId,
// //             Math.round(duration || 0),
// //             'completed',
// //             transcript || null,
// //             summary || null,
// //             recordingUrl || null,
// //             vapiCallId || null,
// //             hospitalId
// //           ]
// //         );
// //         console.log(`   ✅ call_logs record saved with hospital_id: ${hospitalId || 'NULL'}`);
// //         console.log(`   ✅ Call marked as completed`);

// //         // ============================================
// //         // ✅ Send email WITH hospital_id
// //         // ============================================
// //         if (transcript && transcript.trim().length > 0) {
// //           console.log(`\n📧 SENDING CALL SUMMARY EMAIL TO ADMIN...`);
// //           console.log(`${'-'.repeat(40)}`);

// //           let finalCallerName = 'Unknown';
// //           if (appointmentType && appointmentType !== 'null' && patientName) {
// //             finalCallerName = patientName;
// //           } else {
// //             if (transcript) {
// //               const nameMatch = transcript.match(/Welcome back[, ]+([A-Za-z]+ [A-Za-z]+)/i);
// //               if (nameMatch) finalCallerName = nameMatch[1] || 'Unknown';
// //             }
// //           }

// //           const finalReasonForCall = (appointmentType && appointmentType !== 'null')
// //             ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
// //             : 'Query Purpose';

// //           const finalRegisteredNumber = (appointmentType && appointmentType !== 'null') ? (registeredNumber || null) : null;
// //           const finalPatientId = (appointmentType && appointmentType !== 'null') ? patientId : null;

// //           try {
// //             const emailResult = await EmailService.sendCallSummaryEmail({
// //               callSid: dbSid,
// //               callId: savedCallId,
// //               callerNumber: fromNumber || 'unknown',
// //               callerName: finalCallerName,
// //               reasonForCall: finalReasonForCall,
// //               patientId: finalPatientId,
// //               registeredNumber: finalRegisteredNumber,
// //               appointmentType: appointmentType,
// //               transcription: transcript,
// //               callDuration: duration || 0,
// //               callDate: new Date(),
// //               summary: summary || null,
// //               recordingUrl: recordingUrl || null,
// //               hospitalId: hospitalId   // ✅ passed to EmailService
// //             });

// //             if (emailResult.success) {
// //               console.log(`   ✅ Email sent successfully using professional template!`);
// //               console.log(`   Message ID: ${emailResult.messageId}`);
// //               console.log(`   ✅ Email log saved by EmailService with hospital_id: ${hospitalId || 'NULL'}`);
// //               console.log(`   ✅ Registered number: ${finalRegisteredNumber || 'NULL'}`);
// //               console.log(`   ✅ Appointment type: ${appointmentType || 'NULL'}`);
// //             } else {
// //               console.log(`   ❌ Email failed: ${emailResult.error}`);
// //             }
// //           } catch (emailErr) {
// //             console.error(`   ❌ Email error: ${emailErr.message}`);
// //           }
// //           console.log(`${'-'.repeat(40)}`);
// //         } else {
// //           console.log(`\n📧 No transcript available, skipping email.`);
// //         }

// //       } catch (err) {
// //         console.error(`   ❌ Database error: ${err.message}`);
// //       }
// //     } else {
// //       console.log(`   ❌ No valid Vapi Call ID to save with`);
// //     }
// //     console.log(`${'='.repeat(60)}\n`);
// //     return res.json({ received: true });
// //   }

// //   // ============================================
// //   // HANDLE FUNCTION CALLS (unchanged)
// //   // ============================================
// //   static async _handleFunctionCall(message, res) {
// //     const functionName = message.function?.name || message.name;
// //     const args = message.function?.arguments || message.arguments || {};
// //     const vapiCallId = message.call?.id || message.callId || null;

// //     console.log(`\n🔧 VAPI FUNCTION CALL: ${functionName}`);
// //     console.log(`   Arguments:`, JSON.stringify(args, null, 2));

// //     try {
// //       let result;

// //       switch (functionName) {
// //         case 'check_working_hours':
// //           result = await VapiController._checkWorkingHours(args);
// //           break;
// //         case 'get_available_slots':
// //           result = await VapiController._getAvailableSlots(args);
// //           break;
// //         case 'find_patient_by_phone':
// //           result = await VapiController._findPatientByPhone(args);
// //           break;
// //         case 'book_appointment':
// //           result = await VapiController._bookAppointment({
// //             ...args,
// //             call_sid: vapiCallId
// //           });
// //           break;
// //         case 'get_patient_appointments':
// //           result = await VapiController._getPatientAppointments(args);
// //           break;
// //         case 'cancel_appointment':
// //           result = await VapiController._cancelAppointment(args);
// //           break;
// //         default:
// //           console.log(`   ⚠️  Unknown function: ${functionName}`);
// //           result = { success: false, error: `Unknown function: ${functionName}` };
// //       }

// //       console.log(`   ✅ Result:`, JSON.stringify(result, null, 2).substring(0, 500));
// //       return res.json({ result: result });

// //     } catch (error) {
// //       console.error(`   ❌ Function error: ${error.message}`);
// //       return res.json({ result: { success: false, error: error.message } });
// //     }
// //   }

// //   // ============================================
// //   // ✅ FIXED FUNCTION: check_working_hours
// //   // ============================================
// //   static async _checkWorkingHours(args) {
// //     const hospitalId = args.hospital_id || args.hospitalId || 1;

// //     const result = await executeQuery(
// //       `SELECT day_of_week, is_open, open_time, close_time
// //        FROM working_hours
// //        WHERE hospital_id = $1 AND appointment_type = 'all'
// //        ORDER BY id ASC`,
// //       [hospitalId]
// //     );

// //     const hoursMap = {};
// //     result.rows.forEach(row => {
// //       const day = row.day_of_week.toLowerCase();
// //       hoursMap[day] = {
// //         open: row.is_open ? row.open_time : null,
// //         close: row.is_open ? row.close_time : null,
// //         closed: !row.is_open
// //       };
// //     });

// //     return hoursMap;
// //   }

// //   // ============================================
// //   // REST OF THE METHODS (unchanged)
// //   // ============================================
// //   static async _getAvailableSlots(args) {
// //     const { date, appointment_type } = args;
// //     const req = { query: { date, type: appointment_type } };
// //     let result = null;
// //     const res = { json: (data) => { result = data; }, status: () => res };
// //     await slotController.getAvailableSlots(req, res);
// //     return result?.data || result;
// //   }

// //   static async _findPatientByPhone(args) {
// //     const { phone } = args;
// //     const req = { query: { phone } };
// //     let result = null;
// //     const res = { json: (data) => { result = data; }, status: () => res };
// //     await patientController.lookupByPhone(req, res);
// //     return result?.data || result;
// //   }

// //   static async _bookAppointment(args) {
// //     const {
// //       patient_name,
// //       phone,
// //       email,
// //       is_new_patient,
// //       patient_id,
// //       pet_name,
// //       pet_species,
// //       pet_breed,
// //       pet_gender,
// //       pet_age,
// //       appointment_type,
// //       date,
// //       time,
// //       call_sid
// //     } = args;

// //     const req = {
// //       body: {
// //         patient_name,
// //         phone,
// //         email,
// //         is_new_patient,
// //         patient_id,
// //         pet_name,
// //         pet_species,
// //         pet_breed,
// //         pet_gender,
// //         pet_age,
// //         appointment_type,
// //         date,
// //         time,
// //         call_sid
// //       }
// //     };
// //     let result = null;
// //     const res = { json: (data) => { result = data; }, status: (code) => res };
// //     await appointmentController.bookAppointment(req, res);
// //     return result;
// //   }

// //   static async _getPatientAppointments(args) {
// //     const { phone } = args;
// //     const req = { query: { phone } };
// //     let result = null;
// //     const res = { json: (data) => { result = data; }, status: () => res };
// //     await appointmentController.getPatientAppointments(req, res);
// //     return result?.data || result;
// //   }

// //   static async _cancelAppointment(args) {
// //     const { appointment_id } = args;
// //     const req = { params: { id: appointment_id } };
// //     let result = null;
// //     const res = { json: (data) => { result = data; }, status: (code) => res };
// //     await appointmentController.cancelAppointment(req, res);
// //     return result;
// //   }

// //   static async handleFunctionCallAPI(req, res) {
// //     const { function: functionName, parameters, toolCallId } = req.body;
// //     console.log(`\n🔧 VAPI FUNCTION API CALL: ${functionName}`);

// //     try {
// //       let result;
// //       switch (functionName) {
// //         case 'check_working_hours':
// //           result = await VapiController._checkWorkingHours(parameters);
// //           break;
// //         case 'get_available_slots':
// //           result = await VapiController._getAvailableSlots(parameters);
// //           break;
// //         case 'find_patient_by_phone':
// //           result = await VapiController._findPatientByPhone(parameters);
// //           break;
// //         case 'book_appointment':
// //           result = await VapiController._bookAppointment(parameters);
// //           break;
// //         case 'get_patient_appointments':
// //           result = await VapiController._getPatientAppointments(parameters);
// //           break;
// //         case 'cancel_appointment':
// //           result = await VapiController._cancelAppointment(parameters);
// //           break;
// //         default:
// //           return res.status(200).json({
// //             results: [{ toolCallId: toolCallId || req.body.id || 'unknown', error: `Unknown function: ${functionName}` }]
// //           });
// //       }

// //       let resultString;
// //       if (functionName === 'check_working_hours' && result && typeof result === 'object') {
// //         const hours = result;
// //         resultString = Object.entries(hours).map(([day, data]) => {
// //           if (data.closed) return `${day}: Closed`;
// //           return `${day}: ${data.open}-${data.close}`;
// //         }).join(", ");
// //       } else {
// //         resultString = typeof result === 'string' ? result : JSON.stringify(result);
// //       }

// //       return res.status(200).json({
// //         results: [{ toolCallId: toolCallId || req.body.id || 'unknown', result: resultString }]
// //       });
// //     } catch (error) {
// //       console.error(`Function error: ${error.message}`);
// //       return res.status(200).json({
// //         results: [{ toolCallId: req.body.toolCallId || req.body.id || 'unknown', error: error.message }]
// //       });
// //     }
// //   }

// //   static async health(req, res) {
// //     res.json({
// //       status: 'healthy',
// //       timestamp: new Date().toISOString(),
// //       service: 'VAPI Webhook Controller',
// //       features: {
// //         appointments: true,
// //         patients: true,
// //         slots: true,
// //         google_calendar: !!process.env.GOOGLE_REFRESH_TOKEN,
// //         gmail: !!process.env.GMAIL_CLIENT_ID
// //       }
// //     });
// //   }

// //   static async testFunctionCall(req, res) {
// //     const { functionName, args } = req.body;
// //     console.log(`\n🧪 TEST FUNCTION CALL: ${functionName}`);
// //     try {
// //       const message = { function: { name: functionName, arguments: args }, type: 'function-call' };
// //       let result = null;
// //       const mockRes = { json: (data) => { result = data; }, status: () => mockRes };
// //       await VapiController._handleFunctionCall(message, mockRes);
// //       return res.json({ success: true, test: functionName, result: result });
// //     } catch (error) {
// //       return res.status(500).json({ success: false, error: error.message });
// //     }
// //   }
// // }

// // module.exports = VapiController;






// /////////////////---------edit-----------/////






// // src/controllers/vapiController.js
// const LogService = require('../services/logService');
// const EmailService = require('../services/emailService');
// const appointmentController = require('./appointmentController');
// const patientController = require('./patientController');
// const slotController = require('./slotController');
// const logger = require('../utils/logger');
// const { executeQuery } = require('../config/database');
// const env = require('../config/env');

// class VapiController {

//   // ============================================
//   // MAIN WEBHOOK HANDLER
//   // ============================================
//   static async handleWebhook(req, res) {
//     const body = req.body;
//     const message = body.message || body;
//     const messageType = message.type || body.type;

//     console.log(`\n📨 VAPI WEBHOOK: ${messageType}`);

//     if (messageType === 'end-of-call-report') {
//       await VapiController._handleEndOfCall(message, res);
//       return;
//     }

//     if (messageType === 'function-call' || messageType === 'tool-call') {
//       await VapiController._handleFunctionCall(message, res);
//       return;
//     }

//     if (messageType === 'status-update') {
//       console.log(`📊 Call Status: ${message.status}`);
//       return res.json({ received: true });
//     }

//     if (messageType === 'speech-update') {
//       console.log(`💬 [${message.role || 'unknown'}]: ${message.transcript || '...'}`);
//       return res.json({ received: true });
//     }

//     return res.json({ received: true });
//   }

//   // ============================================
//   // HANDLE END OF CALL – WITH hospital_id
//   // ============================================
//   static async _handleEndOfCall(message, res) {
//     const callData = message.call || message.artifact?.call;
//     const transcript = message.artifact?.transcript || message.transcript;
//     const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
//     const vapiCallId = callData?.id || message.call?.id;
//     const fromNumber = message.customer?.number || callData?.customer?.number;
//     const duration = callData?.duration || message.durationSeconds;
//     const summary = message.artifact?.summary || message.summary;
//     const structuredData = message.artifact?.structuredData || message.structuredData;

//     // ============================================
//     // ✅ EXTRACT hospital_id from webhook payload
//     // ============================================
//     let hospitalId =
//       message.hospital_id ||
//       message.hospitalId ||
//       message.assistantOverrides?.variableValues?.hospital_id ||
//       callData?.hospital_id ||
//       null;

//     if (!hospitalId && message.assistantOverrides?.variableValues) {
//       const vars = message.assistantOverrides.variableValues;
//       hospitalId = vars.hospital_id || vars.hospitalId || null;
//     }

//     // Convert to integer if string
//     if (hospitalId && typeof hospitalId === 'string') {
//       hospitalId = parseInt(hospitalId, 10);
//     }

//     // Fallback: try to get from patient record (if known)
//     if (!hospitalId && fromNumber) {
//       try {
//         const patientResult = await executeQuery(
//           `SELECT hospital_id FROM patients WHERE phone = $1 LIMIT 1`,
//           [fromNumber]
//         );
//         if (patientResult.rows.length > 0 && patientResult.rows[0].hospital_id) {
//           hospitalId = patientResult.rows[0].hospital_id;
//           console.log(`   ✅ Found hospital_id ${hospitalId} from patient record for phone ${fromNumber}`);
//         }
//       } catch (err) { /* ignore */ }
//     }

//     // Fallback: try to get from appointment linked to this call
//     if (!hospitalId && vapiCallId) {
//       try {
//         const aptResult = await executeQuery(
//           `SELECT hospital_id FROM appointments WHERE call_sid = $1 LIMIT 1`,
//           [vapiCallId]
//         );
//         if (aptResult.rows.length > 0 && aptResult.rows[0].hospital_id) {
//           hospitalId = aptResult.rows[0].hospital_id;
//           console.log(`   ✅ Found hospital_id ${hospitalId} from appointment for call ${vapiCallId}`);
//         }
//       } catch (err) { /* ignore */ }
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
//       console.log(`\n📋 STRUCTURED DATA:`);
//       console.log(JSON.stringify(structuredData, null, 2));
//     }
//     if (summary) {
//       console.log(`\n📊 SUMMARY:`);
//       console.log(summary);
//     }
//     console.log(`\n📝 TRANSCRIPT:`);
//     console.log(`${'-'.repeat(40)}`);
//     console.log(transcript || 'No transcript available');
//     console.log(`${'-'.repeat(40)}`);

//     const dbSid = vapiCallId;
//     let savedCallId = null;
//     let patientId = null;
//     let patientName = null;
//     let registeredNumber = null;
//     let appointmentType = null;

//     if (dbSid) {
//       try {
//         let callRecord = await LogService.getCallBySid(dbSid);
//         if (!callRecord) {
//           // ✅ Pass hospitalId to createCall
//           const newCallId = await LogService.createCall({
//             twilio_call_sid: dbSid,
//             caller_number: fromNumber || 'unknown',
//             callee_number: process.env.TWILIO_PHONE_NUMBER,
//             call_status: 'completed',
//             vapi_call_id: vapiCallId || null,
//             call_duration: Math.round(duration || 0),
//             hospital_id: hospitalId
//           });
//           savedCallId = newCallId;
//           console.log(`   Call created with DB ID: ${newCallId} (hospital_id: ${hospitalId || 'NULL'})`);
//         } else {
//           savedCallId = callRecord.id;
//           console.log(`   Found existing call record: ${callRecord.id}`);
//         }

//         // Save transcript/recording
//         if (transcript && transcript.trim().length > 0) {
//           await LogService.updateCallWithTranscription(dbSid, transcript, recordingUrl);
//           console.log(`   ✅ Transcript saved`);
//         } else if (recordingUrl) {
//           await LogService.saveRecordingInfo(dbSid, recordingUrl, summary || null, duration);
//           console.log(`   ✅ Recording URL saved`);
//         }

//         if (summary) {
//           try {
//             await LogService.updateCall(dbSid, { call_status: 'completed', summary: summary });
//             console.log(`   ✅ Summary saved`);
//           } catch (summaryErr) {
//             console.log(`   ⚠️  Summary save error: ${summaryErr.message}`);
//           }
//         } else {
//           await LogService.updateCall(dbSid, { call_status: 'completed' });
//         }

//         // Find patient by phone (unchanged)
//         if (fromNumber) {
//           let patientResult = await executeQuery(
//             `SELECT id, name, phone FROM patients WHERE phone = $1 LIMIT 1`,
//             [fromNumber]
//           );
//           if (patientResult.rows.length === 0 && fromNumber.startsWith('+')) {
//             const withoutCountry = fromNumber.substring(1);
//             patientResult = await executeQuery(
//               `SELECT id, name, phone FROM patients WHERE phone = $1 OR phone LIKE $2 LIMIT 1`,
//               [withoutCountry, `%${withoutCountry}`]
//             );
//           }
//           if (patientResult.rows.length === 0 && fromNumber.length > 10) {
//             const last10Digits = fromNumber.slice(-10);
//             patientResult = await executeQuery(
//               `SELECT id, name, phone FROM patients WHERE phone LIKE $1 LIMIT 1`,
//               [`%${last10Digits}`]
//             );
//           }
//           if (patientResult.rows.length > 0) {
//             patientId = patientResult.rows[0].id;
//             patientName = patientResult.rows[0].name;
//             registeredNumber = patientResult.rows[0].phone;
//             console.log(`   ✅ Found patient: ${patientName} (ID ${patientId}, phone ${registeredNumber})`);
//           } else {
//             console.log(`   ⚠️ No patient found for number: ${fromNumber}`);
//           }
//         }

//         // Get appointment details (unchanged)
//         if (dbSid) {
//           const aptResult = await executeQuery(
//             `SELECT appointment_type, patient_id FROM appointments 
//              WHERE call_sid = $1 
//              ORDER BY created_at DESC LIMIT 1`,
//             [dbSid]
//           );
//           if (aptResult.rows.length > 0) {
//             appointmentType = aptResult.rows[0].appointment_type;
//             const aptPatientId = aptResult.rows[0].patient_id;
//             if (!patientId && aptPatientId) {
//               const patResult = await executeQuery(
//                 `SELECT id, name, phone FROM patients WHERE id = $1 LIMIT 1`,
//                 [aptPatientId]
//               );
//               if (patResult.rows.length > 0) {
//                 patientId = patResult.rows[0].id;
//                 patientName = patResult.rows[0].name;
//                 registeredNumber = patResult.rows[0].phone;
//                 console.log(`   ✅ Found patient from appointment: ${patientName} (ID ${patientId})`);
//               }
//             }
//             console.log(`   ✅ Found appointment type from call_sid: ${appointmentType}`);
//           }
//         }

//         // ============================================
//         // ✅ Insert into call_logs WITH hospital_id
//         // ============================================
//         await executeQuery(
//           `INSERT INTO call_logs (call_sid, caller_phone, patient_id, call_duration, call_status, transcription, summary, recording_url, vapi_call_id, hospital_id, created_at)
//            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
//            ON CONFLICT (call_sid) DO UPDATE SET
//              transcription = EXCLUDED.transcription,
//              summary = EXCLUDED.summary,
//              hospital_id = EXCLUDED.hospital_id`,
//           [
//             dbSid,
//             fromNumber || 'unknown',
//             patientId,
//             Math.round(duration || 0),
//             'completed',
//             transcript || null,
//             summary || null,
//             recordingUrl || null,
//             vapiCallId || null,
//             hospitalId
//           ]
//         );
//         console.log(`   ✅ call_logs record saved with hospital_id: ${hospitalId || 'NULL'}`);
//         console.log(`   ✅ Call marked as completed`);

//         // ============================================
//         // ✅ Send email WITH hospital_id
//         // ============================================
//         if (transcript && transcript.trim().length > 0) {
//           console.log(`\n📧 SENDING CALL SUMMARY EMAIL TO ADMIN...`);
//           console.log(`${'-'.repeat(40)}`);

//           let finalCallerName = 'Unknown';
//           if (appointmentType && appointmentType !== 'null' && patientName) {
//             finalCallerName = patientName;
//           } else {
//             if (transcript) {
//               const nameMatch = transcript.match(/Welcome back[, ]+([A-Za-z]+ [A-Za-z]+)/i);
//               if (nameMatch) finalCallerName = nameMatch[1] || 'Unknown';
//             }
//           }

//           const finalReasonForCall = (appointmentType && appointmentType !== 'null')
//             ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
//             : 'Query Purpose';

//           const finalRegisteredNumber = (appointmentType && appointmentType !== 'null') ? (registeredNumber || null) : null;
//           const finalPatientId = (appointmentType && appointmentType !== 'null') ? patientId : null;

//           try {
//             const emailResult = await EmailService.sendCallSummaryEmail({
//               callSid: dbSid,
//               callId: savedCallId,
//               callerNumber: fromNumber || 'unknown',
//               callerName: finalCallerName,
//               reasonForCall: finalReasonForCall,
//               patientId: finalPatientId,
//               registeredNumber: finalRegisteredNumber,
//               appointmentType: appointmentType,
//               transcription: transcript,
//               callDuration: duration || 0,
//               callDate: new Date(),
//               summary: summary || null,
//               recordingUrl: recordingUrl || null,
//               hospitalId: hospitalId   // ✅ passed to EmailService
//             });

//             if (emailResult.success) {
//               console.log(`   ✅ Email sent successfully using professional template!`);
//               console.log(`   Message ID: ${emailResult.messageId}`);
//               console.log(`   ✅ Email log saved by EmailService with hospital_id: ${hospitalId || 'NULL'}`);
//               console.log(`   ✅ Registered number: ${finalRegisteredNumber || 'NULL'}`);
//               console.log(`   ✅ Appointment type: ${appointmentType || 'NULL'}`);
//             } else {
//               console.log(`   ❌ Email failed: ${emailResult.error}`);
//             }
//           } catch (emailErr) {
//             console.error(`   ❌ Email error: ${emailErr.message}`);
//           }
//           console.log(`${'-'.repeat(40)}`);
//         } else {
//           console.log(`\n📧 No transcript available, skipping email.`);
//         }

//       } catch (err) {
//         console.error(`   ❌ Database error: ${err.message}`);
//       }
//     } else {
//       console.log(`   ❌ No valid Vapi Call ID to save with`);
//     }
//     console.log(`${'='.repeat(60)}\n`);
//     return res.json({ received: true });
//   }

//   // ============================================
//   // HANDLE FUNCTION CALLS (unchanged)
//   // ============================================
//   static async _handleFunctionCall(message, res) {
//     const functionName = message.function?.name || message.name;
//     const args = message.function?.arguments || message.arguments || {};
//     const vapiCallId = message.call?.id || message.callId || null;

//     console.log(`\n🔧 VAPI FUNCTION CALL: ${functionName}`);
//     console.log(`   Arguments:`, JSON.stringify(args, null, 2));

//     try {
//       let result;

//       switch (functionName) {
//         case 'check_working_hours':
//           result = await VapiController._checkWorkingHours(args);
//           break;
//         case 'get_available_slots':
//           result = await VapiController._getAvailableSlots(args);
//           break;
//         case 'find_patient_by_phone':
//           result = await VapiController._findPatientByPhone(args);
//           break;
//         case 'book_appointment':
//           result = await VapiController._bookAppointment({
//             ...args,
//             call_sid: vapiCallId
//           });
//           break;
//         case 'get_patient_appointments':
//           result = await VapiController._getPatientAppointments(args);
//           break;
//         case 'cancel_appointment':
//           result = await VapiController._cancelAppointment(args);
//           break;
//         default:
//           console.log(`   ⚠️  Unknown function: ${functionName}`);
//           result = { success: false, error: `Unknown function: ${functionName}` };
//       }

//       console.log(`   ✅ Result:`, JSON.stringify(result, null, 2).substring(0, 500));
//       return res.json({ result: result });

//     } catch (error) {
//       console.error(`   ❌ Function error: ${error.message}`);
//       return res.json({ result: { success: false, error: error.message } });
//     }
//   }

//   // ============================================
//   // ✅ FIXED FUNCTION: check_working_hours
//   // ============================================
//   static async _checkWorkingHours(args) {
//     const hospitalId = args.hospital_id || args.hospitalId || 1;

//     const result = await executeQuery(
//       `SELECT day_of_week, is_open, open_time, close_time
//        FROM working_hours
//        WHERE hospital_id = $1 AND appointment_type = 'all'
//        ORDER BY id ASC`,
//       [hospitalId]
//     );

//     const hoursMap = {};
//     result.rows.forEach(row => {
//       const day = row.day_of_week.toLowerCase();
//       hoursMap[day] = {
//         open: row.is_open ? row.open_time : null,
//         close: row.is_open ? row.close_time : null,
//         closed: !row.is_open
//       };
//     });

//     return hoursMap;
//   }

//   // ============================================
//   // REST OF THE METHODS (unchanged)
//   // ============================================
//   static async _getAvailableSlots(args) {
//     const { date, appointment_type } = args;
//     const req = { query: { date, type: appointment_type } };
//     let result = null;
//     const res = { json: (data) => { result = data; }, status: () => res };
//     await slotController.getAvailableSlots(req, res);
//     return result?.data || result;
//   }

//   static async _findPatientByPhone(args) {
//     const { phone } = args;
//     const req = { query: { phone } };
//     let result = null;
//     const res = { json: (data) => { result = data; }, status: () => res };
//     await patientController.lookupByPhone(req, res);
//     return result?.data || result;
//   }

  
//   static async _getPatientAppointments(args) {
//     const { phone } = args;
//     const req = { query: { phone } };
//     let result = null;
//     const res = { json: (data) => { result = data; }, status: () => res };
//     await appointmentController.getPatientAppointments(req, res);
//     return result?.data || result;
//   }


//   static async handleFunctionCallAPI(req, res) {
//     const { function: functionName, parameters, toolCallId } = req.body;
//     console.log(`\n🔧 VAPI FUNCTION API CALL: ${functionName}`);

//     try {
//       let result;
//       switch (functionName) {
//         case 'check_working_hours':
//           result = await VapiController._checkWorkingHours(parameters);
//           break;
//         case 'get_available_slots':
//           result = await VapiController._getAvailableSlots(parameters);
//           break;
//         case 'find_patient_by_phone':
//           result = await VapiController._findPatientByPhone(parameters);
          
//           break;
    
//         default:
//           return res.status(200).json({
//             results: [{ toolCallId: toolCallId || req.body.id || 'unknown', error: `Unknown function: ${functionName}` }]
//           });
//       }

//       let resultString;
//       if (functionName === 'check_working_hours' && result && typeof result === 'object') {
//         const hours = result;
//         resultString = Object.entries(hours).map(([day, data]) => {
//           if (data.closed) return `${day}: Closed`;
//           return `${day}: ${data.open}-${data.close}`;
//         }).join(", ");
//       } else {
//         resultString = typeof result === 'string' ? result : JSON.stringify(result);
//       }

//       return res.status(200).json({
//         results: [{ toolCallId: toolCallId || req.body.id || 'unknown', result: resultString }]
//       });
//     } catch (error) {
//       console.error(`Function error: ${error.message}`);
//       return res.status(200).json({
//         results: [{ toolCallId: req.body.toolCallId || req.body.id || 'unknown', error: error.message }]
//       });
//     }
//   }



 
// }

// module.exports = VapiController;

















// src/controllers/vapiController.js
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
// HANDLE END OF CALL – WITH hospital_id
// ============================================
// exports._handleEndOfCall = async (message, res) => {
//   const callData = message.call || message.artifact?.call;
//   const transcript = message.artifact?.transcript || message.transcript;
//   const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
//   const vapiCallId = callData?.id || message.call?.id;
//   const fromNumber = message.customer?.number || callData?.customer?.number;
//   const duration = callData?.duration || message.durationSeconds;
//   const summary = message.artifact?.summary || message.summary;
//   const structuredData = message.artifact?.structuredData || message.structuredData;

//   let hospitalId =
//     message.hospital_id ||
//     message.hospitalId ||
//     message.assistantOverrides?.variableValues?.hospital_id ||
//     callData?.hospital_id ||
//     null;

//   if (!hospitalId && message.assistantOverrides?.variableValues) {
//     const vars = message.assistantOverrides.variableValues;
//     hospitalId = vars.hospital_id || vars.hospitalId || null;
//   }

//   if (hospitalId && typeof hospitalId === 'string') {
//     hospitalId = parseInt(hospitalId, 10);
//   }

//   if (!hospitalId && fromNumber) {
//     try {
//       const patientResult = await executeQuery(
//         `SELECT hospital_id FROM patients WHERE phone = $1 LIMIT 1`,
//         [fromNumber]
//       );
//       if (patientResult.rows.length > 0 && patientResult.rows[0].hospital_id) {
//         hospitalId = patientResult.rows[0].hospital_id;
//         console.log(`   ✅ Found hospital_id ${hospitalId} from patient record for phone ${fromNumber}`);
//       }
//     } catch (err) { /* ignore */ }
//   }

//   if (!hospitalId && vapiCallId) {
//     try {
//       const aptResult = await executeQuery(
//         `SELECT hospital_id FROM appointments WHERE call_sid = $1 LIMIT 1`,
//         [vapiCallId]
//       );
//       if (aptResult.rows.length > 0 && aptResult.rows[0].hospital_id) {
//         hospitalId = aptResult.rows[0].hospital_id;
//         console.log(`   ✅ Found hospital_id ${hospitalId} from appointment for call ${vapiCallId}`);
//       }
//     } catch (err) { /* ignore */ }
//   }

//   console.log(`\n${'='.repeat(60)}`);
//   console.log(`📞 CALL ENDED`);
//   console.log(`${'='.repeat(60)}`);
//   console.log(`   Vapi Call ID : ${vapiCallId}`);
//   console.log(`   From         : ${fromNumber}`);
//   console.log(`   Duration     : ${duration} seconds`);
//   console.log(`   Recording    : ${recordingUrl}`);
//   console.log(`   Hospital ID  : ${hospitalId || 'Not provided'}`);

//   if (structuredData) {
//     console.log(`\n📋 STRUCTURED DATA:`);
//     console.log(JSON.stringify(structuredData, null, 2));
//   }
//   if (summary) {
//     console.log(`\n📊 SUMMARY:`);
//     console.log(summary);
//   }
//   console.log(`\n📝 TRANSCRIPT:`);
//   console.log(`${'-'.repeat(40)}`);
//   console.log(transcript || 'No transcript available');
//   console.log(`${'-'.repeat(40)}`);

//   const dbSid = vapiCallId;
//   let savedCallId = null;
//   let patientId = null;
//   let patientName = null;
//   let registeredNumber = null;
//   let appointmentType = null;

//   if (dbSid) {
//     try {
//       let callRecord = await LogService.getCallBySid(dbSid);
//       if (!callRecord) {
//         const newCallId = await LogService.createCall({
//           twilio_call_sid: dbSid,
//           caller_number: fromNumber || 'unknown',
//           callee_number: process.env.TWILIO_PHONE_NUMBER,
//           call_status: 'completed',
//           vapi_call_id: vapiCallId || null,
//           call_duration: Math.round(duration || 0),
//           hospital_id: hospitalId
//         });
//         savedCallId = newCallId;
//         console.log(`   Call created with DB ID: ${newCallId} (hospital_id: ${hospitalId || 'NULL'})`);
//       } else {
//         savedCallId = callRecord.id;
//         console.log(`   Found existing call record: ${callRecord.id}`);
//       }

//       if (transcript && transcript.trim().length > 0) {
//         await LogService.updateCallWithTranscription(dbSid, transcript, recordingUrl);
//         console.log(`   ✅ Transcript saved`);
//       } else if (recordingUrl) {
//         await LogService.saveRecordingInfo(dbSid, recordingUrl, summary || null, duration);
//         console.log(`   ✅ Recording URL saved`);
//       }

//       if (summary) {
//         try {
//           await LogService.updateCall(dbSid, { call_status: 'completed', summary: summary });
//           console.log(`   ✅ Summary saved`);
//         } catch (summaryErr) {
//           console.log(`   ⚠️  Summary save error: ${summaryErr.message}`);
//         }
//       } else {
//         await LogService.updateCall(dbSid, { call_status: 'completed' });
//       }

//       if (fromNumber) {
//         let patientResult = await executeQuery(
//           `SELECT id, name, phone FROM patients WHERE phone = $1 LIMIT 1`,
//           [fromNumber]
//         );
//         if (patientResult.rows.length === 0 && fromNumber.startsWith('+')) {
//           const withoutCountry = fromNumber.substring(1);
//           patientResult = await executeQuery(
//             `SELECT id, name, phone FROM patients WHERE phone = $1 OR phone LIKE $2 LIMIT 1`,
//             [withoutCountry, `%${withoutCountry}`]
//           );
//         }
//         if (patientResult.rows.length === 0 && fromNumber.length > 10) {
//           const last10Digits = fromNumber.slice(-10);
//           patientResult = await executeQuery(
//             `SELECT id, name, phone FROM patients WHERE phone LIKE $1 LIMIT 1`,
//             [`%${last10Digits}`]
//           );
//         }
//         if (patientResult.rows.length > 0) {
//           patientId = patientResult.rows[0].id;
//           patientName = patientResult.rows[0].name;
//           registeredNumber = patientResult.rows[0].phone;
//           console.log(`   ✅ Found patient: ${patientName} (ID ${patientId}, phone ${registeredNumber})`);
//         } else {
//           console.log(`   ⚠️ No patient found for number: ${fromNumber}`);
//         }
//       }

//       if (dbSid) {
//         const aptResult = await executeQuery(
//           `SELECT appointment_type, patient_id FROM appointments 
//            WHERE call_sid = $1 
//            ORDER BY created_at DESC LIMIT 1`,
//           [dbSid]
//         );
//         if (aptResult.rows.length > 0) {
//           appointmentType = aptResult.rows[0].appointment_type;
//           const aptPatientId = aptResult.rows[0].patient_id;
//           if (!patientId && aptPatientId) {
//             const patResult = await executeQuery(
//               `SELECT id, name, phone FROM patients WHERE id = $1 LIMIT 1`,
//               [aptPatientId]
//             );
//             if (patResult.rows.length > 0) {
//               patientId = patResult.rows[0].id;
//               patientName = patResult.rows[0].name;
//               registeredNumber = patResult.rows[0].phone;
//               console.log(`   ✅ Found patient from appointment: ${patientName} (ID ${patientId})`);
//             }
//           }
//           console.log(`   ✅ Found appointment type from call_sid: ${appointmentType}`);
//         }
//       }

//       await executeQuery(
//         `INSERT INTO call_logs (call_sid, caller_phone, patient_id, call_duration, call_status, transcription, summary, recording_url, vapi_call_id, hospital_id, created_at)
//          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
//          ON CONFLICT (call_sid) DO UPDATE SET
//            transcription = EXCLUDED.transcription,
//            summary = EXCLUDED.summary,
//            hospital_id = EXCLUDED.hospital_id`,
//         [
//           dbSid,
//           fromNumber || 'unknown',
//           patientId,
//           Math.round(duration || 0),
//           'completed',
//           transcript || null,
//           summary || null,
//           recordingUrl || null,
//           vapiCallId || null,
//           hospitalId
//         ]
//       );
//       console.log(`   ✅ call_logs record saved with hospital_id: ${hospitalId || 'NULL'}`);
//       console.log(`   ✅ Call marked as completed`);

//       if (transcript && transcript.trim().length > 0) {
//         console.log(`\n📧 SENDING CALL SUMMARY EMAIL TO ADMIN...`);
//         console.log(`${'-'.repeat(40)}`);

//         let finalCallerName = 'Unknown';
//         if (appointmentType && appointmentType !== 'null' && patientName) {
//           finalCallerName = patientName;
//         } else {
//           if (transcript) {
//             const nameMatch = transcript.match(/Welcome back[, ]+([A-Za-z]+ [A-Za-z]+)/i);
//             if (nameMatch) finalCallerName = nameMatch[1] || 'Unknown';
//           }
//         }

//         const finalReasonForCall = (appointmentType && appointmentType !== 'null')
//           ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
//           : 'Query Purpose';

//         const finalRegisteredNumber = (appointmentType && appointmentType !== 'null') ? (registeredNumber || null) : null;
//         const finalPatientId = (appointmentType && appointmentType !== 'null') ? patientId : null;

//         try {
//           const emailResult = await EmailService.sendCallSummaryEmail({
//             callSid: dbSid,
//             callId: savedCallId,
//             callerNumber: fromNumber || 'unknown',
//             callerName: finalCallerName,
//             reasonForCall: finalReasonForCall,
//             patientId: finalPatientId,
//             registeredNumber: finalRegisteredNumber,
//             appointmentType: appointmentType,
//             transcription: transcript,
//             callDuration: duration || 0,
//             callDate: new Date(),
//             summary: summary || null,
//             recordingUrl: recordingUrl || null,
//             hospitalId: hospitalId
//           });

//           if (emailResult.success) {
//             console.log(`   ✅ Email sent successfully using professional template!`);
//             console.log(`   Message ID: ${emailResult.messageId}`);
//             console.log(`   ✅ Email log saved by EmailService with hospital_id: ${hospitalId || 'NULL'}`);
//             console.log(`   ✅ Registered number: ${finalRegisteredNumber || 'NULL'}`);
//             console.log(`   ✅ Appointment type: ${appointmentType || 'NULL'}`);
//           } else {
//             console.log(`   ❌ Email failed: ${emailResult.error}`);
//           }
//         } catch (emailErr) {
//           console.error(`   ❌ Email error: ${emailErr.message}`);
//         }
//         console.log(`${'-'.repeat(40)}`);
//       } else {
//         console.log(`\n📧 No transcript available, skipping email.`);
//       }

//     } catch (err) {
//       console.error(`   ❌ Database error: ${err.message}`);
//     }
//   } else {
//     console.log(`   ❌ No valid Vapi Call ID to save with`);
//   }
//   console.log(`${'='.repeat(60)}\n`);
//   return res.json({ received: true });
// };






// ─── Add this import at the top of the file ────────────────────────────
const { v4: uuidv4 } = require('uuid');

// ─── FULLY UPDATED _handleEndOfCall ─────────────────────────────────────
// exports._handleEndOfCall = async (message, res) => {
//   const callData = message.call || message.artifact?.call;
//   const transcript = message.artifact?.transcript || message.transcript;
//   const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
//   const vapiCallId = callData?.id || message.call?.id;
//   const fromNumber = message.customer?.number || callData?.customer?.number;
//   const toNumber = process.env.TWILIO_PHONE_NUMBER || 'unknown';
//   const duration = callData?.duration || message.durationSeconds;
//   const summary = message.artifact?.summary || message.summary;
//   const structuredData = message.artifact?.structuredData || message.structuredData;

//   // ─── Extract hospital_id ──────────────────────────────────────────────
//   let hospitalId =
//     message.hospital_id ||
//     message.hospitalId ||
//     message.assistantOverrides?.variableValues?.hospital_id ||
//     callData?.hospital_id ||
//     null;

//   if (!hospitalId && message.assistantOverrides?.variableValues) {
//     const vars = message.assistantOverrides.variableValues;
//     hospitalId = vars.hospital_id || vars.hospitalId || null;
//   }

//   if (hospitalId && typeof hospitalId === 'string') {
//     hospitalId = parseInt(hospitalId, 10);
//   }

//   // ─── Fallback: get hospital_id from ezy_vet_pet_owner ────────────────
//   if (!hospitalId && fromNumber) {
//     try {
//       const ownerResult = await executeQuery(
//         `SELECT hospital_id FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
//         [fromNumber]
//       );
//       if (ownerResult.rows.length > 0 && ownerResult.rows[0].hospital_id) {
//         hospitalId = ownerResult.rows[0].hospital_id;
//         console.log(`   ✅ Found hospital_id ${hospitalId} from ezy_vet_pet_owner for phone ${fromNumber}`);
//       }
//     } catch (err) { /* ignore */ }
//   }

//   // ─── Fallback: get hospital_id from ezy_vet_appointments ─────────────
//   if (!hospitalId && vapiCallId) {
//     try {
//       const aptResult = await executeQuery(
//         `SELECT hospital_id FROM ezy_vet_appointments WHERE call_sid = $1 LIMIT 1`,
//         [vapiCallId]
//       );
//       if (aptResult.rows.length > 0 && aptResult.rows[0].hospital_id) {
//         hospitalId = aptResult.rows[0].hospital_id;
//         console.log(`   ✅ Found hospital_id ${hospitalId} from ezy_vet_appointments for call ${vapiCallId}`);
//       }
//     } catch (err) { /* ignore */ }
//   }

//   console.log(`\n${'='.repeat(60)}`);
//   console.log(`📞 CALL ENDED`);
//   console.log(`${'='.repeat(60)}`);
//   console.log(`   Vapi Call ID : ${vapiCallId}`);
//   console.log(`   From         : ${fromNumber}`);
//   console.log(`   Duration     : ${duration} seconds`);
//   console.log(`   Recording    : ${recordingUrl}`);
//   console.log(`   Hospital ID  : ${hospitalId || 'Not provided'}`);

//   if (structuredData) {
//     console.log(`\n📋 STRUCTURED DATA:`);
//     console.log(JSON.stringify(structuredData, null, 2));
//   }
//   if (summary) {
//     console.log(`\n📊 SUMMARY:`);
//     console.log(summary);
//   }
//   console.log(`\n📝 TRANSCRIPT:`);
//   console.log(`${'-'.repeat(40)}`);
//   console.log(transcript || 'No transcript available');
//   console.log(`${'-'.repeat(40)}`);

//   const dbSid = vapiCallId;
//   let conversationId = null;
//   let callId = null;           // UUID from ezy_vet_calls
//   let petOwnerId = null;
//   let petOwnerName = null;
//   let registeredNumber = null;
//   let appointmentType = null;
//   let appointmentId = null;

//   if (dbSid) {
//     try {
//       // ─── Step 1: Find or create conversation in ezy_vet_conversations ──
//       const num1 = fromNumber < toNumber ? fromNumber : toNumber;
//       const num2 = fromNumber < toNumber ? toNumber : fromNumber;

//       const convResult = await executeQuery(
//         `SELECT id FROM ezy_vet_conversations WHERE number_1 = $1 AND number_2 = $2`,
//         [num1, num2]
//       );

//       if (convResult.rows.length > 0) {
//         conversationId = convResult.rows[0].id;
//         console.log(`   Existing conversation: ${conversationId}`);
//       } else {
//         const newConv = await executeQuery(
//           `INSERT INTO ezy_vet_conversations (from_number, to_number, hospital_id)
//            VALUES ($1, $2, $3) RETURNING id`,
//           [fromNumber, toNumber, hospitalId || null]
//         );
//         conversationId = newConv.rows[0].id;
//         console.log(`   New conversation created: ${conversationId}`);
//       }

//       // ─── Step 2: Create call record in ezy_vet_calls ────────────────
//       const callUuid = uuidv4();
//       const callInsert = await executeQuery(
//         `INSERT INTO ezy_vet_calls 
//          (id, call_sid, conversation_id, call_status, from_number, to_number, direction, hospital_id)
//          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//          RETURNING id`,
//         [
//           callUuid,
//           dbSid,
//           conversationId,
//           'completed',
//           fromNumber || null,
//           toNumber || null,
//           'inbound',
//           hospitalId || null
//         ]
//       );
//       callId = callInsert.rows[0].id;
//       console.log(`   Call created with UUID: ${callId} (hospital_id: ${hospitalId || 'NULL'})`);

//       // ─── Step 3: Save transcript/recording to ezy_vet_transcriptions ──
//       if (transcript && transcript.trim().length > 0) {
//         await executeQuery(
//           `INSERT INTO ezy_vet_transcriptions (call_id, transcription_text, recording_url, transcription_status)
//            VALUES ($1, $2, $3, 'completed')`,
//           [callId, transcript, recordingUrl || null]
//         );
//         console.log(`   ✅ Transcript saved to ezy_vet_transcriptions`);
//       } else if (recordingUrl) {
//         await executeQuery(
//           `INSERT INTO ezy_vet_transcriptions (call_id, recording_url, transcription_status)
//            VALUES ($1, $2, 'completed')`,
//           [callId, recordingUrl]
//         );
//         console.log(`   ✅ Recording URL saved to ezy_vet_transcriptions`);
//       }

//       // ─── Step 4: Lookup pet owner from ezy_vet_pet_owner ─────────────
//       if (fromNumber) {
//         let ownerResult = await executeQuery(
//           `SELECT id, name, phone, email FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
//           [fromNumber]
//         );
//         if (ownerResult.rows.length === 0 && fromNumber.startsWith('+')) {
//           const withoutCountry = fromNumber.substring(1);
//           ownerResult = await executeQuery(
//             `SELECT id, name, phone, email FROM ezy_vet_pet_owner 
//              WHERE phone = $1 OR phone = $2 LIMIT 1`,
//             [withoutCountry, withoutCountry]
//           );
//         }
//         if (ownerResult.rows.length > 0) {
//           petOwnerId = ownerResult.rows[0].id;
//           petOwnerName = ownerResult.rows[0].name;
//           registeredNumber = ownerResult.rows[0].phone;
//           console.log(`   ✅ Found pet owner: ${petOwnerName} (ID ${petOwnerId}, phone ${registeredNumber})`);
//         } else {
//           console.log(`   ⚠️ No pet owner found for number: ${fromNumber}`);
//         }
//       }

//       // ─── Step 5: Lookup appointment from ezy_vet_appointments ─────────
//       if (dbSid) {
//         const aptResult = await executeQuery(
//           `SELECT id, appointment_type, pet_owner_id, pet_id FROM ezy_vet_appointments 
//            WHERE call_sid = $1 
//            ORDER BY created_at DESC LIMIT 1`,
//           [dbSid]
//         );
//         if (aptResult.rows.length > 0) {
//           appointmentId = aptResult.rows[0].id;
//           appointmentType = aptResult.rows[0].appointment_type;
//           if (!petOwnerId && aptResult.rows[0].pet_owner_id) {
//             petOwnerId = aptResult.rows[0].pet_owner_id;
//             const ownerResult = await executeQuery(
//               `SELECT name, phone FROM ezy_vet_pet_owner WHERE id = $1`,
//               [petOwnerId]
//             );
//             if (ownerResult.rows.length > 0) {
//               petOwnerName = ownerResult.rows[0].name;
//               registeredNumber = ownerResult.rows[0].phone;
//             }
//           }
//           console.log(`   ✅ Found appointment type from call_sid: ${appointmentType}`);
//         }
//       }

//       // ─── Step 6: Insert into ezy_vet_call_logs ──────────────────────
//       await executeQuery(
//         `INSERT INTO ezy_vet_call_logs 
//          (call_sid, caller_phone, caller_name, pet_owner_id, appointment_id, 
//           call_duration, call_status, transcription, summary, recording_url, 
//           vapi_call_id, hospital_id, created_at)
//          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
//          ON CONFLICT (call_sid) DO UPDATE SET
//            caller_name = EXCLUDED.caller_name,
//            pet_owner_id = EXCLUDED.pet_owner_id,
//            appointment_id = EXCLUDED.appointment_id,
//            call_duration = EXCLUDED.call_duration,
//            call_status = EXCLUDED.call_status,
//            transcription = EXCLUDED.transcription,
//            summary = EXCLUDED.summary,
//            recording_url = EXCLUDED.recording_url,
//            updated_at = NOW()`,
//         [
//           dbSid,
//           fromNumber || 'unknown',
//           petOwnerName || 'Unknown',
//           petOwnerId || null,
//           appointmentId || null,
//           Math.round(duration || 0),
//           'completed',
//           transcript || null,
//           summary || null,
//           recordingUrl || null,
//           vapiCallId || null,
//           hospitalId || null
//         ]
//       );
//       console.log(`   ✅ ezy_vet_call_logs record saved with hospital_id: ${hospitalId || 'NULL'}`);

//       // ─── Step 7: Send email (unchanged, uses EmailService) ──────────
//       if (transcript && transcript.trim().length > 0) {
//         console.log(`\n📧 SENDING CALL SUMMARY EMAIL TO ADMIN...`);
//         console.log(`${'-'.repeat(40)}`);

//         let finalCallerName = petOwnerName || 'Unknown';
//         if (!finalCallerName || finalCallerName === 'Unknown') {
//           if (transcript) {
//             const nameMatch = transcript.match(/Welcome back[, ]+([A-Za-z]+ [A-Za-z]+)/i);
//             if (nameMatch) finalCallerName = nameMatch[1] || 'Unknown';
//           }
//         }

//         const finalReasonForCall = (appointmentType && appointmentType !== 'null')
//           ? appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)
//           : 'Query Purpose';

//         const finalRegisteredNumber = registeredNumber || null;

//         try {
//           const emailResult = await EmailService.sendCallSummaryEmail({
//             callSid: dbSid,
//             callId: callId,                 // UUID from ezy_vet_calls
//             callerNumber: fromNumber || 'unknown',
//             callerName: finalCallerName,
//             reasonForCall: finalReasonForCall,
//             patientId: petOwnerId,           // local integer ID from ezy_vet_pet_owner
//             registeredNumber: finalRegisteredNumber,
//             appointmentType: appointmentType,
//             transcription: transcript,
//             callDuration: duration || 0,
//             callDate: new Date(),
//             summary: summary || null,
//             recordingUrl: recordingUrl || null,
//             hospitalId: hospitalId
//           });

//           if (emailResult.success) {
//             console.log(`   ✅ Email sent successfully using professional template!`);
//             console.log(`   Message ID: ${emailResult.messageId}`);
//             console.log(`   ✅ Email log saved by EmailService with hospital_id: ${hospitalId || 'NULL'}`);
//           } else {
//             console.log(`   ❌ Email failed: ${emailResult.error}`);
//           }
//         } catch (emailErr) {
//           console.error(`   ❌ Email error: ${emailErr.message}`);
//         }
//         console.log(`${'-'.repeat(40)}`);
//       } else {
//         console.log(`\n📧 No transcript available, skipping email.`);
//       }

//     } catch (err) {
//       console.error(`   ❌ Database error: ${err.message}`);
//     }
//   } else {
//     console.log(`   ❌ No valid Vapi Call ID to save with`);
//   }
//   console.log(`${'='.repeat(60)}\n`);
//   return res.json({ received: true });
// };




// ─── Inside src/controllers/vapiController.js ──────────────────────────

// ─── HELPER: Normalize phone for lookup ────────────────────────────────
function normalizePhoneForLookup(phone) {
    if (!phone) return phone;
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    // If starts with '1' and has 11 digits, strip the leading '1'
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = cleaned.substring(1);
    }
    return cleaned;
}

// ─── FULLY UPDATED _handleEndOfCall ────────────────────────────────────
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
    let callId = null;           // UUID from ezy_vet_calls
    let petOwnerId = null;
    let petOwnerName = null;
    let registeredNumber = null;
    let appointmentType = null;
    let appointmentId = null;

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
            // if (transcript && transcript.trim().length > 0) {
            //     await executeQuery(
            //         `INSERT INTO ezy_vet_transcriptions (call_id, transcription_text, recording_url, transcription_status)
            //          VALUES ($1, $2, $3, 'completed')`,
            //         [callId, transcript, recordingUrl || null]
            //     );
            //     console.log(`   ✅ Transcript saved to ezy_vet_transcriptions`);
            // } else if (recordingUrl) {
            //     await executeQuery(
            //         `INSERT INTO ezy_vet_transcriptions (call_id, recording_url, transcription_status)
            //          VALUES ($1, $2, 'completed')`,
            //         [callId, recordingUrl]
            //     );
            //     console.log(`   ✅ Recording URL saved to ezy_vet_transcriptions`);
            // }


            // ─── Step 3: Save transcript/recording with hospital_id ──────────────
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

            // ─── Step 4: Lookup pet owner ─────────────────────────────
            if (fromNumber) {
                const normalizedPhone = normalizePhoneForLookup(fromNumber);
                let ownerResult = await executeQuery(
                    `SELECT id, name, phone, email FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
                    [normalizedPhone]
                );
                // Also try with the original raw number if not found
                if (ownerResult.rows.length === 0 && normalizedPhone !== fromNumber) {
                    ownerResult = await executeQuery(
                        `SELECT id, name, phone, email FROM ezy_vet_pet_owner WHERE phone = $1 LIMIT 1`,
                        [fromNumber]
                    );
                }
                if (ownerResult.rows.length > 0) {
                    petOwnerId = ownerResult.rows[0].id;
                    petOwnerName = ownerResult.rows[0].name;
                    registeredNumber = ownerResult.rows[0].phone;
                    console.log(`   ✅ Found pet owner: ${petOwnerName} (ID ${petOwnerId}, phone ${registeredNumber})`);
                } else {
                    console.log(`   ⚠️ No pet owner found for number: ${fromNumber}`);
                }
            }

            // ─── Step 5: Lookup appointment ───────────────────────────
            if (dbSid) {
                const aptResult = await executeQuery(
                    `SELECT id, appointment_type, pet_owner_id, pet_id FROM ezy_vet_appointments 
                     WHERE call_sid = $1 
                     ORDER BY created_at DESC LIMIT 1`,
                    [dbSid]
                );
                if (aptResult.rows.length > 0) {
                    appointmentId = aptResult.rows[0].id;
                    appointmentType = aptResult.rows[0].appointment_type;
                    if (!petOwnerId && aptResult.rows[0].pet_owner_id) {
                        petOwnerId = aptResult.rows[0].pet_owner_id;
                        const ownerResult = await executeQuery(
                            `SELECT name, phone FROM ezy_vet_pet_owner WHERE id = $1`,
                            [petOwnerId]
                        );
                        if (ownerResult.rows.length > 0) {
                            petOwnerName = ownerResult.rows[0].name;
                            registeredNumber = ownerResult.rows[0].phone;
                        }
                    }
                    console.log(`   ✅ Found appointment type from call_sid: ${appointmentType}`);
                }
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
                    // ─── Pass callId as null to avoid foreign key constraint on old calls table ───
                    const emailResult = await EmailService.sendCallSummaryEmail({
                        callSid: dbSid,
                        callId: null,  // ⬅️ Set to null to bypass old foreign key
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
                        hospitalId: hospitalId  // ⬅️ Pass hospital_id to email service
                    });

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
// exports._handleFunctionCall = async (message, res) => {
//   const functionName = message.function?.name || message.name;
//   const args = message.function?.arguments || message.arguments || {};
//   const vapiCallId = message.call?.id || message.callId || null;

//   console.log(`\n🔧 VAPI FUNCTION CALL: ${functionName}`);
//   console.log(`   Arguments:`, JSON.stringify(args, null, 2));

//   try {
//     let result;

//     switch (functionName) {
//       case 'check_working_hours':
//         result = await exports._checkWorkingHours(args);
//         break;
//       case 'get_available_slots':
//         result = await exports._getAvailableSlots(args);
//         break;
//       case 'find_patient_by_phone':
//         result = await exports._findPatientByPhone(args);
//         break;
//       case 'book_appointment':
//         result = await exports._bookAppointment({
//           ...args,
//           call_sid: vapiCallId
//         });
//         break;
//       case 'get_patient_appointments':
//         result = await exports._getPatientAppointments(args);
//         break;
//       case 'cancel_appointment':
//         result = await exports._cancelAppointment(args);
//         break;
//       default:
//         console.log(`   ⚠️  Unknown function: ${functionName}`);
//         result = { success: false, error: `Unknown function: ${functionName}` };
//     }

//     console.log(`   ✅ Result:`, JSON.stringify(result, null, 2).substring(0, 500));
//     return res.json({ result: result });

//   } catch (error) {
//     console.error(`   ❌ Function error: ${error.message}`);
//     return res.json({ result: { success: false, error: error.message } });
//   }
// };

// ============================================
// CHECK WORKING HOURS
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


// ============================================
// FIND PATIENT BY PHONE
// ============================================
// exports._findPatientByPhone = async (args) => {
//   const { phone } = args;
//   const req = { query: { phone } };
//   let result = null;
//   const res = { json: (data) => { result = data; }, status: () => res };
//   await patientController.lookupByPhone(req, res);
//   return result?.data || result;
// };

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