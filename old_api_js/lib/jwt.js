const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chrona-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

function getUserFromRequest(req) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.user_id) return null;

    return { user_id: decoded.user_id, username: decoded.username };
}

function requireAuth(req, res) {
    const user = getUserFromRequest(req);
    if (!user) {
        res.status(401).json({ detail: 'Missing or invalid authorization token' });
        return null;
    }
    return user;
}

module.exports = { signToken, verifyToken, getUserFromRequest, requireAuth };
