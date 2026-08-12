const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const env = require('../config/env');

const credentialService = require('../services/credentialService');



// // ─── HELPER: Get hospital_id from request (priority: token → query → body) ──
// function getHospitalId(req) {
//     // From JWT token / user object
//     const fromToken = req.hospitalId || (req.user && req.user.hospital_id);
//     if (fromToken) return fromToken;

//     // From query
//     const fromQuery = req.query?.hospital_id;
//     if (fromQuery) return parseInt(fromQuery, 10);

//     // From body
//     const fromBody = req.body?.hospital_id;
//     if (fromBody) return parseInt(fromBody, 10);
     
//     return null;
// }

function getHospitalId(req) {
    // Only from JWT token / user object – never trust client-provided query/body
    return req.hospitalId || (req.user && req.user.hospital_id) || null;
}




// ============================================
// CALLS MANAGEMENT
// ============================================

// Get all calls (admin only)

exports.getAllCalls = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }
 
        const result = await executeQuery(`
            SELECT
                cl.id as log_id,
                c.id as call_id,
                c.call_sid,
                c.from_number,
                c.to_number,
                c.conversation_id,
                c.call_status,
                c.menu_digit,
                c.direction,
                c.created_at,
                c.updated_at,
                c.hospital_id,
                -- Fields from ezy_vet_call_logs
                cl.caller_name,
                cl.pet_owner_id,
                cl.appointment_id,
                cl.call_duration,
                cl.transcription,
                cl.summary,
                cl.recording_url,
                cl.vapi_call_id,
                -- Build transcriptions array (from call_logs)
                CASE
                    WHEN cl.transcription IS NOT NULL AND cl.transcription != '' THEN
                        jsonb_build_array(
                            jsonb_build_object(
                                'id', cl.id || '-transcript',
                                'call_id', cl.id,
                                'created_at', cl.created_at,
                                'updated_at', cl.updated_at,
                                'hospital_id', cl.hospital_id,
                                'recording_url', cl.recording_url,
                                'transcription_text', cl.transcription,
                                'recording_duration', cl.call_duration,
                                'transcription_status', 'completed'
                            )
                        )
                    ELSE '[]'::jsonb
                END as transcriptions,
                -- Build conversations object
                jsonb_build_object(
                    'id', c.conversation_id,
                    'from_number', c.from_number,
                    'to_number', c.to_number,
                    'created_at', c.created_at,
                    'updated_at', c.updated_at,
                    'hospital_id', c.hospital_id
                ) as conversations
            FROM ezy_vet_calls c
            LEFT JOIN ezy_vet_call_logs cl ON cl.call_sid = c.call_sid
            WHERE c.hospital_id = $1
            ORDER BY c.created_at DESC
        `, [hospitalId]);
 
        // Format response to match frontend expectations
        const formattedData = result.rows.map(row => ({
            id: row.call_id,
            call_sid: row.call_sid,
            conversation_id: row.conversation_id,
            call_status: row.call_status || 'completed',
            menu_digit: row.menu_digit,
            from_number: row.from_number,
            to_number: row.to_number,
            direction: row.direction || 'inbound',
            created_at: row.created_at,
            updated_at: row.updated_at,
            hospital_id: row.hospital_id,
            // Additional fields from call_logs
            caller_name: row.caller_name,
            call_duration: row.call_duration,
            transcription: row.transcription,
            summary: row.summary,
            recording_url: row.recording_url,
            vapi_call_id: row.vapi_call_id,
            // Nested structures
            transcriptions: row.transcriptions || [],
            conversations: row.conversations || {}
        }));
 
        res.json({
            success: true,
            data: formattedData,
            count: formattedData.length || 0
        });
 
    } catch (error) {
        logger.error('Error fetching all calls:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch calls'
        });
    }
};


// Get specific call by ID (admin only)
exports.getCallById = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT c.*, 
                   jsonb_agg(DISTINCT t.*) FILTER (WHERE t.id IS NOT NULL) as transcriptions,
                   row_to_json(conv.*) as conversations
            FROM ezy_vet_calls c
            LEFT JOIN ezy_vet_transcriptions t ON t.call_id = c.id
            LEFT JOIN ezy_vet_conversations conv ON conv.id = c.conversation_id
            WHERE c.id = $1 AND c.hospital_id = $2
            GROUP BY c.id, conv.id
        `, [id, hospitalId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Call not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching call:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch call'
        });
    }
};






// // Get specific call by Call SID (admin only)


exports.getCallBySid = async (req, res) => {
    try {
        const { callSid } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT c.*, 
                   jsonb_agg(DISTINCT t.*) FILTER (WHERE t.id IS NOT NULL) as transcriptions,
                   row_to_json(conv.*) as conversations
            FROM ezy_vet_calls c
            LEFT JOIN ezy_vet_transcriptions t ON t.call_id = c.id
            LEFT JOIN ezy_vet_conversations conv ON conv.id = c.conversation_id
            WHERE c.call_sid = $1 AND c.hospital_id = $2
            GROUP BY c.id, conv.id
        `, [callSid, hospitalId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Call not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching call by SID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch call'
        });
    }
};



// ============================================
// CONVERSATIONS MANAGEMENT
// ============================================

// // Get all conversations (admin only)

exports.getAllConversations = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT c.*,
                   jsonb_agg(DISTINCT ca.*) FILTER (WHERE ca.id IS NOT NULL) as calls
            FROM ezy_vet_conversations c
            LEFT JOIN ezy_vet_calls ca ON ca.conversation_id = c.id
            WHERE c.hospital_id = $1
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `, [hospitalId]);

        res.json({
            success: true,
            data: result.rows || [],
            count: result.rows?.length || 0
        });

    } catch (error) {
        logger.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversations'
        });
    }
};






// // Get specific conversation by ID (admin only)




exports.getConversationById = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT c.*,
                   jsonb_agg(DISTINCT ca.*) FILTER (WHERE ca.id IS NOT NULL) as calls
            FROM ezy_vet_conversations c
            LEFT JOIN ezy_vet_calls ca ON ca.conversation_id = c.id
            WHERE c.id = $1 AND c.hospital_id = $2
            GROUP BY c.id
        `, [id, hospitalId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversation'
        });
    }
};





// // Get conversation by phone numbers (admin only)


exports.getConversationByNumbers = async (req, res) => {
    try {
        const { from, to } = req.query;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                error: 'Both from and to numbers are required'
            });
        }

        const result = await executeQuery(`
            SELECT c.*,
                   jsonb_agg(DISTINCT ca.*) FILTER (WHERE ca.id IS NOT NULL) as calls
            FROM ezy_vet_conversations c
            LEFT JOIN ezy_vet_calls ca ON ca.conversation_id = c.id
            WHERE c.from_number = $1 AND c.to_number = $2 AND c.hospital_id = $3
            GROUP BY c.id
        `, [from, to, hospitalId]);

        res.json({
            success: true,
            data: result.rows[0] || null
        });

    } catch (error) {
        logger.error('Error fetching conversation by numbers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversation'
        });
    }
};




// ============================================
// TRANSCRIPTIONS MANAGEMENT
// ============================================

// Get all transcriptions (admin only)








