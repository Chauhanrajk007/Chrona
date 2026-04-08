const crypto = require('crypto');
const { signToken } = require('../lib/jwt');
const { supabaseSelect, supabaseInsert } = require('../lib/supabase-admin');
const { setCors, parseBody } = require('../lib/utils');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

    try {
        const { username, password, name } = await parseBody(req);

        if (!username || !password) {
            return res.status(400).json({ detail: 'Username and password are required' });
        }

        const existing = await supabaseSelect('app_users', `username=eq.${username}&select=id`);
        if (existing.length > 0) {
            return res.status(400).json({ detail: 'Username already taken' });
        }

        const userData = {
            username,
            password_hash: hashPassword(password),
            display_name: name || username,
        };
        const inserted = await supabaseInsert('app_users', userData, true);
        const user = Array.isArray(inserted) ? inserted[0] : inserted;

        try {
            await supabaseInsert('behavior_profiles', { user_id: user.id, archetype: 'student_balanced' });
        } catch (e) { /* non-fatal */ }

        try {
            await supabaseInsert('onboarding_responses', {
                user_id: user.id, productive_time: 'morning',
                work_type: 'mixed', task_preference: 'balanced', study_hours: 4,
            });
        } catch (e) { /* non-fatal */ }

        const token = signToken({ user_id: user.id, username });

        return res.status(200).json({
            access_token: token,
            user_id: user.id,
            username,
            message: 'Signup successful',
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ detail: error.message || 'Internal server error' });
    }
};
