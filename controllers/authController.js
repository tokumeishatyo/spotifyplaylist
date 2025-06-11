const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

// 環境変数から設定を取得
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5173/callback';

// Spotifyの認証に必要なスコープ
const SCOPES = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private'
].join(' ');

/**
 * ルートアクセス時の処理
 * 認証状態を確認し、未認証の場合はSpotify認証ページへリダイレクト
 */
const handleRootAccess = (req, res) => {
    // 環境変数のチェック
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('Missing Spotify credentials in environment variables');
        return res.status(500).send(`
            <html>
                <body>
                    <h1>設定エラー</h1>
                    <p>Spotify APIの認証情報が設定されていません。</p>
                    <p>SPOTIFY_CLIENT_IDとSPOTIFY_CLIENT_SECRETを.envファイルに設定してください。</p>
                </body>
            </html>
        `);
    }

    // セッションにアクセストークンが存在するかチェック
    if (req.session.access_token) {
        // 認証済み: メイン画面を表示
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    } else {
        // 未認証: Spotify認証ページへリダイレクト
        // CSRF対策用のstate文字列を生成
        const state = crypto.randomBytes(16).toString('hex');
        req.session.state = state;

        // Spotify認証URLを構築
        const authUrl = 'https://accounts.spotify.com/authorize?' +
            new URLSearchParams({
                response_type: 'code',
                client_id: CLIENT_ID,
                scope: SCOPES,
                redirect_uri: REDIRECT_URI,
                state: state,
                show_dialog: true // 毎回認証画面を表示
            }).toString();

        console.log('Redirecting to Spotify auth:', authUrl);
        res.redirect(authUrl);
    }
};

/**
 * Spotify認証コールバック処理
 * 認証コードを使用してアクセストークンを取得し、セッションに保存
 */
const handleCallback = async (req, res) => {
    const { code, state, error } = req.query;

    // ユーザーが認証を拒否した場合
    if (error) {
        console.log('User denied authorization:', error);
        return res.status(200).send(`
            <html>
                <body>
                    <h1>認証がキャンセルされました</h1>
                    <p>再度利用するにはページを更新してください。</p>
                    <a href="/">戻る</a>
                </body>
            </html>
        `);
    }

    // CSRF対策: stateパラメータの検証
    if (state !== req.session.state) {
        console.error('State mismatch - possible CSRF attack');
        return res.status(400).send('不正なリクエストです。');
    }

    // stateは使用済みなので削除
    delete req.session.state;

    try {
        // 認証コードを使用してアクセストークンを取得
        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
                }
            }
        );

        // トークン情報をセッションに保存
        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        req.session.access_token = access_token;
        req.session.refresh_token = refresh_token;
        req.session.expires_at = Date.now() + expires_in * 1000;

        // ユーザー情報を取得してセッションに保存
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        
        req.session.userId = userResponse.data.id;

        // ルートページへリダイレクト
        res.redirect('/');
    } catch (error) {
        console.error('Token exchange failed:', error.response?.data || error.message);
        res.status(500).send(`
            <html>
                <body>
                    <h1>認証に失敗しました</h1>
                    <p>時間をおいて再度お試しください。</p>
                    <a href="/">戻る</a>
                </body>
            </html>
        `);
    }
};

module.exports = {
    handleRootAccess,
    handleCallback
};