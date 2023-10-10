process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const app = express();
const port = 5000;
const http2 = require('http2');
const path = require('path'); // Node.js 内置的 path 模块，用于处理文件路径
const cors = require('cors'); // 导入 CORS 中间件
const fs = require('fs');

// 配置允许的来源
const corsOptions = {
    origin: 'http://127.0.0.1:5500', // 指定允许的来源域名
};
// 启用 CORS 中间件，允许所有来源的请求
app.use(cors(corsOptions));
const options = {
    cert: fs.readFileSync(path.join(__dirname, '/ssl证书/public-cert.pem')), // PEM格式的证书文件
    key: fs.readFileSync(path.join(__dirname, '/ssl证书/private-key.pem')), // KEY格式的私钥文件
    passphrase: '123456789' // 添加你的私钥密码
};
// 创建一个HTTP/2服务器
const server = http2.createSecureServer(options, app);

// 中间件函数1：用于记录请求时间
app.use((req, res, next) => {
    const startTime = Date.now();
    console.log(`http2：用于记录请求时间 ${startTime}`);
    req.startTime = startTime; // 将 startTime 存储在请求对象中
    next(); // 继续下一个中间件或路由处理器
});

// 路由：处理根路径请求     http://192.168.1.137:3000/
app.get('/', (req, res) => {
    res.send('http2处理根路径请求:Hello, World!');
});

// 中间件函数2：用于验证用户身份
app.use('/secure', (req, res, next) => {
    // 模拟身份验证逻辑
    const isAuthenticated = true; // 假设用户已经通过身份验证
    if (isAuthenticated) {
        next(); // 用户已经通过身份验证，继续下一个中间件或路由处理器
    } else {
        res.status(401).send('Unauthorized'); // 未通过身份验证，返回未授权状态
    }
});

// 路由：受保护的路径
app.get('/secure/dashboard', (req, res) => {
    const elapsedTime = Date.now() - req.startTime;
    res.send(`http2受保护的路径: ${elapsedTime} ms.`);
});

// 路由：公开的路径
app.get('/public/about', (req, res) => {
    const elapsedTime = Date.now() - req.startTime;
    res.send(`http2公开的路径:  ${elapsedTime} ms.`);
});
// 路由：处理接口请求
app.get('/api/someendpoint', (req, res, next) => {
    // const elapsedTime = Date.now() - req.startTime;
    // res.send(`处理接口请求:  ${elapsedTime} ms.`);
    // next(error)
    try {
        // 在此处执行一些可能导致服务器错误的操作
        // 如果出现问题，抛出一个错误
        throw new Error('An internal server error occurred.');
    } catch (error) {
        // 将错误传递给错误处理中间件
        next(error);
    }
});



// 错误处理中间件：处理未找到的路由
app.use((req, res, next) => {
    console.log('http2处理未找到的路由')
    res.status(404).send('http2处理未找到的路由');
    next()
});



// 错误处理中间件：处理其他错误
app.use((err, req, res, next) => {
    console.error(err); // 打印错误信息到控制台
    res.status(500).send('服务器发生错误'); // 返回一个适当的错误响应
});

server.listen(port, () => {
    console.log(`http2运行起来了`);
});