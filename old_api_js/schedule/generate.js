const { requireAuth } = require('../lib/jwt');
const { supabaseSelect } = require('../lib/supabase-admin');
const { setCors } = require('../lib/utils');

function getTimeSlot(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

function getPriorityScore(event) {
    const CATEGORY_WEIGHTS = { exam: 10, hackathon: 9, assignment: 8, meeting: 6, personal: 4, reminder: 2 };
    const SEVERITY_MULTIPLIERS = { low: 1.0, medium: 1.2, high: 1.5, critical: 2.0 };

    const cat = (event.category || '').toLowerCase();
    const sev = (event.severity_level || 'medium').toLowerCase();
    const catWeight = CATEGORY_WEIGHTS[cat] || 3;
    const sevMult = SEVERITY_MULTIPLIERS[sev] || 1.0;

    const eventTime = new Date(event.event_datetime);
    const hoursRemaining = (eventTime - Date.now()) / 3600000;

    let urgency = 2;
    if (hoursRemaining <= 0) urgency = 0;
    else if (hoursRemaining < 1) urgency = 12;
    else if (hoursRemaining < 3) urgency = 10;
    else if (hoursRemaining < 6) urgency = 8;
    else if (hoursRemaining < 12) urgency = 6;
    else if (hoursRemaining < 24) urgency = 4;
    else if (hoursRemaining < 48) urgency = 3;

    const complexity = event.complexity_score || 5;
    const complexBonus = complexity >= 7 ? 2 : complexity >= 4 ? 1 : 0;

    return Math.round((catWeight + urgency + complexBonus) * sevMult);
}

function generateScheduleItems(events, behaviorProfile) {
    const now = new Date();
    const slotWeights = behaviorProfile?.slot_weights || { morning: 0.5, afternoon: 0.5, evening: 0.5, night: 0.5 };

    const futureEvents = events
        .filter(e => new Date(e.event_datetime) > now)
        .sort((a, b) => new Date(a.event_datetime) - new Date(b.event_datetime));

    if (futureEvents.length === 0) return [];

    const prioritized = [...futureEvents].sort((a, b) => {
        const pA = getPriorityScore(a);
        const pB = getPriorityScore(b);
        if (pB !== pA) return pB - pA;
        return new Date(a.event_datetime) - new Date(b.event_datetime);
    });

    const schedule = [];
    let cursor = new Date(now);
    cursor.setSeconds(0, 0);

    const STUDY_CATS = ['exam', 'hackathon', 'assignment'];

    for (const event of prioritized) {
        const eventTime = new Date(event.event_datetime);
        const cat = (event.category || '').toLowerCase();
        const isStudy = STUDY_CATS.includes(cat);

        if (isStudy) {
            const prepMinutes = (event.estimated_prep_hours || 2) * 60;
            const blockSize = Math.min(prepMinutes, 90);
            const numBlocks = Math.ceil(prepMinutes / blockSize);

            for (let i = 0; i < numBlocks; i++) {
                const blockStart = new Date(cursor);
                const blockEnd = new Date(cursor.getTime() + blockSize * 60000);
                if (blockEnd > eventTime) break;

                const hour = blockStart.getHours();
                const slot = getTimeSlot(hour);
                const weight = slotWeights[slot] || 0.5;

                schedule.push({
                    type: 'study',
                    title: `Study: ${event.title}`,
                    category: event.category,
                    start_time: blockStart.toISOString(),
                    end_time: blockEnd.toISOString(),
                    duration_minutes: blockSize,
                    priority: getPriorityScore(event),
                    slot_weight: weight,
                    event_id: event.id,
                });

                cursor = new Date(blockEnd.getTime() + 15 * 60000);
            }
        }

        schedule.push({
            type: isStudy ? 'exam' : 'event',
            title: event.title,
            category: event.category,
            start_time: eventTime.toISOString(),
            end_time: new Date(eventTime.getTime() + 3600000).toISOString(),
            duration_minutes: 60,
            priority: getPriorityScore(event),
            venue: event.venue,
            event_id: event.id,
        });
    }

    schedule.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    return schedule;
}

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const events = await supabaseSelect('events', `user_id=eq.${user.user_id}&select=*`);

        let behaviorProfile = null;
        try {
            const profiles = await supabaseSelect('behavior_profiles', `user_id=eq.${user.user_id}&select=*`);
            if (profiles.length > 0) behaviorProfile = profiles[0];
        } catch (e) { /* use defaults */ }

        const schedule = generateScheduleItems(events, behaviorProfile);

        return res.status(200).json({
            success: true,
            schedule,
            event_count: events.length,
            behavior_applied: !!behaviorProfile,
        });
    } catch (error) {
        console.error('Schedule generate error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