exports.getAllTranscriptions = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                error: 'No hospital associated with this admin'
            });
        }
 
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
 
        // Build WHERE clause
        let whereClause = `WHERE cl.hospital_id = $1`;
        let params = [hospitalId];
        let paramIndex = 2;
 
        if (search) {
            whereClause += ` AND (cl.transcription ILIKE $${paramIndex} OR cl.caller_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
 
        // Get total count
        const countResult = await executeQuery(
            `SELECT COUNT(*) as total FROM ezy_vet_call_logs cl ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0]?.total || 0);
 
        // Get transcriptions with call details from ezy_vet_calls
        const result = await executeQuery(`
            SELECT
                cl.id,
                cl.call_sid,
                cl.caller_phone as from_number,
                cl.caller_name,
                cl.call_duration as recording_duration,
                cl.transcription as transcription_text,
                cl.summary,
                cl.recording_url,
                cl.vapi_call_id,
                cl.created_at,
                cl.updated_at,
                cl.hospital_id,
                -- Build calls object matching frontend expectation
                jsonb_build_object(
                    'id', c.id,
                    'call_sid', c.call_sid,
                    'from_number', c.from_number,
                    'to_number', c.to_number,
                    'conversation_id', c.conversation_id,
                    'call_status', c.call_status,
                    'direction', c.direction,
                    'created_at', c.created_at,
                    'updated_at', c.updated_at,
                    'hospital_id', c.hospital_id,
                    'conversations', jsonb_build_object(
                        'id', c.conversation_id,
                        'from_number', c.from_number,
                        'to_number', c.to_number
                    )
                ) as calls
            FROM ezy_vet_call_logs cl
            LEFT JOIN ezy_vet_calls c ON c.call_sid = cl.call_sid
            ${whereClause}
            ORDER BY cl.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset]);
 
        // Format the response to exactly match frontend expectations
        const formattedData = result.rows.map(row => ({
            id: row.id,
            call_id: row.call_sid,
            recording_sid: row.recording_url ? row.recording_url.split('/').pop() : null, // Extract from URL if needed
            recording_url: row.recording_url,
            recording_duration: row.recording_duration || 0,
            transcription_text: row.transcription_text || '',
            transcription_status: row.transcription_text ? 'completed' : 'pending',
            created_at: row.created_at,
            updated_at: row.updated_at,
            calls: row.calls || {
                id: null,
                call_sid: row.call_sid,
                from_number: row.from_number,
                to_number: null,
                conversation_id: null,
                call_status: row.call_status || 'pending',
                direction: 'inbound',
                created_at: row.created_at,
                updated_at: row.updated_at,
                hospital_id: row.hospital_id,
                conversations: {
                    id: null,
                    from_number: row.from_number,
                    to_number: null
                }
            }
        }));
 
        res.json({
            success: true,
            data: formattedData,
            count: formattedData.length,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
 
    } catch (error) {
        logger.error('Error fetching transcriptions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transcriptions'
        });
    }
};



// // Get specific transcription by ID (admin only)



exports.getTranscriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT t.*,
                   row_to_json(c.*) as calls
            FROM ezy_vet_transcriptions t
            LEFT JOIN ezy_vet_calls c ON c.id = t.call_id
            WHERE t.id = $1 AND t.hospital_id = $2
        `, [id, hospitalId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Transcription not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching transcription:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transcription'
        });
    }
};

// // Get transcriptions for a specific call (admin only)


exports.getTranscriptionsByCall = async (req, res) => {
    try {
        const { callId } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT t.* 
            FROM ezy_vet_transcriptions t
            JOIN ezy_vet_calls c ON c.id = t.call_id
            WHERE t.call_id = $1 AND c.hospital_id = $2
            ORDER BY t.created_at ASC
        `, [callId, hospitalId]);

        res.json({
            success: true,
            data: result.rows || [],
            count: result.rows?.length || 0
        });

    } catch (error) {
        logger.error('Error fetching transcriptions by call:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transcriptions'
        });
    }
};

// ============================================
// DASHBOARD STATS
// ============================================

// // Get dashboard stats (admin only)

exports.getDashboardStats = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }
 
        // ── Test if data exists ──
        const testResult = await executeQuery(
            `SELECT COUNT(*) as count FROM ezy_vet_calls WHERE hospital_id = $1`,
            [hospitalId]
        );
        console.log('📊 Total calls for hospital:', testResult.rows[0].count);
 
        // ── Total Calls ──
        const totalCallsResult = await executeQuery(
            `SELECT COUNT(*) as count FROM ezy_vet_calls WHERE hospital_id = $1`,
            [hospitalId]
        );
        const totalCalls = parseInt(totalCallsResult.rows[0]?.count || 0);
 
        // ── Completed Calls ──
        const completedCallsResult = await executeQuery(
            `SELECT COUNT(*) as count FROM ezy_vet_calls WHERE call_status = 'completed' AND hospital_id = $1`,
            [hospitalId]
        );
        const completedCalls = parseInt(completedCallsResult.rows[0]?.count || 0);
 
        // ── Conversations ──
        const conversationsResult = await executeQuery(
            `SELECT COUNT(*) as count FROM ezy_vet_conversations WHERE hospital_id = $1`,
            [hospitalId]
        );
        const totalConversations = parseInt(conversationsResult.rows[0]?.count || 0);
 
        // ── Transcriptions ──
        const transcriptionsResult = await executeQuery(
            `SELECT COUNT(*) as count FROM ezy_vet_transcriptions WHERE transcription_text IS NOT NULL AND hospital_id = $1`,
            [hospitalId]
        );
        const totalTranscriptions = parseInt(transcriptionsResult.rows[0]?.count || 0);
 
        // ── ✅ Get last 7 days with data (FIXED) ──
        // Use a simpler query without date casting issues
        const last7DaysResult = await executeQuery(
            `
            SELECT
                created_at::date as date,
                COUNT(*) as call_count
            FROM ezy_vet_calls
            WHERE hospital_id = $1
                AND created_at >= (NOW() - INTERVAL '7 days')
            GROUP BY created_at::date
            ORDER BY created_at::date ASC
            `,
            [hospitalId]
        );
 
        console.log('📊 Last 7 days result:', last7DaysResult.rows);
 
        // ── Format the response ──
        const last7Days = last7DaysResult.rows.map(row => ({
            date: row.date,
            day: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
            call_count: parseInt(row.call_count)
        }));
 
        // ── Today's calls ──
        const todayCallsResult = await executeQuery(
            `SELECT COUNT(*) as count FROM ezy_vet_calls
             WHERE hospital_id = $1
             AND created_at::date = CURRENT_DATE`,
            [hospitalId]
        );
        const todayCalls = parseInt(todayCallsResult.rows[0]?.count || 0);
 
        res.json({
            success: true,
            data: {
                total_calls: totalCalls,
                completed_calls: completedCalls,
                total_conversations: totalConversations,
                total_transcriptions: totalTranscriptions,
                completion_rate: totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(2) : "0.00",
                today_calls: todayCalls,
                last_7_days: last7Days
            }
        });
 
    } catch (error) {
        logger.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard stats',
            details: error.message
        });
    }
};


// ============================================
// RECORDING METHODS
// ============================================

// // Handle OPTIONS preflight for CORS - public, no change
exports.handleRecordingOptions = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
};

// // Get all recordings with playable links
exports.getAllRecordings = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT t.id, t.recording_sid, t.recording_url, t.recording_duration,
                   t.transcription_text, t.created_at,
                   jsonb_build_object(
                       'id', c.id,
                       'call_sid', c.call_sid,
                       'from_number', c.from_number,
                       'to_number', c.to_number,
                       'call_status', c.call_status,
                       'created_at', c.created_at
                   ) as calls
            FROM transcriptions t
            LEFT JOIN calls c ON c.id = t.call_id
            WHERE t.recording_url IS NOT NULL AND t.hospital_id = $1
            ORDER BY t.created_at DESC
        `, [hospitalId]);

        // Add playable link to each recording
        const recordingsWithLinks = (result.rows || []).map(recording => ({
            ...recording,
            play_link: `/api/admin/recordings/${recording.id}/play`,
            stream_link: `/api/admin/recordings/${recording.id}/stream`,
            public_stream_link: `/api/admin/stream/${recording.recording_sid}`,
            audio_url: recording.recording_url ? `${recording.recording_url}.mp3` : null
        }));

        res.json({
            success: true,
            data: recordingsWithLinks,
            count: recordingsWithLinks.length
        });

    } catch (error) {
        logger.error('Error fetching recordings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recordings'
        });
    }
};

