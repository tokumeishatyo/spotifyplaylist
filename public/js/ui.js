// UI rendering module

function showLoading() {
    const container = document.getElementById('playlist-container');
    if (container) {
        container.innerHTML = '<div class="loading">プレイリストを読み込んでいます...</div>';
    }
}

function showError(message) {
    const container = document.getElementById('playlist-container');
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

function renderPlaylists(playlists) {
    const container = document.getElementById('playlist-container');
    if (!container) return;
    
    if (!playlists || playlists.length === 0) {
        container.innerHTML = '<div class="no-playlists">プレイリストがありません。</div>';
        return;
    }
    
    const playlistsHTML = playlists.map(playlist => `
        <details class="playlist-item" data-playlist-id="${playlist.id}" data-editable="${playlist.isEditable}">
            <summary class="playlist-summary">
                <input type="checkbox" class="item-checkbox" data-item-type="playlist" aria-label="Select playlist ${playlist.name}">
                <img src="${playlist.imageUrl || '/images/default-playlist-icon.png'}" alt="${playlist.name} cover" class="playlist-cover">
                <span class="playlist-title">${playlist.name}</span>
            </summary>
            <div class="tracks-container">
                <!-- F-03で楽曲リストがここに追加される -->
            </div>
        </details>
    `).join('');
    
    container.innerHTML = playlistsHTML;
}

// Export functions for use in other modules
window.ui = {
    showLoading,
    showError,
    renderPlaylists
};