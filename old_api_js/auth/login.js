const crypto = require('crypto');
const { signToken } = require('../lib/jwt');
const { supabaseSelect } = require('../lib/supabase-admin');
const { setCors, parseBody } = require('../lib/utils');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

    try {
        const { username, password } = await parseBody(req);

        if (!username || !password) {
            return res.status(400).json({ detail: 'Username and password are required' });
        }

        const pwHash = hashPassword(password);
        const users = await supabaseSelect(
            'app_users',
            `username=eq.${username}&password_hash=eq.${pwHash}&select=id,username,display_name`
        );

        if (!users || users.length === 0) {
            return res.status(401).json({ detail: 'Invalid username or password' });
        }

        const user = users[0];
        const token = signToken({ user_id: user.id, username: user.username });

        return res.status(200).json({
            access_token: token,
            user_id: user.id,
            username: user.username,
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ detail: error.message || 'Internal server error' });
    }
};
