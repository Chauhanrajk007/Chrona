const { requireAuth } = require('../lib/jwt');
const { supabaseSelect, supabaseInsert, supabaseUpdate } = require('../lib/supabase-admin');
const { setCors, parseBody } = require('../lib/utils');

// Q1 — Primary Focus → priority_boost
const FOCUS_BOOSTS = {
    exams: 0.2,
    projects: 0.15,
    work: 0.15,
    personal: 0.1,
};

// Q2 — Motivation Type → motivation_weight
const MOTIVATION_WEIGHTS = {
    study: 0.15,
    build: 0.15,
    exercise: 0.1,
    chill: 0.05,
};

// Q3 — Preferred Slot → slot_weight
const SLOT_WEIGHTS = {
    morning: 0.75,
    afternoon: 0.75,
    evening: 0.75,
    night: 0.75,
};

// Q4 — Recovery Style → repair_strategy_bias
const RECOVERY_MAP = {
    postpone: 'postpone_tomorrow',
    same_day: 'move_today',
    break_smaller: 'split_tasks',
};

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const body = await parseBody(req);
        const { primary_focus, motivation_type, preferred_slot, recovery_style } = body;

        if (!primary_focus || !motivation_type || !preferred_slot) {
            return res.status(400).json({ error: 'Missing required fields: primary_focus, motivation_type, preferred_slot' });
        }

        const priority_boost = FOCUS_BOOSTS[primary_focus] || 0.1;
        const motivation_weight = MOTIVATION_WEIGHTS[motivation_type] || 0.1;
        const slot_weight = SLOT_WEIGHTS[preferred_slot] || 0.5;
        const repair_strategy_bias = RECOVERY_MAP[recovery_style] || 'move_today';

        const onboardingData = {
            user_id: user.user_id,
            primary_focus,
            motivation_type,
            preferred_slot,
            recovery_style: recovery_style || 'same_day',
            priority_boost,
            motivation_weight,
            slot_weight,
            repair_strategy_bias,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
        };

        // Check if profile already exists
        const existing = await supabaseSelect(
            'onboarding_responses',
            `user_id=eq.${user.user_id}&select=user_id`
        );

        if (existing.length > 0) {
            await supabaseUpdate(
                'onboarding_responses',
                `user_id=eq.${user.user_id}`,
                onboardingData
            );
        } else {
            await supabaseInsert('onboarding_responses', onboardingData);
        }

        // Also update behavior_profiles slot_weights with preferred slot boost
        try {
            const profiles = await supabaseSelect(
                'behavior_profiles',
                `user_id=eq.${user.user_id}&select=*`
            );

            const defaultWeights = { morning: 0.5, afternoon: 0.5, evening: 0.5, night: 0.5 };
            const weights = profiles.length > 0 ? (profiles[0].slot_weights || defaultWeights) : defaultWeights;
            weights[preferred_slot] = Math.min(0.95, (weights[preferred_slot] || 0.5) + 0.2);

            if (profiles.length > 0) {
                await supabaseUpdate('behavior_profiles', `user_id=eq.${user.user_id}`, {
                    slot_weights: weights,
                    last_updated: new Date().toISOString(),
                });
            } else {
                await supabaseInsert('behavior_profiles', {
                    user_id: user.user_id,
                    archetype: 'student_balanced',
                    slot_weights: weights,
                    sample_count: 0,
                });
            }
        } catch (e) { /* non-fatal */ }

        return res.status(200).json({
            success: true,
            message: 'Onboarding saved successfully',
            profile: {
                primary_focus,
                motivation_type,
                preferred_slot,
                recovery_style: recovery_style || 'same_day',
                priority_boost,
                motivation_weight,
                slot_weight,
                repair_strategy_bias,
            },
        });
    } catch (error) {
        console.error('Onboarding save error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
