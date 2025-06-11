const session = require('express-session');

module.exports = session({
    secret: process.env.SESSION_SECRET, // .envから読み込むランダムな秘密鍵
    resave: false,
    saveUninitialized: true, // stateを保存するためにtrueに変更
    cookie: {
        secure: false,      // HTTPでも動作するようにfalseに変更
        httpOnly: true,     // クライアントJSからのアクセスを禁止
        maxAge: null        // ブラウザセッションの終了時にクッキーを破棄
    }
});