


const LogService = require('../services/logService');
const logger = require('../utils/logger');

class LogController {
  
  static async getAllCalls(req, res) {
    try {
      const { caller_number, call_status, start_date, end_date, has_transcription } = req.query;
      
      const filters = {
        caller_number,
        call_status,
        start_date,
        end_date
      };
      
      let calls = await LogService.getAllCalls(filters);
      
      // Filter by transcription availability if requested
      if (has_transcription === 'true') {
        calls = calls.filter(call => call.transcription && call.transcription.length > 0);
      } else if (has_transcription === 'false') {
        calls = calls.filter(call => !call.transcription || call.transcription.length === 0);
      }
      
      res.json({
        success: true,
        data: calls,
        count: calls.length
      });
      
    } catch (error) {
      logger.error('Error fetching calls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch calls'
      });
    }
  }
  
  static async getCallDetails(req, res) {
    try {
      const { callSid } = req.params;
      
      const call = await LogService.getCallBySid(callSid);
      
      if (!call) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }
      
      const logs = await LogService.getCallLogs(call.id);
      
      res.json({
        success: true,
        data: {
          ...call,
          logs,
          has_transcription: !!(call.transcription),
          transcription_preview: call.transcription ? call.transcription.substring(0, 500) : null
        }
      });
      
    } catch (error) {
      logger.error('Error fetching call details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch call details'
      });
    }
  }
  

  



static async getCallStats(req, res) {
  try {
    const calls = await LogService.getAllCalls();                      
    
    const callsWithTranscription = calls.filter(c => c.transcription && c.transcription.length > 0);
    
    const stats = {
      total_calls: calls.length,
      completed_calls: calls.filter(c => c.call_status === 'completed').length,
      in_progress_calls: calls.filter(c => c.call_status === 'in-progress').length,
      calls_with_transcription: callsWithTranscription.length,
      transcription_rate: calls.length > 0 
        ? ((callsWithTranscription.length / calls.length) * 100).toFixed(2) 
        : 0
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
}


  static async getCallTranscription(req, res) {
    try {
      const { callSid } = req.params;
      
      const call = await LogService.getCallBySid(callSid);
      
      if (!call) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }
      
      if (!call.transcription) {
        return res.status(404).json({
          success: false,
          error: 'No transcription available for this call'
        });
      }
      
      res.json({
        success: true,
        data: {
          call_sid: call.twilio_call_sid,
          transcription: call.transcription,
          recording_url: call.recording_url,
          transcription_length: call.transcription.length
        }
      });
      
    } catch (error) {
      logger.error('Error fetching transcription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transcription'
      });
    }
  }
  
  // NEW: Get conversation history by phone numbers
  static async getConversationHistory(req, res) {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({
          success: false,
          error: 'Both "from" and "to" phone numbers are required'
        });
      }
      
      const conversation = await LogService.getConversationByNumbers(from, to);
      
      if (!conversation) {
        return res.json({
          success: true,
          data: null,
          message: 'No conversation found for these numbers'
        });
      }
      
      res.json({
        success: true,
        data: conversation
      });
      
    } catch (error) {
      logger.error('Error fetching conversation history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversation history'
      });
    }
  }
}

module.exports = LogController;