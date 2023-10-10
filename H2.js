const express = require('express');
const http2 = require('http2');
const fs = require('fs');

const app = express();

const options = {
    key: fs.readFileSync('./ssl证书/private-key.pem'), // 私钥
    cert: fs.readFileSync('./ssl证书/public-cert.pem') // 公共证书
};

const server = http2.createSecureServer(options, app);

app.get('/', (req, res) => {
    res.send('Hello, HTTP/2!');
});

server.listen(3000, () => {
    console.log('Server is running on https://localhost:3000');
});