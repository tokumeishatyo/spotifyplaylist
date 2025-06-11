const session = require('express-session');

module.exports = session({
    secret: process.env.SESSION_SECRET, // .envから読み込むランダムな秘密鍵
    resave: false,
    saveUninitialized: false, // 認証されていないセッションは保存しない
    cookie: {
        secure: true,       // HTTPS接続でのみクッキーを送信
        httpOnly: true,     // クライアントJSからのアクセスを禁止
        maxAge: null        // ブラウザセッションの終了時にクッキーを破棄
    }
});