// Get recording info with URL
exports.getRecordingUrl = async (req, res) => {
    try {
        const { transcriptionId } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT t.recording_url, t.recording_sid, t.call_id,
                   jsonb_build_object('from_number', c.from_number, 'to_number', c.to_number) as calls
            FROM transcriptions t
            LEFT JOIN calls c ON c.id = t.call_id
            WHERE t.id = $1 AND t.hospital_id = $2
        `, [transcriptionId, hospitalId]);

        if (result.rows.length === 0 || !result.rows[0].recording_url) {
            return res.status(404).json({
                success: false,
                error: 'Recording not found'
            });
        }

        const transcription = result.rows[0];
        const recordingUrl = transcription.recording_url;
        const audioUrl = `${recordingUrl}.mp3`;

        res.json({
            success: true,
            data: {
                recording_id: transcriptionId,
                recording_sid: transcription.recording_sid,
                recording_url: recordingUrl,
                audio_url: audioUrl,
                stream_url: `/api/admin/recordings/${transcriptionId}/stream`,
                public_stream_url: `/api/admin/stream/${transcription.recording_sid}`,
                from_number: transcription.calls?.from_number,
                to_number: transcription.calls?.to_number,
                play_link: `/api/admin/recordings/${transcriptionId}/play`
            }
        });

    } catch (error) {
        logger.error('Error getting recording URL:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recording URL'
        });
    }
};

// PUBLIC STREAM - No authentication required (uses recording_sid) - unchanged
exports.publicStreamRecording = async (req, res) => {
    try {
        const { recordingSid } = req.params;
        
        if (!recordingSid) {
            return res.status(400).json({
                success: false,
                error: 'Recording SID is required'
            });
        }
        
        // Build the audio URL with Twilio credentials
        const audioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;
        
        // Fetch the audio with Basic Authentication
        const authString = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;
        const encodedAuth = Buffer.from(authString).toString('base64');
        
        const response = await fetch(audioUrl, {
            headers: {
                'Authorization': `Basic ${encodedAuth}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch recording: ${response.status}`);
        }
        
        // Get the audio data
        const audioBuffer = await response.arrayBuffer();
        
        // Set headers for audio streaming with full CORS support
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename="recording_${recordingSid}.mp3"`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        
        // Send the audio
        res.send(Buffer.from(audioBuffer));
        
    } catch (error) {
        logger.error('Error streaming recording:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stream recording'
        });
    }
};

