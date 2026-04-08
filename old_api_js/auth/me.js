const { requireAuth } = require('../lib/jwt');
const { supabaseSelect } = require('../lib/supabase-admin');
const { setCors } = require('../lib/utils');

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        let profile = { archetype: 'student_balanced', slot_weights: {} };
        try {
            const profiles = await supabaseSelect('behavior_profiles', `user_id=eq.${user.user_id}&select=*`);
            if (profiles.length > 0) {
                profile = {
                    archetype: profiles[0].archetype || 'student_balanced',
                    slot_weights: profiles[0].slot_weights || {},
                    type_weights: profiles[0].type_weights || {},
                    sample_count: profiles[0].sample_count || 0,
                };
            }
        } catch (e) { /* non-fatal */ }

        return res.status(200).json({ user_id: user.user_id, username: user.username, profile });
    } catch (error) {
        console.error('Me error:', error);
        return res.status(500).json({ detail: error.message || 'Internal server error' });
    }
};
