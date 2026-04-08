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
        const profiles = await supabaseSelect(
            'onboarding_responses',
            `user_id=eq.${user.user_id}&select=*`
        );

        if (profiles.length === 0) {
            return res.status(200).json({
                success: true,
                completed: false,
                profile: null,
            });
        }

        const p = profiles[0];
        return res.status(200).json({
            success: true,
            completed: !!p.onboarding_completed,
            profile: {
                primary_focus: p.primary_focus,
                motivation_type: p.motivation_type,
                preferred_slot: p.preferred_slot,
                recovery_style: p.recovery_style,
                priority_boost: p.priority_boost || 0,
                motivation_weight: p.motivation_weight || 0,
                slot_weight: p.slot_weight || 0.5,
                repair_strategy_bias: p.repair_strategy_bias || 'move_today',
            },
        });
    } catch (error) {
        console.error('Onboarding status error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
