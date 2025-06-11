const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all API routes
router.use(authMiddleware);

// Get user's playlists
router.get('/playlists', apiController.getPlaylists);

module.exports = router;