const { requireAuth } = require('../lib/jwt');
const { supabaseSelect, supabaseInsert } = require('../lib/supabase-admin');
const { setCors, parseBody } = require('../lib/utils');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = requireAuth(req, res);
    if (!user) return;

    // GET — Fetch schedule change log
    if (req.method === 'GET') {
        try {
            const changes = await supabaseSelect(
                'schedule_changes',
                `user_id=eq.${user.user_id}&select=*&order=created_at.desc&limit=50`
            );
            return res.status(200).json({ success: true, changes });
        } catch (error) {
            console.error('Schedule changes GET error:', error);
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }

    // POST — Log a new schedule change
    if (req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const {
                event_id,
                change_type,
                old_datetime,
                new_datetime,
                reason,
                conflicting_event_id,
                metadata,
            } = body;

            if (!change_type || !reason) {
                return res.status(400).json({
                    error: 'Missing required fields: change_type, reason',
                });
            }

            const VALID_TYPES = ['conflict_resolved', 'rescheduled', 'auto_moved', 'user_moved', 'completed', 'skipped'];
            if (!VALID_TYPES.includes(change_type)) {
                return res.status(400).json({
                    error: `Invalid change_type. Must be one of: ${VALID_TYPES.join(', ')}`,
                });
            }

            await supabaseInsert('schedule_changes', {
                user_id: user.user_id,
                event_id: event_id || null,
                change_type,
                old_datetime: old_datetime || null,
                new_datetime: new_datetime || null,
                reason,
                conflicting_event_id: conflicting_event_id || null,
                metadata: metadata || {},
            });

            return res.status(200).json({
                success: true,
                message: 'Schedule change logged',
            });
        } catch (error) {
            console.error('Schedule changes POST error:', error);
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
