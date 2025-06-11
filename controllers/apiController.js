const axios = require('axios');

async function getPlaylists(req, res) {
    try {
        const accessToken = req.session.access_token;
        let allPlaylists = [];
        let nextUrl = 'https://api.spotify.com/v1/me/playlists';
        
        // Get current user's ID for determining edit permissions
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const currentUserId = userResponse.data.id;
        
        // Fetch all playlists with pagination
        while (nextUrl) {
            const response = await axios.get(nextUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: nextUrl === 'https://api.spotify.com/v1/me/playlists' ? { limit: 50 } : {}
            });
            
            const playlists = response.data.items.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                imageUrl: playlist.images && playlist.images.length > 0 ? playlist.images[0].url : null,
                isEditable: playlist.owner.id === currentUserId || playlist.collaborative,
                ownerId: playlist.owner.id
            }));
            
            allPlaylists = allPlaylists.concat(playlists);
            nextUrl = response.data.next;
        }
        
        res.json(allPlaylists);
    } catch (error) {
        console.error('Error fetching playlists:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(401).json({ error: 'Token expired or invalid' });
        } else {
            res.status(502).json({ error: 'Failed to fetch playlists from Spotify' });
        }
    }
}

module.exports = {
    getPlaylists
};