// Stream recording audio directly (requires auth)
exports.streamRecording = async (req, res) => {
    try {
        const { transcriptionId } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        // Get the transcription record with hospital check
        const result = await executeQuery(`
            SELECT recording_sid FROM transcriptions 
            WHERE id = $1 AND hospital_id = $2
        `, [transcriptionId, hospitalId]);
        
        if (result.rows.length === 0 || !result.rows[0].recording_sid) {
            return res.status(404).json({
                success: false,
                error: 'Recording not found'
            });
        }
        
        const recordingSid = result.rows[0].recording_sid;
        
        // Build the audio URL with Twilio credentials
        const audioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;
        
        // Fetch the audio with Basic Authentication
        const authString = `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`;
        const encodedAuth = Buffer.from(authString).toString('base64');
        
        const response = await fetch(audioUrl, {
            headers: {
                'Authorization': `Basic ${encodedAuth}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch recording: ${response.status}`);
        }
        
        // Get the audio data
        const audioBuffer = await response.arrayBuffer();
        
        // Set headers for audio streaming
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename="recording_${recordingSid}.mp3"`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Send the audio
        res.send(Buffer.from(audioBuffer));
        
    } catch (error) {
        logger.error('Error streaming recording:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stream recording'
        });
    }
};

// Serve audio player popup window
exports.audioPlayerPopup = async (req, res) => {
    const { transcriptionId } = req.params;
    const hospitalId = getHospitalId(req);
    if (!hospitalId) {
        return res.status(403).send(`
            <!DOCTYPE html>
            <html><head><title>Access Denied</title></head>
            <body><h2>Access Denied</h2><p>You are not associated with a hospital.</p></body>
            </html>
        `);
    }

    try {
        // Get the transcription record with hospital check
        const result = await executeQuery(`
            SELECT t.recording_sid, t.recording_url, t.call_id,
                   jsonb_build_object('from_number', c.from_number, 'to_number', c.to_number) as calls
            FROM transcriptions t
            LEFT JOIN calls c ON c.id = t.call_id
            WHERE t.id = $1 AND t.hospital_id = $2
        `, [transcriptionId, hospitalId]);

        if (result.rows.length === 0 || !result.rows[0].recording_url) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Recording Not Found</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h2>❌ Recording Not Found</h2>
                    <p>The recording you're looking for doesn't exist or has been deleted.</p>
                    <button onclick="window.close()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">Close</button>
                </body>
                </html>
            `);
        }

        const transcription = result.rows[0];
        const streamUrl = `/api/admin/stream/${transcription.recording_sid}`;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Call Recording Player</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    
                    .player-card {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        width: 500px;
                        max-width: 90%;
                        overflow: hidden;
                        animation: slideIn 0.3s ease-out;
                    }
                    
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-50px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                    }
                    
                    .header h2 {
                        margin: 0;
                        font-size: 20px;
                    }
                    
                    .header p {
                        margin: 5px 0 0;
                        font-size: 12px;
                        opacity: 0.9;
                    }
                    
                    .content {
                        padding: 30px;
                    }
                    
                    .call-info {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 10px;
                        margin-bottom: 20px;
                        font-size: 14px;
                    }
                    
                    .call-info .info-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        border-bottom: 1px solid #eee;
                    }
                    
                    .call-info .info-row:last-child {
                        border-bottom: none;
                    }
                    
                    .call-info .label {
                        font-weight: bold;
                        color: #555;
                    }
                    
                    .call-info .value {
                        color: #333;
                        font-family: monospace;
                    }
                    
                    .audio-container {
                        background: #f1f3f5;
                        border-radius: 50px;
                        padding: 20px;
                        margin: 20px 0;
                        text-align: center;
                    }
                    
                    audio {
                        width: 100%;
                        outline: none;
                    }
                    
                    .button-group {
                        display: flex;
                        gap: 10px;
                        margin-top: 20px;
                    }
                    
                    button {
                        flex: 1;
                        padding: 10px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                    }
                    
                    .btn-download {
                        background: #28a745;
                        color: white;
                    }
                    
                    .btn-download:hover {
                        background: #218838;
                    }
                    
                    .btn-close {
                        background: #dc3545;
                        color: white;
                    }
                    
                    .btn-close:hover {
                        background: #c82333;
                    }
                    
                    .error-message {
                        color: #dc3545;
                        padding: 15px;
                        text-align: center;
                        background: #f8d7da;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    
                    footer {
                        background: #f8f9fa;
                        padding: 12px;
                        text-align: center;
                        font-size: 11px;
                        color: #999;
                    }
                </style>
            </head>
            <body>
                <div class="player-card">
                    <div class="header">
                        <h2>🎙️ Call Recording Player</h2>
                        <p>Click play to listen to the conversation</p>
                    </div>
                    <div class="content">
                        <div class="call-info">
                            <div class="info-row">
                                <span class="label">📞 From:</span>
                                <span class="value">${transcription.calls?.from_number || 'Unknown'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">🎯 To:</span>
                                <span class="value">${transcription.calls?.to_number || 'Unknown'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">🆔 Recording ID:</span>
                                <span class="value">${transcription.recording_sid ? transcription.recording_sid.substring(0, 12) + '...' : transcriptionId.substring(0, 12) + '...'}</span>
                            </div>
                        </div>
                        
                        <div class="audio-container">
                            <audio controls autoplay preload="auto" crossorigin="anonymous">
                                <source src="${streamUrl}" type="audio/mpeg">
                                Your browser does not support the audio element.
                            </audio>
                            <p style="font-size: 12px; color: #666; margin-top: 10px;">
                                🎧 Click play to listen
                            </p>
                        </div>
                        
                        <div class="button-group">
                            <button class="btn-download" onclick="downloadRecording()">💾 Download</button>
                            <button class="btn-close" onclick="window.close()">❌ Close</button>
                        </div>
                    </div>
                    <footer>
                        Recording streamed via backend proxy
                    </footer>
                </div>
                
                <script>
                    const streamUrl = '${streamUrl}';
                    
                    function downloadRecording() {
                        window.open(streamUrl, '_blank');
                    }
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        logger.error('Error loading audio player:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Error</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2>❌ Error Loading Recording</h2>
                <p>${error.message}</p>
                <button onclick="window.close()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">Close</button>
            </body>
            </html>
        `);
    }
};

// ============================================
// WORKING HOURS MANAGEMENT
// ============================================




// NOTE: this is a drop-in replacement for the four exports you shared
// (getWorkingHours, updateWorkingHours, updateWorkingHourById,
// updateWorkingHourByDay). Any other exports/requires/helpers in your
// original file (executeQuery, logger, getHospitalId, etc.) are assumed
// unchanged — only the bodies of these four functions differ from what
// you sent, and only where noted with ✅.

// Get all working hours (admin only) — UNCHANGED
exports.getWorkingHours = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { appointment_type } = req.query;

        let query = `
            SELECT id, day_of_week, is_open, open_time, close_time, 
                   appointment_type, slot_duration, created_at, updated_at
            FROM working_hours
            WHERE hospital_id = $1
        `;
        let params = [hospitalId];
        let paramIndex = 2;

        if (appointment_type) {
            query += ` AND (appointment_type = $${paramIndex} OR appointment_type = 'all')`;
            params.push(appointment_type);
            paramIndex++;
        }

        query += ` ORDER BY 
            CASE day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
                WHEN 'Sunday' THEN 7
            END`;

        const result = await executeQuery(query, params);

        const workingHours = (result.rows || []).map(row => ({
            id: row.id,
            day_of_week: row.day_of_week,
            is_open: row.is_open,
            open_time: row.open_time ? row.open_time.substring(0, 5) : null,
            close_time: row.close_time ? row.close_time.substring(0, 5) : null,
            appointment_type: row.appointment_type,
            slot_duration: row.slot_duration
        }));

        // ✅ Returns [] for a hospital with zero rows configured — this is
        // an expected, valid state (see frontend empty-state handling),
        // not an error.
        res.json({
            success: true,
            data: workingHours,
            count: workingHours.length
        });

    } catch (error) {
        logger.error('Error fetching working hours:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch working hours'
        });
    }
};

// Update working hours (admin only)
exports.updateWorkingHours = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { working_hours } = req.body;

        if (!working_hours || !Array.isArray(working_hours) || working_hours.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'working_hours array is required'
            });
        }

        const results = [];
        const errors = [];

        for (const item of working_hours) {
            const { id, day_of_week, is_open, open_time, close_time, appointment_type, slot_duration } = item;

            if (!id && !day_of_week) {
                errors.push({ item, error: 'Either id or day_of_week is required' });
                continue;
            }

            if (is_open === true && (!open_time || !close_time)) {
                errors.push({ item, error: 'open_time and close_time are required when is_open is true' });
                continue;
            }

            try {
                let result;

                // ✅ UNCHANGED: updating by a specific id must never create a
                // row. If the client believes a row exists (it's sending an
                // id), a miss here is a genuine "not found", not a signal to
                // insert — that stays an error below.
                if (id) {
                    result = await executeQuery(`
                        UPDATE working_hours 
                        SET is_open = $1, 
                            open_time = $2, 
                            close_time = $3, 
                            appointment_type = $4,
                            slot_duration = $5,
                            updated_at = NOW()
                        WHERE id = $6 AND hospital_id = $7
                        RETURNING *
                    `, [is_open, open_time, close_time, appointment_type || 'all', slot_duration || 30, id, hospitalId]);

                } else if (day_of_week) {
                    // ✅ CHANGED: day_of_week-based calls now upsert. This is
                    // the path the "Add Working Hours" frontend flow uses for
                    // a day that has no row yet (new hospital, or a day never
                    // configured before) — it's a legitimate create, not an
                    // update-miss. Requires the UNIQUE(hospital_id, day_of_week)
                    // constraint from the migration to be safe under concurrent
                    ///duplicate submissions.
                    result = await executeQuery(`
                        INSERT INTO working_hours
                            (hospital_id, day_of_week, is_open, open_time, close_time, appointment_type, slot_duration, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                        ON CONFLICT (hospital_id, day_of_week, appointment_type)
                        DO UPDATE SET
                            is_open = EXCLUDED.is_open,
                            open_time = EXCLUDED.open_time,
                            close_time = EXCLUDED.close_time,
                            slot_duration = EXCLUDED.slot_duration,
                            updated_at = NOW()
                        RETURNING *
                    `, [hospitalId, day_of_week, is_open, open_time, close_time, appointment_type || 'all', slot_duration || 30]);
                }

                if (result.rows.length > 0) {
                    results.push({
                        id: result.rows[0].id,
                        day_of_week: result.rows[0].day_of_week,
                        is_open: result.rows[0].is_open,
                        open_time: result.rows[0].open_time ? result.rows[0].open_time.substring(0, 5) : null,
                        close_time: result.rows[0].close_time ? result.rows[0].close_time.substring(0, 5) : null,
                        updated: true
                    });
                } else {
                    // ✅ Only reachable now via the id-based branch — the
                    // day_of_week branch always returns a row (insert or
                    // update) via the upsert above.
                    errors.push({ item, error: 'Working hour entry not found or not owned by this hospital' });
                }

            } catch (itemError) {
                logger.error(`Error updating working hour: ${itemError.message}`);
                errors.push({ item, error: itemError.message });
            }
        }

        res.json({
            success: errors.length === 0,
            data: {
                updated: results,
                errors: errors.length > 0 ? errors : null
            },
            message: errors.length === 0 ? 'Working hours updated successfully' : 'Some updates failed'
        });

    } catch (error) {
        logger.error('Error updating working hours:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update working hours'
        });
    }
};

// Update single working hour by ID (admin only) — UNCHANGED
// Deliberately stays update-only: a client hitting this by id already
// believes the row exists, so there is nothing sensible to "create".
exports.updateWorkingHourById = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { is_open, open_time, close_time, appointment_type, slot_duration } = req.body;

        if (is_open === undefined && open_time === undefined && close_time === undefined &&
            appointment_type === undefined && slot_duration === undefined) {
            return res.status(400).json({
                success: false,
                error: 'At least one field to update is required'
            });
        }

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (is_open !== undefined) {
            updates.push(`is_open = $${paramIndex++}`);
            values.push(is_open);
        }
        if (open_time !== undefined) {
            updates.push(`open_time = $${paramIndex++}`);
            values.push(open_time);
        }
        if (close_time !== undefined) {
            updates.push(`close_time = $${paramIndex++}`);
            values.push(close_time);
        }
        if (appointment_type !== undefined) {
            updates.push(`appointment_type = $${paramIndex++}`);
            values.push(appointment_type);
        }
        if (slot_duration !== undefined) {
            updates.push(`slot_duration = $${paramIndex++}`);
            values.push(slot_duration);
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);
        values.push(hospitalId);

        const result = await executeQuery(`
            UPDATE working_hours 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex} AND hospital_id = $${paramIndex + 1}
            RETURNING *
        `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Working hour entry not found or not owned by this hospital'
            });
        }

        res.json({
            success: true,
            data: {
                id: result.rows[0].id,
                day_of_week: result.rows[0].day_of_week,
                is_open: result.rows[0].is_open,
                open_time: result.rows[0].open_time ? result.rows[0].open_time.substring(0, 5) : null,
                close_time: result.rows[0].close_time ? result.rows[0].close_time.substring(0, 5) : null,
                appointment_type: result.rows[0].appointment_type,
                slot_duration: result.rows[0].slot_duration
            },
            message: 'Working hour updated successfully'
        });

    } catch (error) {
        logger.error('Error updating working hour:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update working hour'
        });
    }
};

// Update working hour by day_of_week (admin only)
exports.updateWorkingHourByDay = async (req, res) => {
    try {
        const { day } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { is_open, open_time, close_time, appointment_type, slot_duration } = req.body;

        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validDays.includes(day)) {
            return res.status(400).json({
                success: false,
                error: `Invalid day. Must be one of: ${validDays.join(', ')}`
            });
        }

        if (is_open === undefined && open_time === undefined && close_time === undefined &&
            appointment_type === undefined && slot_duration === undefined) {
            return res.status(400).json({
                success: false,
                error: 'At least one field to update is required'
            });
        }

        // ✅ CHANGED: this route is single-day by nature (used for edits from
        // the UI's per-day form) so it now upserts too, for the same reason
        // as updateWorkingHours' day_of_week branch — a day with no row yet
        // is a valid "add", not a 404.
        //
        // Partial-field updates (only is_open, say) plus a first-time insert
        // need sane defaults for the columns not provided, since there's no
        // existing row to fall back on:
        const insertIsOpen = is_open !== undefined ? is_open : false;
        const insertOpenTime = open_time !== undefined ? open_time : null;
        const insertCloseTime = close_time !== undefined ? close_time : null;
        const insertAppointmentType = appointment_type !== undefined ? appointment_type : 'all';
        const insertSlotDuration = slot_duration !== undefined ? slot_duration : 30;

        if (insertIsOpen === true && (!insertOpenTime || !insertCloseTime)) {
            return res.status(400).json({
                success: false,
                error: 'open_time and close_time are required when is_open is true'
            });
        }

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (is_open !== undefined) {
            updates.push(`is_open = $${paramIndex++}`);
            values.push(is_open);
        }
        if (open_time !== undefined) {
            updates.push(`open_time = $${paramIndex++}`);
            values.push(open_time);
        }
        if (close_time !== undefined) {
            updates.push(`close_time = $${paramIndex++}`);
            values.push(close_time);
        }
        if (appointment_type !== undefined) {
            updates.push(`appointment_type = $${paramIndex++}`);
            values.push(appointment_type);
        }
        if (slot_duration !== undefined) {
            updates.push(`slot_duration = $${paramIndex++}`);
            values.push(slot_duration);
        }

        updates.push(`updated_at = NOW()`);
        values.push(day);
        values.push(hospitalId);

        let result = await executeQuery(`
            UPDATE working_hours 
            SET ${updates.join(', ')}
            WHERE day_of_week = $${paramIndex} AND hospital_id = $${paramIndex + 1}
            RETURNING *
        `, values);

        // ✅ NEW: no existing row — create it with the resolved defaults.
        if (result.rows.length === 0) {
            result = await executeQuery(`
                INSERT INTO working_hours
                    (hospital_id, day_of_week, is_open, open_time, close_time, appointment_type, slot_duration, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                ON CONFLICT (hospital_id, day_of_week, appointment_type)
                DO UPDATE SET
                    is_open = EXCLUDED.is_open,
                    open_time = EXCLUDED.open_time,
                    close_time = EXCLUDED.close_time,
                    slot_duration = EXCLUDED.slot_duration,
                    updated_at = NOW()
                RETURNING *
            `, [hospitalId, day, insertIsOpen, insertOpenTime, insertCloseTime, insertAppointmentType, insertSlotDuration]);
        }

        res.json({
            success: true,
            data: {
                id: result.rows[0].id,
                day_of_week: result.rows[0].day_of_week,
                is_open: result.rows[0].is_open,
                open_time: result.rows[0].open_time ? result.rows[0].open_time.substring(0, 5) : null,
                close_time: result.rows[0].close_time ? result.rows[0].close_time.substring(0, 5) : null,
                appointment_type: result.rows[0].appointment_type,
                slot_duration: result.rows[0].slot_duration
            },
            message: `Working hours for ${day} updated successfully`
        });

    } catch (error) {
        logger.error('Error updating working hour:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update working hour'
        });
    }
};

// ============================================
// PRICING MANAGEMENT
// ============================================

// Get all pricing categories with their items
exports.getPricing = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        // Get all categories for this hospital
        const categoriesResult = await executeQuery(`
            SELECT id, name, display_order, is_active, created_at, updated_at
            FROM pricing_categories
            WHERE hospital_id = $1 AND is_active = true
            ORDER BY display_order ASC, id ASC
        `, [hospitalId]);
        
        const categories = [];
        
        // For each category, get its items (which also belong to the hospital)
        for (const category of categoriesResult.rows) {
            const itemsResult = await executeQuery(`
                SELECT id, service_name, price, description, display_order, is_active
                FROM pricing_items
                WHERE category_id = $1 AND hospital_id = $2 AND is_active = true
                ORDER BY display_order ASC, id ASC
            `, [category.id, hospitalId]);
            
            categories.push({
                id: category.id,
                name: category.name,
                display_order: category.display_order,
                services: itemsResult.rows.map(item => ({
                    id: item.id,
                    service_name: item.service_name,
                    price: parseFloat(item.price),
                    description: item.description,
                    display_order: item.display_order
                }))
            });
        }
        
        res.json({
            success: true,
            data: categories,
            count: categories.length
        });
        
    } catch (error) {
        logger.error('Error fetching pricing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pricing'
        });
    }
};



// Update a single Category (by ID)
exports.updatePricingCategory = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }
 
        const { id } = req.params;
        const { name, display_order } = req.body;
 
        if (!name) {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }
 
        const result = await executeQuery(`
            UPDATE pricing_categories 
            SET name = $1, display_order = $2, updated_at = NOW()
            WHERE id = $3 AND hospital_id = $4
            RETURNING id, name, display_order
        `, [name, display_order || 0, id, hospitalId]);
 
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Category not found or not owned by this hospital' });
        }
 
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Category updated successfully'
        });
 
    } catch (error) {
        logger.error('Error updating pricing category:', error);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
};
 
// Update a single Service/Item (by ID)
exports.updatePricingItem = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }
 
        const { id } = req.params;
        const { service_name, price, description, display_order } = req.body;
 
        if (!service_name || price === undefined) {
            return res.status(400).json({ success: false, error: 'service_name and price are required' });
        }
 
        // Verify the item belongs to a category owned by this hospital
        const checkResult = await executeQuery(`
            SELECT pi.id 
            FROM pricing_items pi
            JOIN pricing_categories pc ON pi.category_id = pc.id
            WHERE pi.id = $1 AND pc.hospital_id = $2
        `, [id, hospitalId]);
 
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Service not found or not owned by this hospital' });
        }
 
        const result = await executeQuery(`
            UPDATE pricing_items 
            SET service_name = $1, price = $2, description = $3, display_order = $4, updated_at = NOW()
            WHERE id = $5
            RETURNING id, category_id, service_name, price, description, display_order
        `, [service_name, price, description || null, display_order || 0, id]);
 
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Service updated successfully'
        });
 
    } catch (error) {
        logger.error('Error updating pricing item:', error);
        res.status(500).json({ success: false, error: 'Failed to update service' });
    }
};



//// Update pricing (bulk update - categories and items)
exports.updatePricing = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { categories } = req.body;
        
        if (!categories || !Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                error: 'categories array is required'
            });
        }
        
        const results = {
            categories_updated: [],
            items_updated: [],
            items_added: [],
            items_deleted: [],
            errors: []
        };
        
        for (const categoryData of categories) {
            try {
                let categoryId = categoryData.id;
                
                if (categoryId) {
                    // Update existing category – ensure it belongs to the hospital
                    await executeQuery(`
                        UPDATE pricing_categories 
                        SET name = $1, display_order = $2, is_active = $3, updated_at = NOW()
                        WHERE id = $4 AND hospital_id = $5
                    `, [categoryData.name, categoryData.display_order || 0, categoryData.is_active !== false, categoryId, hospitalId]);
                    
                    results.categories_updated.push({ id: categoryId, name: categoryData.name });
                } else if (categoryData.name) {
                    // Create new category with hospital_id
                    const newCategory = await executeQuery(`
                        INSERT INTO pricing_categories (name, display_order, is_active, hospital_id)
                        VALUES ($1, $2, $3, $4)
                        RETURNING id
                    `, [categoryData.name, categoryData.display_order || 0, categoryData.is_active !== false, hospitalId]);
                    
                    categoryId = newCategory.rows[0].id;
                    results.categories_updated.push({ id: categoryId, name: categoryData.name, is_new: true });
                }
                
                if (!categoryId) continue;
                
                // Process services/items for this category
                if (categoryData.services && Array.isArray(categoryData.services)) {
                    // Get existing item IDs for this category and hospital
                    const existingItems = await executeQuery(`
                        SELECT id FROM pricing_items WHERE category_id = $1 AND hospital_id = $2
                    `, [categoryId, hospitalId]);
                    
                    const existingItemIds = new Set(existingItems.rows.map(row => row.id));
                    const updatedItemIds = new Set();
                    
                    for (const itemData of categoryData.services) {
                        if (itemData.id) {
                            // Update existing item – ensure it belongs to the hospital
                            await executeQuery(`
                                UPDATE pricing_items 
                                SET service_name = $1, price = $2, description = $3, 
                                    display_order = $4, is_active = $5, updated_at = NOW()
                                WHERE id = $6 AND category_id = $7 AND hospital_id = $8
                            `, [
                                itemData.service_name, 
                                itemData.price, 
                                itemData.description || null,
                                itemData.display_order || 0,
                                itemData.is_active !== false,
                                itemData.id,
                                categoryId,
                                hospitalId
                            ]);
                            
                            updatedItemIds.add(itemData.id);
                            results.items_updated.push({ id: itemData.id, service_name: itemData.service_name });
                            
                        } else if (itemData.service_name && itemData.price !== undefined) {
                            // Create new item with hospital_id
                            const newItem = await executeQuery(`
                                INSERT INTO pricing_items (category_id, service_name, price, description, display_order, is_active, hospital_id)
                                VALUES ($1, $2, $3, $4, $5, $6, $7)
                                RETURNING id
                            `, [
                                categoryId,
                                itemData.service_name,
                                itemData.price,
                                itemData.description || null,
                                itemData.display_order || 0,
                                itemData.is_active !== false,
                                hospitalId
                            ]);
                            
                            updatedItemIds.add(newItem.rows[0].id);
                            results.items_added.push({ 
                                id: newItem.rows[0].id, 
                                service_name: itemData.service_name,
                                category_id: categoryId
                            });
                        }
                    }
                    
                    // Delete items that were not in the update (if explicitly marked for deletion)
                    for (const existingId of existingItemIds) {
                        if (!updatedItemIds.has(existingId)) {
                            const shouldDelete = categoryData.services.some(s => s.id === existingId && s._delete === true);
                            if (shouldDelete) {
                                await executeQuery(`DELETE FROM pricing_items WHERE id = $1 AND hospital_id = $2`, [existingId, hospitalId]);
                                results.items_deleted.push({ id: existingId });
                            }
                        }
                    }
                }
                
            } catch (categoryError) {
                logger.error(`Error updating category: ${categoryError.message}`);
                results.errors.push({ category: categoryData.name, error: categoryError.message });
            }
        }
        
        res.json({
            success: results.errors.length === 0,
            data: results,
            message: results.errors.length === 0 ? 'Pricing updated successfully' : 'Some updates failed'
        });
        
    } catch (error) {
        logger.error('Error updating pricing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update pricing'
        });
    }
};

// Add new category
exports.addPricingCategory = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { name, display_order } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }
        
        const result = await executeQuery(`
            INSERT INTO pricing_categories (name, display_order, is_active, hospital_id)
            VALUES ($1, $2, true, $3)
            RETURNING id, name, display_order
        `, [name, display_order || 0, hospitalId]);
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Category added successfully'
        });
        
    } catch (error) {
        logger.error('Error adding pricing category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add category'
        });
    }
};

// Add new service item to category
exports.addPricingItem = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { category_id, service_name, price, description, display_order } = req.body;
        
        if (!category_id || !service_name || price === undefined) {
            return res.status(400).json({
                success: false,
                error: 'category_id, service_name, and price are required'
            });
        }

        // Verify category belongs to this hospital
        const categoryCheck = await executeQuery(
            `SELECT id FROM pricing_categories WHERE id = $1 AND hospital_id = $2`,
            [category_id, hospitalId]
        );
        if (categoryCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Category not found or not owned by this hospital'
            });
        }
        
        const result = await executeQuery(`
            INSERT INTO pricing_items (category_id, service_name, price, description, display_order, is_active, hospital_id)
            VALUES ($1, $2, $3, $4, $5, true, $6)
            RETURNING id, category_id, service_name, price, description, display_order
        `, [category_id, service_name, price, description || null, display_order || 0, hospitalId]);
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Service added successfully'
        });
        
    } catch (error) {
        logger.error('Error adding pricing item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add service'
        });
    }
};

// Delete category (soft delete - set is_active = false)
exports.deletePricingCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            UPDATE pricing_categories 
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND hospital_id = $2
            RETURNING id, name
        `, [id, hospitalId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Category not found or not owned by this hospital'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Category deleted successfully'
        });
        
    } catch (error) {
        logger.error('Error deleting pricing category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete category'
        });
    }
};

// Delete service item (soft delete - set is_active = false)
exports.deletePricingItem = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            UPDATE pricing_items 
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND hospital_id = $2
            RETURNING id, service_name
        `, [id, hospitalId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Service not found or not owned by this hospital'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Service deleted successfully'
        });
        
    } catch (error) {
        logger.error('Error deleting pricing item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete service'
        });
    }
};

// // ============================================
// // EMAIL LOGS MANAGEMENT
// // ============================================


// Get all email logs with filtering and pagination
exports.getEmailLogs = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const {
            page = 1,
            limit = 50,
            status,
            start_date,
            end_date,
            search
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [hospitalId];
        let paramIndex = 2;
        let whereClauses = [`el.hospital_id = $1`];

        if (status) {
            whereClauses.push(`el.status = $${paramIndex++}`);
            params.push(status);
        }
        if (start_date) {
            whereClauses.push(`el.created_at >= $${paramIndex++}`);
            params.push(start_date);
        }
        if (end_date) {
            whereClauses.push(`el.created_at <= $${paramIndex++}`);
            params.push(end_date);
        }
        if (search) {
            whereClauses.push(`(el.to_email ILIKE $${paramIndex} OR el.subject ILIKE $${paramIndex} OR el.caller_name ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Count total records
        const countQuery = `SELECT COUNT(*) FROM email_logs el ${whereSql}`;
        const countResult = await executeQuery(countQuery, params.slice(0, paramIndex - 1));
        const total = parseInt(countResult.rows[0].count);

        // Fetch paginated data with call and patient details
        const dataQuery = `
            SELECT 
                el.id,
                el.call_sid,
                el.call_id,
                el.to_email,
                el.from_email,
                el.subject,
                el.caller_name,
                el.caller_number,
                el.reason_for_call,
                el.call_summary,
                el.call_transcription,
                el.call_date,
                el.call_duration,
                el.status,
                el.error_message,
                el.sent_at,
                el.created_at,
                c.from_number as call_from_number,
                c.to_number as call_to_number,
                p.name as patient_name,
                p.phone as patient_phone
            FROM email_logs el
            LEFT JOIN calls c ON c.id = el.call_id
            LEFT JOIN patients p ON p.id::text = el.patient_id
            ${whereSql}
            ORDER BY el.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(parseInt(limit), offset);
        const dataResult = await executeQuery(dataQuery, params);

        res.json({
            success: true,
            data: dataResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error fetching email logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch email logs'
        });
    }
};

// Get email logs statistics (for admin dashboard) - hospital-specific
exports.getEmailLogsStats = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        // Total emails sent, failed, error for this hospital
        const totalsResult = await executeQuery(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
            FROM email_logs
            WHERE hospital_id = $1
        `, [hospitalId]);

        // Last 7 days activity for this hospital
        const last7DaysResult = await executeQuery(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent
            FROM email_logs
            WHERE created_at >= NOW() - INTERVAL '7 days' AND hospital_id = $1
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [hospitalId]);

        res.json({
            success: true,
            data: {
                totals: totalsResult.rows[0] || { total: 0, sent: 0, failed: 0, error: 0 },
                last_7_days: last7DaysResult.rows || []
            }
        });
    } catch (error) {
        logger.error('Error fetching email logs stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch email logs statistics'
        });
    }
};

