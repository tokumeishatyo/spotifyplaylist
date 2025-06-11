// Spotify Playlist Manager - Client Side JavaScript

class PlaylistManager {
    constructor() {
        this.playlists = [];
        this.tracksCache = {};
        this.selectedItems = new Set();
        this.init();
    }

    init() {
        this.initializeTheme();
        this.bindEvents();
        this.loadPlaylists();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.updateThemeIcon(true);
        }
    }

    updateThemeIcon(isDark) {
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = isDark ? '☀️' : '🌙';
    }

    bindEvents() {
        // Theme toggle
        document.getElementById('theme-toggle-button').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Delete button
        document.getElementById('delete-button').addEventListener('click', () => {
            this.deleteSelectedItems();
        });
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        this.updateThemeIcon(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    async loadPlaylists() {
        try {
            const response = await fetch('/api/playlists');
            if (response.status === 401) {
                // Redirect to root for authentication
                window.location.href = '/';
                return;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            // Check if data is an array (new API) or object with items (old API)
            if (Array.isArray(data)) {
                this.playlists = data;
                // Get current user ID separately if needed
                this.loadCurrentUserId();
            } else {
                this.playlists = data.items || [];
                window.currentUserId = data.currentUserId;
            }
            this.renderPlaylists();
        } catch (error) {
            console.error('Error loading playlists:', error);
            this.showNotification('プレイリストの読み込みに失敗しました', 'error');
        }
    }

    async loadCurrentUserId() {
        try {
            const response = await fetch('/api/me');
            if (response.ok) {
                const data = await response.json();
                window.currentUserId = data.userId;
            }
        } catch (error) {
            console.error('Error loading user ID:', error);
        }
    }

    renderPlaylists() {
        const container = document.getElementById('playlist-container');
        container.innerHTML = '';

        if (this.playlists.length === 0) {
            container.innerHTML = '<p class="no-playlists">プレイリストがありません</p>';
            return;
        }

        this.playlists.forEach((playlist, index) => {
            const playlistElement = this.createPlaylistElement(playlist, index);
            container.appendChild(playlistElement);
        });
    }

    createPlaylistElement(playlist, index) {
        const details = document.createElement('details');
        details.className = 'playlist-item';
        details.dataset.playlistId = playlist.id;
        details.dataset.playlistIndex = index;

        const summary = document.createElement('summary');
        summary.className = 'playlist-header';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'playlist-checkbox';
        checkbox.dataset.playlistId = playlist.id;
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.handlePlaylistCheckbox(playlist.id, e.target.checked);
        });

        const image = document.createElement('img');
        image.className = 'playlist-cover';
        // Handle both old format (playlist.images) and new format (playlist.imageUrl)
        const imageUrl = playlist.imageUrl || playlist.images?.[0]?.url || '/images/placeholder.png';
        image.src = imageUrl;
        image.alt = playlist.name;

        const title = document.createElement('span');
        title.className = 'playlist-title';
        title.textContent = playlist.name;

        summary.appendChild(checkbox);
        summary.appendChild(image);
        summary.appendChild(title);

        const trackList = document.createElement('div');
        trackList.className = 'track-list';
        trackList.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>楽曲を読み込んでいます...</p></div>';

        details.appendChild(summary);
        details.appendChild(trackList);

        // Load tracks when playlist is expanded
        details.addEventListener('toggle', async () => {
            if (details.open && !this.tracksCache[playlist.id]) {
                await this.loadTracks(playlist.id, trackList, playlist);
            }
        });

        // Prevent checkbox click from toggling details
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return details;
    }

    async loadTracks(playlistId, container, playlist) {
        try {
            const response = await fetch(`/api/playlists/${playlistId}/tracks`);
            const data = await response.json();
            
            this.tracksCache[playlistId] = data.items || [];
            this.renderTracks(playlistId, container, playlist);
        } catch (error) {
            console.error('Error loading tracks:', error);
            container.innerHTML = '<p class="error">楽曲の読み込みに失敗しました</p>';
        }
    }

    renderTracks(playlistId, container, playlist) {
        const tracks = this.tracksCache[playlistId];
        container.innerHTML = '';

        if (tracks.length === 0) {
            container.innerHTML = '<p class="no-tracks">楽曲がありません</p>';
            return;
        }

        // Check if user has edit permissions
        const currentUserId = this.getCurrentUserId();
        // Handle both old format (playlist.owner.id) and new format (playlist.isEditable)
        const canEdit = playlist.isEditable !== undefined ? playlist.isEditable : 
                       (playlist.owner?.id === currentUserId || playlist.collaborative);

        tracks.forEach((item, index) => {
            if (!item.track) return; // Skip null tracks

            const trackElement = this.createTrackElement(item.track, playlistId, index, canEdit);
            container.appendChild(trackElement);
        });
    }

    createTrackElement(track, playlistId, index, canEdit) {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'track-checkbox';
        checkbox.dataset.trackUri = track.uri;
        checkbox.dataset.playlistId = playlistId;
        checkbox.disabled = !canEdit;
        
        if (canEdit) {
            checkbox.addEventListener('change', (e) => {
                this.handleTrackCheckbox(playlistId, track.uri, e.target.checked);
            });
        }

        const image = document.createElement('img');
        image.className = 'track-image';
        image.src = track.album?.images?.[0]?.url || '/images/placeholder.png';
        image.alt = track.name;

        const info = document.createElement('div');
        info.className = 'track-info';

        const title = document.createElement('div');
        title.className = 'track-title';
        title.textContent = track.name;

        const artist = document.createElement('div');
        artist.className = 'track-artist';
        artist.textContent = track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';

        info.appendChild(title);
        info.appendChild(artist);

        trackDiv.appendChild(checkbox);
        trackDiv.appendChild(image);
        trackDiv.appendChild(info);

        return trackDiv;
    }

    getCurrentUserId() {
        // This should be provided by the server or stored after login
        return window.currentUserId || '';
    }

    handlePlaylistCheckbox(playlistId, checked) {
        const playlistCheckbox = document.querySelector(`.playlist-checkbox[data-playlist-id="${playlistId}"]`);
        const trackCheckboxes = document.querySelectorAll(`.track-checkbox[data-playlist-id="${playlistId}"]:not(:disabled)`);

        if (checked) {
            this.selectedItems.add(`playlist:${playlistId}`);
            // Select all enabled tracks
            trackCheckboxes.forEach(cb => {
                cb.checked = true;
                this.selectedItems.add(`track:${playlistId}:${cb.dataset.trackUri}`);
            });
        } else {
            this.selectedItems.delete(`playlist:${playlistId}`);
            // Deselect all tracks
            trackCheckboxes.forEach(cb => {
                cb.checked = false;
                this.selectedItems.delete(`track:${playlistId}:${cb.dataset.trackUri}`);
            });
        }

        this.updateDeleteButton();
    }

    handleTrackCheckbox(playlistId, trackUri, checked) {
        const key = `track:${playlistId}:${trackUri}`;
        
        if (checked) {
            this.selectedItems.add(key);
        } else {
            this.selectedItems.delete(key);
        }

        // Update playlist checkbox state
        this.updatePlaylistCheckbox(playlistId);
        this.updateDeleteButton();
    }

    updatePlaylistCheckbox(playlistId) {
        const playlistCheckbox = document.querySelector(`.playlist-checkbox[data-playlist-id="${playlistId}"]`);
        const trackCheckboxes = document.querySelectorAll(`.track-checkbox[data-playlist-id="${playlistId}"]:not(:disabled)`);
        
        const checkedTracks = Array.from(trackCheckboxes).filter(cb => cb.checked);
        
        if (checkedTracks.length === 0) {
            playlistCheckbox.checked = false;
            playlistCheckbox.indeterminate = false;
            this.selectedItems.delete(`playlist:${playlistId}`);
        } else if (checkedTracks.length === trackCheckboxes.length) {
            playlistCheckbox.checked = true;
            playlistCheckbox.indeterminate = false;
            this.selectedItems.add(`playlist:${playlistId}`);
        } else {
            playlistCheckbox.checked = false;
            playlistCheckbox.indeterminate = true;
            this.selectedItems.delete(`playlist:${playlistId}`);
        }
    }

    updateDeleteButton() {
        const deleteButton = document.getElementById('delete-button');
        deleteButton.disabled = this.selectedItems.size === 0;
    }

    async deleteSelectedItems() {
        if (this.selectedItems.size === 0) return;

        const confirmed = window.confirm('選択したアイテムを削除します。この操作は元に戻せません。よろしいですか？');
        if (!confirmed) return;

        this.showLoadingOverlay(true);

        try {
            // Prepare delete data
            const deleteData = {
                playlists: [],
                tracks: {}
            };

            this.selectedItems.forEach(item => {
                const [type, ...parts] = item.split(':');
                if (type === 'playlist') {
                    deleteData.playlists.push(parts[0]);
                } else if (type === 'track') {
                    const [playlistId, ...uriParts] = parts;
                    const trackUri = uriParts.join(':');
                    if (!deleteData.tracks[playlistId]) {
                        deleteData.tracks[playlistId] = [];
                    }
                    deleteData.tracks[playlistId].push(trackUri);
                }
            });

            const response = await fetch('/api/delete-items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deleteData)
            });

            if (!response.ok) {
                throw new Error('削除に失敗しました');
            }

            this.showNotification('削除が完了しました');
            this.selectedItems.clear();
            this.tracksCache = {};
            await this.loadPlaylists();
        } catch (error) {
            console.error('Error deleting items:', error);
            this.showNotification('エラーが発生しました。削除に失敗した可能性があります。', 'error');
        } finally {
            this.showLoadingOverlay(false);
        }
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');
        
        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PlaylistManager();
});