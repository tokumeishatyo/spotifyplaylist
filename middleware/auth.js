module.exports = function(req, res, next) {
    if (!req.session || !req.session.access_token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};