// ============================================
// EMAIL CONFIGURATION
// ============================================
// Placeholder shown to the client instead of real secrets. Must match the
// frontend's SECRET_MASK constant exactly — updateEmailConfig uses this
// value to detect "user didn't change this field, keep the old secret".
const SECRET_MASK = '••••••••';

// Small helper: given a raw DB value, decide what to send to the client
// (mask if present, null if not set at all).
const maskIfPresent = (value) => (value ? SECRET_MASK : null);

// Get active email configuration (secrets masked) - hospital-specific
exports.getEmailConfig = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const result = await executeQuery(`
            SELECT id, type,
                   smtp_host, smtp_port, smtp_username, smtp_password,
                   from_email, to_email,
                   google_client_id, google_client_secret, google_refresh_token,
                   google_email, admin_email, google_redirect_uri,
                   is_active, created_at, updated_at
            FROM email_config
            WHERE hospital_id = $1 AND is_active = true
            ORDER BY updated_at DESC
            LIMIT 1
        `, [hospitalId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No active email configuration found for this hospital'
            });
        }

        const config = result.rows[0];

        // Mask secrets — never send the real value back to the client.
        config.smtp_password = maskIfPresent(config.smtp_password);
        config.google_client_secret = maskIfPresent(config.google_client_secret);
        config.google_refresh_token = maskIfPresent(config.google_refresh_token);

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        logger.error('Error fetching email config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch email configuration'
        });
    }
};

