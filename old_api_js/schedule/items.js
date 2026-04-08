const { requireAuth } = require('../lib/jwt');
const { supabaseSelect } = require('../lib/supabase-admin');
const { setCors } = require('../lib/utils');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const items = await supabaseSelect(
            'schedule_items',
            `user_id=eq.${user.user_id}&select=*&order=start_time.asc`
        );
        return res.status(200).json({ success: true, items });
    } catch (error) {
        console.error('Schedule items error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
