// app.js
const express = require('express');
const app = express();
const port = 5000;
const path = require('path'); // Node.js 内置的 path 模块，用于处理文件路径
const cors = require('cors'); // 导入 CORS 中间件
const { error } = require('console');
// const crypto = require('crypto');

// function generateRandomKey() {
//     const keyLength = 32; // 设置私钥的长度，单位是字节（这里是256位）
//     return crypto.randomBytes(keyLength).toString('base64');
// }

// const privateKey = generateRandomKey();

// console.log('随机生成的私钥:', privateKey);
const db = require('./db')

// 配置允许的来源
const corsOptions = {
    origin: '*', // 指定允许的来源域名
};
// 启用 CORS 中间件，允许所有来源的请求
app.use(cors(corsOptions));

// 指定本地文件夹的绝对路径作为静态资源目录
const staticFolderPath = path.join(__dirname, '../Node相关静态资源');
app.use(express.static(staticFolderPath, { maxAge: 6000 }));
// 在服务器端对资源进行适当的ETag生成和验证。当资源发生变化时，你可以更新资源的ETag值。浏览器会根据ETag值判断是否需要重新获取资源。这样，即使maxAge设置为10秒，当资源发生更改时，浏览器将获取新的资源。


// 如果想要更加精细的控制可以考虑使用Cache-Control

// app.use(express.static(staticFolderPath, {
//     cacheControl: 'no-cache, must-revalidate', // 启用Cache-Control头
//     maxAge: 600,
// }));



// 中间件函数1：用于记录请求时间
app.use((req, res, next) => {
    const startTime = Date.now();
    console.log(`中间件函数1：用于记录请求时间 ${startTime}`);
    req.startTime = startTime; // 将 startTime 存储在请求对象中
    next(); // 继续下一个中间件或路由处理器
});

// 路由：处理根路径请求     http://192.168.1.137:3000/
app.get('/', (req, res) => {
    res.send('处理根路径请求:Hello, World!');
});

// 中间件函数2：用于验证用户身份
app.use('/secure', async(req, res, next) => {
    // 从查询参数中获取手机号和密码
    const phone = req.query.phone;
    const password = req.query.password;
    // 模拟身份验证逻辑
    try {
        const users = await db.query(`SELECT * FROM user WHERE phone = ? AND password = ?`, [phone, password]);
        // const users = await db.query(`SELECT * FROM user WHERE phone = 151 or 1=1# AND password = 111111`);  SQL注入攻击
        console.log(users)
        if (users.length > 0) {
            res.send(true); // 如果有结果，返回true
        } else {
            res.send(false); // 如果没有结果，返回false
        }
        // res.json(users);
    } catch (error) {
        res.status(500).send('Something went wrong!');
    }
});

// 路由：受保护的路径
app.get('/secure/dashboard', (req, res) => {
    const elapsedTime = Date.now() - req.startTime;
    res.send(`受保护的路径: ${elapsedTime} ms.`);
});

// 路由：公开的路径
app.get('/public/about', (req, res) => {
    const elapsedTime = Date.now() - req.startTime;
    res.send(`公开的路径:  ${elapsedTime} ms.`);
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
    console.log('处理未找到的路由')
    res.status(404).send('处理未找到的路由');
    next()
});



// 错误处理中间件：处理其他错误
app.use((err, req, res, next) => {
    console.log('错错');
    res.status(500).send('处理其他错误');
});

app.listen(port, () => {
    console.log(`运行起来了`);
});





//  中间件的执行顺序非常重要。中间件按照它们添加到应用程序的顺序依次执行，所以根据中间件的添加顺序，你可以区分出哪个中间件用于处理未找到的路由。
//  可以试着将错误处理中间件往前放，结果就不一样了