// Create a new email configuration - hospital-specific
// One config per hospital+type, enforced by a DB unique constraint.
exports.createEmailConfig = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const body = req.body;
        const isSmtp = body.smtp_host !== undefined;
        const isGmail = body.google_client_id !== undefined;

        if (!isSmtp && !isGmail) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: either SMTP or Gmail API fields'
            });
        }

        let type, result;

        if (isSmtp) {
            const {
                smtp_host,
                smtp_port,
                smtp_username,
                smtp_password,
                from_email,
                to_email,
                is_active = true
            } = body;

            if (!smtp_host || !smtp_port || !smtp_username || !smtp_password || !from_email || !to_email) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required SMTP fields'
                });
            }

            type = 'smtp';

            result = await executeQuery(`
                INSERT INTO email_config (
                    type, smtp_host, smtp_port, smtp_username, smtp_password,
                    from_email, to_email, is_active, hospital_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING id, type, smtp_host, smtp_port, smtp_username, from_email, to_email, is_active
            `, [type, smtp_host, smtp_port, smtp_username, smtp_password, from_email, to_email, is_active, hospitalId]);

        } else {
            const {
                google_client_id,
                google_client_secret,
                google_refresh_token,
                google_email,
                admin_email,
                google_redirect_uri,
                is_active = true
            } = body;

            if (!google_client_id || !google_client_secret || !google_refresh_token || !google_email || !admin_email) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required Gmail API fields'
                });
            }

            type = 'gmail';

            result = await executeQuery(`
                INSERT INTO email_config (
                    type, google_client_id, google_client_secret, google_refresh_token,
                    google_email, admin_email, google_redirect_uri, is_active, hospital_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING id, type, google_client_id, google_email, admin_email, google_redirect_uri, is_active
            `, [type, google_client_id, google_client_secret, google_refresh_token, google_email, admin_email, google_redirect_uri || null, is_active, hospitalId]);
        }

        const newRow = result.rows[0];

        // If this new config is active, deactivate every OTHER config for
        // this hospital regardless of type — only one config should be
        // "the" active one at a time.
        if (newRow.is_active === true) {
            await executeQuery(`
                UPDATE email_config
                SET is_active = false
                WHERE id != $1 AND hospital_id = $2
            `, [newRow.id, hospitalId]);
        }

        res.status(201).json({
            success: true,
            data: newRow,
            message: 'Email configuration created successfully'
        });
    } catch (error) {
        // Unique constraint violation = a config of this type already exists
        // for this hospital.
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'A configuration of this type already exists for your hospital. Edit the existing one instead.'
            });
        }
        logger.error('Error creating email config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create email configuration'
        });
    }
};

