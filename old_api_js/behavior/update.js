const { requireAuth } = require('../lib/jwt');
const { supabaseSelect, supabaseUpdate, supabaseInsert } = require('../lib/supabase-admin');
const { setCors, parseBody } = require('../lib/utils');

const SIGNAL_VALUES = {
    completed_on_time: +0.12,
    completed_late: +0.04,
    skipped: -0.18,
    delayed_start: -0.06,
    rescheduled: 0.00,
};

const ALPHA = 0.1;

function getTimeSlot(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const { task_id, signal_type, scheduled_start } = await parseBody(req);

        if (!signal_type || !(signal_type in SIGNAL_VALUES)) {
            return res.status(400).json({
                error: `Invalid signal_type. Must be one of: ${Object.keys(SIGNAL_VALUES).join(', ')}`,
            });
        }

        const signalValue = SIGNAL_VALUES[signal_type];
        const hour = scheduled_start ? new Date(scheduled_start).getHours() : new Date().getHours();
        const slot = getTimeSlot(hour);

        const profiles = await supabaseSelect('behavior_profiles', `user_id=eq.${user.user_id}&select=*`);

        let profile;
        if (profiles.length === 0) {
            await supabaseInsert('behavior_profiles', {
                user_id: user.user_id,
                archetype: 'student_balanced',
                slot_weights: { morning: 0.5, afternoon: 0.5, evening: 0.5, night: 0.5 },
                sample_count: 0,
            });
            profile = { slot_weights: { morning: 0.5, afternoon: 0.5, evening: 0.5, night: 0.5 }, sample_count: 0 };
        } else {
            profile = profiles[0];
        }

        const weights = profile.slot_weights || { morning: 0.5, afternoon: 0.5, evening: 0.5, night: 0.5 };
        const oldWeight = weights[slot] || 0.5;
        const newWeight = clamp(oldWeight + ALPHA * signalValue, 0.1, 0.95);
        weights[slot] = Math.round(newWeight * 100) / 100;

        await supabaseUpdate('behavior_profiles', `user_id=eq.${user.user_id}`, {
            slot_weights: weights,
            sample_count: (profile.sample_count || 0) + 1,
            last_updated: new Date().toISOString(),
        });

        try {
            await supabaseInsert('behavior_events', {
                user_id: user.user_id,
                task_id: task_id || null,
                event_type: signal_type,
                scheduled_start: scheduled_start || null,
                confirmed_at: new Date().toISOString(),
                metadata: { slot, old_weight: oldWeight, new_weight: weights[slot], signal_value: signalValue },
            });
        } catch (e) { /* log error is non-fatal */ }

        return res.status(200).json({
            success: true,
            slot,
            old_weight: oldWeight,
            new_weight: weights[slot],
            signal_type,
            signal_value: signalValue,
            updated_weights: weights,
        });
    } catch (error) {
        console.error('Behavior update error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
