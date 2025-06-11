const express = require('express');
const session = require('express-session');
const https = require('https');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 8089;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'spotify-playlist-manager-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // HTTPS only
        httpOnly: true,
        maxAge: null // Session cookie
    }
}));

// Spotify Configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = `https://localhost:${PORT}/callback`;
const SPOTIFY_SCOPES = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private'
].join(' ');

// Routes
app.get('/', (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            response_type: 'code',
            redirect_uri: SPOTIFY_REDIRECT_URI,
            scope: SPOTIFY_SCOPES,
            show_dialog: true
        }).toString();
    
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
        return res.redirect('/?error=' + error);
    }
    
    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        req.session.accessToken = tokenResponse.data.access_token;
        req.session.refreshToken = tokenResponse.data.refresh_token;
        
        // Get user info
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`
            }
        });
        
        req.session.userId = userResponse.data.id;
        
        res.redirect('/');
    } catch (error) {
        console.error('Error in callback:', error);
        res.redirect('/?error=authentication_failed');
    }
});

// API Routes
app.get('/api/playlists', async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`
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
    if (!req.session.accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const response = await axios.get(
            `https://api.spotify.com/v1/playlists/${req.params.playlistId}/tracks`,
            {
                headers: {
                    'Authorization': `Bearer ${req.session.accessToken}`
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
    if (!req.session.accessToken) {
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
                            'Authorization': `Bearer ${req.session.accessToken}`
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
                                'Authorization': `Bearer ${req.session.accessToken}`,
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

// Create HTTPS server
function startServer() {
    const certPath = path.join(__dirname, 'certs');
    const keyPath = path.join(certPath, 'localhost-key.pem');
    const certFilePath = path.join(certPath, 'localhost.pem');
    
    // Check if certificates exist
    if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
        console.error('SSL certificates not found. Please generate certificates first.');
        console.error('Run: npm run generate-cert');
        process.exit(1);
    }
    
    const serverOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certFilePath)
    };
    
    https.createServer(serverOptions, app).listen(PORT, () => {
        console.log(`Server running at https://localhost:${PORT}`);
        console.log('Make sure to set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file');
    });
}

// Add current user ID to client
app.get('/api/me', async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({ userId: req.session.userId });
});

startServer();