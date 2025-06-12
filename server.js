const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// カスタムミドルウェアとルートをインポート
const sessionMiddleware = require('./middleware/session');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// 環境変数をエクスポート（他のモジュールで使用するため）
process.env.REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/callback`;

// ミドルウェアの設定
app.use(express.json());
app.use(sessionMiddleware);

// 認証関連のルートを登録（静的ファイルより先に）
app.use('/', authRoutes);

// 静的ファイルは認証後にのみアクセス可能
app.use(express.static('public'));

// API Routes
app.use('/api', apiRoutes);

// Legacy API Routes (to be removed later)
app.get('/api/playlists-legacy', async (req, res) => {
    if (!req.session.access_token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
            headers: {
                'Authorization': `Bearer ${req.session.access_token}`
            },
            params: {
                limit: 50
            }
        });
        
        // Include current user ID in response
        res.json({
            ...response.data,
            currentUserId: req.session.userId
        });
    } catch (error) {
        console.error('Error fetching playlists:', error);
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Token expired' });
        }
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

app.get('/api/playlists/:playlistId/tracks', async (req, res) => {
    if (!req.session.access_token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const response = await axios.get(
            `https://api.spotify.com/v1/playlists/${req.params.playlistId}/tracks`,
            {
                headers: {
                    'Authorization': `Bearer ${req.session.access_token}`
                },
                params: {
                    limit: 100
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching tracks:', error);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});

app.post('/api/delete-items', async (req, res) => {
    if (!req.session.access_token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { playlists, tracks } = req.body;
    const errors = [];
    
    try {
        // Delete playlists (unfollow)
        for (const playlistId of playlists || []) {
            try {
                await axios.delete(
                    `https://api.spotify.com/v1/playlists/${playlistId}/followers`,
                    {
                        headers: {
                            'Authorization': `Bearer ${req.session.access_token}`
                        }
                    }
                );
            } catch (error) {
                errors.push({ type: 'playlist', id: playlistId, error: error.message });
            }
        }
        
        // Delete tracks from playlists
        for (const [playlistId, trackUris] of Object.entries(tracks || {})) {
            // Split into chunks of 100
            const chunks = [];
            for (let i = 0; i < trackUris.length; i += 100) {
                chunks.push(trackUris.slice(i, i + 100));
            }
            
            for (const chunk of chunks) {
                try {
                    await axios.delete(
                        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                        {
                            headers: {
                                'Authorization': `Bearer ${req.session.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            data: {
                                tracks: chunk.map(uri => ({ uri }))
                            }
                        }
                    );
                } catch (error) {
                    errors.push({ type: 'tracks', playlistId, error: error.message });
                }
            }
        }
        
        if (errors.length > 0) {
            res.status(207).json({ message: 'Partial success', errors });
        } else {
            res.json({ message: 'All items deleted successfully' });
        }
    } catch (error) {
        console.error('Error deleting items:', error);
        res.status(500).json({ error: 'Failed to delete items' });
    }
});

// Add current user ID to client
app.get('/api/me', async (req, res) => {
    if (!req.session.access_token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({ userId: req.session.userId });
});

// Create HTTP server
function startServer() {
    http.createServer(app).listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log('Make sure to set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file');
    });
}

startServer();