// Update an existing email configuration by id - hospital-specific
// Secret fields: if omitted or equal to SECRET_MASK, the old value is kept.
exports.updateEmailConfig = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { id } = req.params;
        const body = req.body;

        // Load the existing row, scoped to this hospital, so we know its
        // type and can fall back to its current secret values.
        const existingResult = await executeQuery(
            `SELECT * FROM email_config WHERE id = $1 AND hospital_id = $2 LIMIT 1`,
            [id, hospitalId]
        );

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Email configuration not found' });
        }

        const existing = existingResult.rows[0];
        const type = existing.type;
        let result;

        // Use the new value unless it's blank or the mask placeholder, in
        // which case keep whatever is already in the DB.
        const keepIfUnset = (incoming, current) =>
            (incoming === undefined || incoming === '' || incoming === SECRET_MASK) ? current : incoming;

        if (type === 'smtp') {
            const smtp_host = body.smtp_host ?? existing.smtp_host;
            const smtp_port = body.smtp_port ?? existing.smtp_port;
            const smtp_username = body.smtp_username ?? existing.smtp_username;
            const smtp_password = keepIfUnset(body.smtp_password, existing.smtp_password);
            const from_email = body.from_email ?? existing.from_email;
            const to_email = body.to_email ?? existing.to_email;
            const is_active = body.is_active ?? existing.is_active;

            if (!smtp_host || !smtp_port || !smtp_username || !smtp_password || !from_email || !to_email) {
                return res.status(400).json({ success: false, error: 'Missing required SMTP fields' });
            }

            result = await executeQuery(`
                UPDATE email_config 
                SET smtp_host = $1, smtp_port = $2, smtp_username = $3, smtp_password = $4,
                    from_email = $5, to_email = $6, is_active = $7, updated_at = NOW()
                WHERE id = $8 AND hospital_id = $9
                RETURNING id, type, smtp_host, smtp_port, smtp_username, from_email, to_email, is_active
            `, [smtp_host, smtp_port, smtp_username, smtp_password, from_email, to_email, is_active, id, hospitalId]);

        } else {
            const google_client_id = body.google_client_id ?? existing.google_client_id;
            const google_client_secret = keepIfUnset(body.google_client_secret, existing.google_client_secret);
            const google_refresh_token = keepIfUnset(body.google_refresh_token, existing.google_refresh_token);
            const google_email = body.google_email ?? existing.google_email;
            const admin_email = body.admin_email ?? existing.admin_email;
            const google_redirect_uri = body.google_redirect_uri ?? existing.google_redirect_uri;
            const is_active = body.is_active ?? existing.is_active;

            if (!google_client_id || !google_client_secret || !google_refresh_token || !google_email || !admin_email) {
                return res.status(400).json({ success: false, error: 'Missing required Gmail API fields' });
            }

            result = await executeQuery(`
                UPDATE email_config 
                SET google_client_id = $1, google_client_secret = $2, google_refresh_token = $3,
                    google_email = $4, admin_email = $5, google_redirect_uri = $6,
                    is_active = $7, updated_at = NOW()
                WHERE id = $8 AND hospital_id = $9
                RETURNING id, type, google_client_id, google_email, admin_email, google_redirect_uri, is_active
            `, [google_client_id, google_client_secret, google_refresh_token, google_email, admin_email, google_redirect_uri, is_active, id, hospitalId]);
        }

        const updatedRow = result.rows[0];

        // Same "only one active config per hospital" rule as create.
        if (updatedRow.is_active === true) {
            await executeQuery(`
                UPDATE email_config 
                SET is_active = false 
                WHERE id != $1 AND hospital_id = $2
            `, [updatedRow.id, hospitalId]);
        }

        res.json({
            success: true,
            data: updatedRow,
            message: 'Email configuration updated successfully'
        });
    } catch (error) {
        logger.error('Error updating email config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update email configuration'
        });
    }
};

