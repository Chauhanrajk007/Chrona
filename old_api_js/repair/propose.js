const { requireAuth } = require('../lib/jwt');
const { supabaseSelect, supabaseInsert } = require('../lib/supabase-admin');
const { setCors, parseBody } = require('../lib/utils');

function getTimeSlot(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

function getBestSlot(slotWeights) {
    const slots = Object.entries(slotWeights);
    if (slots.length === 0) return { slot: 'evening', weight: 0.5 };
    slots.sort((a, b) => b[1] - a[1]);
    return { slot: slots[0][0], weight: slots[0][1] };
}

function getSlotStartHour(slot) {
    switch (slot) {
        case 'morning': return 8;
        case 'afternoon': return 13;
        case 'evening': return 18;
        case 'night': return 21;
        default: return 18;
    }
}

const SUPPORTIVE_MESSAGES = [
    "Starting now still counts. Even 10 minutes makes a difference.",
    "You missed the scheduled time, but here's a slot that works better for you.",
    "Progress over perfection. Let's keep the momentum going.",
    "One missed task doesn't ruin the day. Here's your recovery plan.",
    "Your best work doesn't have to be on schedule — it just has to happen.",
];

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const { missed_task_id } = await parseBody(req);

        let slotWeights = { morning: 0.5, afternoon: 0.5, evening: 0.5, night: 0.5 };
        try {
            const profiles = await supabaseSelect('behavior_profiles', `user_id=eq.${user.user_id}&select=slot_weights`);
            if (profiles.length > 0 && profiles[0].slot_weights) {
                slotWeights = profiles[0].slot_weights;
            }
        } catch (e) { /* use defaults */ }

        const now = new Date();
        const currentSlot = getTimeSlot(now.getHours());
        const bestSlot = getBestSlot(slotWeights);

        const proposedTime = new Date(now);
        if (bestSlot.slot === currentSlot) {
            proposedTime.setMinutes(proposedTime.getMinutes() + 5);
        } else {
            const targetHour = getSlotStartHour(bestSlot.slot);
            if (targetHour <= now.getHours()) {
                proposedTime.setDate(proposedTime.getDate() + 1);
            }
            proposedTime.setHours(targetHour, 0, 0, 0);
        }

        const message = SUPPORTIVE_MESSAGES[Math.floor(Math.random() * SUPPORTIVE_MESSAGES.length)];

        const proposal = {
            original_task_id: missed_task_id,
            proposed_time: proposedTime.toISOString(),
            proposed_slot: bestSlot.slot,
            slot_weight: bestSlot.weight,
            current_slot: currentSlot,
            explanation: message,
            quick_start_option: {
                time: new Date(now.getTime() + 5 * 60000).toISOString(),
                message: "Start right now — even 10 minutes counts.",
            },
        };

        try {
            await supabaseInsert('repair_proposals', {
                user_id: user.user_id,
                proposals: proposal,
                agent_reasoning: `Best slot: ${bestSlot.slot} (weight: ${bestSlot.weight}). Current: ${currentSlot}.`,
            });
        } catch (e) { /* non-fatal */ }

        return res.status(200).json({ success: true, proposal });
    } catch (error) {
        console.error('Repair propose error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
