const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certDir = path.join(__dirname, 'certs');
const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}

console.log('Generating self-signed certificate for localhost...');

try {
    // Generate private key and certificate using OpenSSL
    const opensslCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost"`;
    
    execSync(opensslCommand, { stdio: 'inherit' });
    
    console.log('Certificate generated successfully!');
    console.log(`Key: ${keyPath}`);
    console.log(`Certificate: ${certPath}`);
    console.log('\nNote: You may need to trust this certificate in your browser.');
} catch (error) {
    console.error('Failed to generate certificate. Make sure OpenSSL is installed.');
    console.error('On Windows, you might need to install OpenSSL or use Git Bash.');
    console.error('Alternative: You can use mkcert (https://github.com/FiloSottile/mkcert) for easier certificate generation.');
    process.exit(1);
}