const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ルートアクセス - 認証状態を確認
router.get('/', authController.handleRootAccess);

// Spotify認証コールバック
router.get('/callback', authController.handleCallback);

module.exports = router;