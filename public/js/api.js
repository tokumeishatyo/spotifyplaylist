// API communication module
async function fetchPlaylists() {
    try {
        const response = await fetch('/api/playlists');
        
        if (response.status === 401) {
            // Not authenticated, redirect to login
            window.location.href = '/';
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching playlists:', error);
        throw error;
    }
}

// Export functions for use in other modules
window.api = {
    fetchPlaylists
};