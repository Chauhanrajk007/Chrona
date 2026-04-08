module.exports = function handler(req, res) {
    res.status(200).json({
        status: 'ok',
        service: 'chrona-api',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/auth/signup',
            '/api/auth/login',
            '/api/auth/me',
            '/api/process-event',
            '/api/schedule/generate',
            '/api/schedule/items',
            '/api/behavior/update',
            '/api/behavior/profile',
            '/api/repair/propose',
        ],
    });
};
