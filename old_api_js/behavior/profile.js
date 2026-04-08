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
        const profiles = await supabaseSelect('behavior_profiles', `user_id=eq.${user.user_id}&select=*`);

        if (profiles.length === 0) {
            return res.status(200).json({
                success: true,
                profile: {
                    archetype: 'student_balanced',
                    slot_weights: { morning: 0.5, afternoon: 0.5, evening: 0.5, night: 0.5 },
                    type_weights: {},
                    sample_count: 0,
                },
            });
        }

        const p = profiles[0];
        return res.status(200).json({
            success: true,
            profile: {
                archetype: p.archetype || 'student_balanced',
                slot_weights: p.slot_weights || {},
                type_weights: p.type_weights || {},
                avg_delay_min: p.avg_delay_min || 0,
                sample_count: p.sample_count || 0,
                last_updated: p.last_updated,
            },
        });
    } catch (error) {
        console.error('Behavior profile error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
