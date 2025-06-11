// Main controller module

document.addEventListener('DOMContentLoaded', async () => {
    // Check if we need to wait for app.js to initialize first
    if (window.PlaylistManager) {
        return; // Let app.js handle everything
    }
    
    // Show loading indicator
    ui.showLoading();
    
    try {
        // Fetch playlists from API
        const playlists = await api.fetchPlaylists();
        
        // Check if we got a redirect response (401)
        if (playlists === null) {
            return; // Let the redirect happen
        }
        
        // Render playlists in UI
        ui.renderPlaylists(playlists);
    } catch (error) {
        // Check if it's an authentication error
        if (error.message.includes('401')) {
            window.location.href = '/';
            return;
        }
        
        // Show error message
        ui.showError('プレイリストの読み込みに失敗しました。ページを再読み込みしてください。');
        console.error('Failed to load playlists:', error);
    }
});