// Delete an email configuration by id - hospital-specific
exports.deleteEmailConfig = async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        if (!hospitalId) {
            return res.status(403).json({ success: false, error: 'No hospital associated with this admin' });
        }

        const { id } = req.params;

        const result = await executeQuery(
            `DELETE FROM email_config WHERE id = $1 AND hospital_id = $2 RETURNING id`,
            [id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Email configuration not found' });
        }

        res.json({ success: true, message: 'Email configuration deleted successfully' });
    } catch (error) {
        logger.error('Error deleting email config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete email configuration'
        });
    }
};






// ==============================
// UPDATE CREDENTIALS (ADMIN ONLY)
// ==============================
exports.updateAdminCredentials = async (req, res) => {
    try {
        // Get hospitalId from token (set by auth middleware)
        const hospitalId = req.hospitalId || (req.user && req.user.hospital_id);
        if (!hospitalId) {
            return res.status(400).json({
                success: false,
                message: 'Hospital ID not found in token. Please ensure you are logged in as an admin.'
            });
        }

        // Allowed fields (same as superadmin)
        const allowedFields = [
            'google_client_id',
            'google_client_secret',
            'google_calendar_refresh_token',
            'google_gmail_refresh_token',
            'admin_email',
            'google_email',
            'ezy_vet_partner_id',
            'ezy_vet_client_id',
            'ezy_vet_client_secret',
            'ezy_vet_grant_type',
            'ezy_vet_scope',
            'ezy_vet_site_uid'
        ];

        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update.'
            });
        }

        // Perform the update
        await credentialService.updateCredentialsFields(hospitalId, updateData);

        // Fetch updated credentials (uppercase keys)
        const updatedCredentials = await credentialService.getCredentials(hospitalId);

        return res.status(200).json({
            success: true,
            message: `Credentials updated successfully.`,
            data: updatedCredentials
        });

    } catch (error) {
        console.error('Error updating credentials (admin):', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update credentials.'
        });
    }
};





exports.getAdminCredentials = async (req, res) => {
    try {
        // Get hospitalId from token (set by auth middleware)
        const hospitalId = req.hospitalId || (req.user && req.user.hospital_id);
        if (!hospitalId) {
            return res.status(403).json({
                success: false,
                error: 'No hospital associated with this admin'
            });
        }

        // Fetch full credentials (decrypted)
        const decryptedData = await credentialService.getCredentials(hospitalId);

        // Extract only the fields we want
        const filteredData = {
            HOSPITAL_ID: decryptedData.HOSPITAL_ID,
            HOSPITAL_NAME: decryptedData.HOSPITAL_NAME,
            ADMIN_EMAIL: decryptedData.ADMIN_EMAIL
        };

        res.json({
            success: true,
            data: filteredData
        });

    } catch (error) {
        console.error('Error in getAdminCredentials:', error);

        if (error.message && error.message.includes('No credentials found')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve admin credentials.'
        });
    }
};