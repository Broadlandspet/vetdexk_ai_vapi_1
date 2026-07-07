

const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class LogService {
  
  // ============================================
  // ✅ UPDATED: findOrCreateConversation with hospital_id
  // ============================================
  static async findOrCreateConversation(fromNumber, toNumber, hospitalId = null) {
    try {
      let findResult;
      if (hospitalId) {
        findResult = await executeQuery(
          `SELECT id FROM conversations 
           WHERE from_number = $1 AND to_number = $2 AND hospital_id = $3`,
          [fromNumber, toNumber, hospitalId]
        );
      } else {
        findResult = await executeQuery(
          `SELECT id FROM conversations 
           WHERE from_number = $1 AND to_number = $2 AND hospital_id IS NULL`,
          [fromNumber, toNumber]
        );
      }
      
      if (findResult.rows.length > 0) {
        return findResult.rows[0].id;
      }
      
      let createResult;
      if (hospitalId) {
        createResult = await executeQuery(
          `INSERT INTO conversations (from_number, to_number, hospital_id)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [fromNumber, toNumber, hospitalId]
        );
      } else {
        createResult = await executeQuery(
          `INSERT INTO conversations (from_number, to_number)
           VALUES ($1, $2)
           RETURNING id`,
          [fromNumber, toNumber]
        );
      }
      
      return createResult.rows[0].id;
      
    } catch (error) {
      logger.error('Error finding/creating conversation:', error);
      throw error;
    }
  }
  
  // ============================================
  // ✅ UPDATED: createCall with hospital_id
  // ============================================
  static async createCall(callData) {
    try {
      const conversationId = await this.findOrCreateConversation(
        callData.caller_number,
        callData.callee_number,
        callData.hospital_id || null
      );
      
      const result = await executeQuery(
        `INSERT INTO calls (
          call_sid, conversation_id, call_status, menu_digit,
          from_number, to_number, direction, hospital_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          callData.twilio_call_sid,
          conversationId,
          callData.call_status || 'initiated',
          callData.menu_digit || null,
          callData.caller_number,
          callData.callee_number,
          callData.direction || 'inbound',
          callData.hospital_id || null
        ]
      );
      
      return result.rows[0].id;
      
    } catch (error) {
      logger.error('Error creating call record:', error);
      throw error;
    }
  }
  
  // ============================================
  // REST OF THE METHODS (unchanged)
  // ============================================
  static async updateCall(callSid, updates) {
    try {
      const allowedFields = ['call_status', 'menu_digit'];
      const setClauses = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (setClauses.length === 0) return;
      
      setClauses.push(`updated_at = NOW()`);
      values.push(callSid);
      
      await executeQuery(
        `UPDATE calls SET ${setClauses.join(', ')} 
         WHERE call_sid = $${paramIndex}`,
        values
      );
      
    } catch (error) {
      logger.error(`Error updating call ${callSid}:`, error);
      throw error;
    }
  }
  
  static async updateCallWithTranscription(callSid, transcriptionText, recordingUrl = null) {
    try {
      const call = await this.getCallBySid(callSid);
      if (!call) {
        logger.error(`Call not found for transcription: ${callSid}`);
        return;
      }
      
      const existingResult = await executeQuery(
        `SELECT id FROM transcriptions WHERE call_id = $1`,
        [call.id]
      );
      
      if (existingResult.rows.length > 0) {
        await executeQuery(
          `UPDATE transcriptions 
           SET transcription_status = 'completed',
               recording_url = COALESCE($1, recording_url),
               updated_at = NOW()
           WHERE call_id = $2`,
          [recordingUrl, call.id]
        );
      } else {
        await executeQuery(
          `INSERT INTO transcriptions (call_id, recording_url, transcription_text, transcription_status)
           VALUES ($1, $2, $3, 'completed')`,
          [call.id, recordingUrl, `User: ${transcriptionText}`]
        );
      }
      
      await this.updateCall(callSid, { call_status: 'completed' });
      
    } catch (error) {
      logger.error(`Error updating transcription for call ${callSid}:`, error);
      throw error;
    }
  }
  
  static async updateCallWithTranscript(callId, transcriptLine) {
    try {
      const existingResult = await executeQuery(
        `SELECT id, transcription_text FROM transcriptions WHERE call_id = $1`,
        [callId]
      );
      
      let newTranscript = transcriptLine;
      
      if (existingResult.rows.length > 0 && existingResult.rows[0].transcription_text) {
        newTranscript = `${existingResult.rows[0].transcription_text}\n${transcriptLine}`;
      }
      
      if (existingResult.rows.length > 0) {
        await executeQuery(
          `UPDATE transcriptions 
           SET transcription_text = $1, updated_at = NOW()
           WHERE id = $2`,
          [newTranscript, existingResult.rows[0].id]
        );
      } else {
        await executeQuery(
          `INSERT INTO transcriptions (call_id, transcription_text, transcription_status)
           VALUES ($1, $2, 'in_progress')`,
          [callId, newTranscript]
        );
      }
      
    } catch (error) {
      logger.error(`Error updating transcript for call ${callId}:`, error);
    }
  }
  
  static async addLog(callId, eventType, eventData) {
    try {
      await executeQuery(
        `INSERT INTO ezy_vet_call_logs (call_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [callId, eventType, eventData]
      );
    } catch (error) {
      // Silently fail
    }
  }
  
  static async getCallBySid(callSid) {
    try {
      const result = await executeQuery(
        `SELECT c.*, 
                jsonb_agg(DISTINCT t.*) FILTER (WHERE t.id IS NOT NULL) as transcriptions,
                row_to_json(conv.*) as conversations
         FROM calls c
         LEFT JOIN transcriptions t ON t.call_id = c.id
         LEFT JOIN conversations conv ON conv.id = c.conversation_id
         WHERE c.call_sid = $1
         GROUP BY c.id, conv.id`,
        [callSid]
      );
      
      if (result.rows.length === 0) return null;
      
      const data = result.rows[0];
      const transcriptions = data.transcriptions || [];
      
      return {
        ...data,
        id: data.id,
        twilio_call_sid: data.call_sid,
        caller_number: data.from_number,
        callee_number: data.to_number,
        transcription: transcriptions[0]?.transcription_text || null,
        recording_url: transcriptions[0]?.recording_url || null,
        call_status: data.call_status
      };
      
    } catch (error) {
      logger.error(`Error fetching call ${callSid}:`, error);
      return null;
    }
  }
  
  static async getCallLogs(callId) {
    try {
      const result = await executeQuery(
        `SELECT * FROM ezy_vet_call_logs 
         WHERE call_id = $1 
         ORDER BY created_at ASC`,
        [callId]
      );
      return result.rows || [];
    } catch (error) {
      logger.error(`Error fetching logs for call ${callId}:`, error);
      return [];
    }
  }
  
  static async getAllCalls(filters = {}) {
    try {
      let query = `
        SELECT c.*, 
               jsonb_agg(DISTINCT t.*) FILTER (WHERE t.id IS NOT NULL) as transcriptions,
               row_to_json(conv.*) as conversations
        FROM calls c
        LEFT JOIN transcriptions t ON t.call_id = c.id
        LEFT JOIN conversations conv ON conv.id = c.conversation_id
        WHERE 1=1
      `;
      const values = [];
      let paramIndex = 1;
      
      if (filters.caller_number) {
        query += ` AND c.from_number ILIKE $${paramIndex}`;
        values.push(`%${filters.caller_number}%`);
        paramIndex++;
      }
      
      if (filters.call_status) {
        query += ` AND c.call_status = $${paramIndex}`;
        values.push(filters.call_status);
        paramIndex++;
      }
      
      if (filters.start_date) {
        query += ` AND c.created_at >= $${paramIndex}`;
        values.push(filters.start_date);
        paramIndex++;
      }
      
      if (filters.end_date) {
        query += ` AND c.created_at <= $${paramIndex}`;
        values.push(filters.end_date);
        paramIndex++;
      }
      
      query += ` GROUP BY c.id, conv.id ORDER BY c.created_at DESC`;
      
      const result = await executeQuery(query, values);
      
      return (result.rows || []).map(call => {
        const transcriptions = call.transcriptions || [];
        return {
          ...call,
          id: call.id,
          twilio_call_sid: call.call_sid,
          caller_number: call.from_number,
          callee_number: call.to_number,
          transcription: transcriptions[0]?.transcription_text || null,
          recording_url: transcriptions[0]?.recording_url || null,
          call_status: call.call_status
        };
      });
      
    } catch (error) {
      logger.error('Error fetching calls:', error);
      return [];
    }
  }
  
  static async saveRecordingInfo(callSid, recordingUrl, recordingSid, recordingDuration = null) {
    try {
      const call = await this.getCallBySid(callSid);
      if (!call) {
        logger.error(`Call not found for recording: ${callSid}`);
        return;
      }
      
      const existingResult = await executeQuery(
        `SELECT id FROM transcriptions WHERE call_id = $1`,
        [call.id]
      );
      
      if (existingResult.rows.length > 0) {
        await executeQuery(
          `UPDATE transcriptions 
           SET recording_sid = $1, recording_url = $2, recording_duration = $3, updated_at = NOW()
           WHERE call_id = $4`,
          [recordingSid, recordingUrl, recordingDuration, call.id]
        );
      } else {
        await executeQuery(
          `INSERT INTO transcriptions (call_id, recording_sid, recording_url, recording_duration, transcription_status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [call.id, recordingSid, recordingUrl, recordingDuration]
        );
      }
      
    } catch (error) {
      logger.error(`Error saving recording for call ${callSid}:`, error);
    }
  }
  
  static async getConversationByNumbers(fromNumber, toNumber) {
    try {
      const result = await executeQuery(
        `SELECT c.*,
                jsonb_agg(DISTINCT ca.*) FILTER (WHERE ca.id IS NOT NULL) as calls
         FROM conversations c
         LEFT JOIN calls ca ON ca.conversation_id = c.id
         WHERE c.from_number = $1 AND c.to_number = $2
         GROUP BY c.id`,
        [fromNumber, toNumber]
      );
      
      if (result.rows.length === 0) return null;
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error fetching conversation:', error);
      return null;
    }
  }
}

module.exports = LogService;