// app.js
const express = require('express');
const app = express();
const port = 5000;
const path = require('path'); // Node.js 内置的 path 模块，用于处理文件路径
const cors = require('cors'); // 导入 CORS 中间件
const { error } = require('console');
const db = require('./db')
const jwt = require('jsonwebtoken');
const secret = '5AyJev7U33/ZRzgA4+kl4RedpzRr0/82WKhoUR79fdg=' //token加密解密的密钥
const refresh_secret = 'Lfno5DFizWmxRdFb/5ADdF9kUHh0WqgkpqhNNcjZ+0I=' //refresh token加密解密的密钥
const bcrypt = require('bcrypt'); //密码哈希涉及的模块
const saltRounds = 10; // 控制哈希强度

// 配置允许的来源
const corsOptions = {
    origin: '*', // 指定允许的来源域名
};
// 启用 CORS 中间件，允许所有来源的请求
app.use(cors(corsOptions));


app.use(express.json());


// 假设用户的原始密码是 'mysecretpassword'
// const plainPassword = 'mysecretpassword';



// 生成Token
function generateToken(userId) {
    const token = jwt.sign({ userId }, secret, { expiresIn: '10s' }); // 这里的 expiresIn 选项设置了Token的过期时间
    const refreshToken = jwt.sign({ userId }, refresh_secret, { expiresIn: '7d' });
    return { "token": token, "refreshToken": refreshToken };
}

// 中间件用于验证Token
function verifyToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(403).json({ message: '没有提供Token' });
    }
    try {
        const decoded = jwt.verify(token.split(' ')[1], secret);
        console.log(decoded)
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token验证失败' });
    }

    // jwt.verify(token.split(' ')[1], secret, (err, decoded) => { 
    //     if (err) {
    //         console.error(err)
    //         return res.status(401).json({ message: 'Token验证失败' });
    //     }
    //     req.userId = decoded.userId; // 将用户ID附加到请求对象中
    //     next();
    // });
}

// 中间件函数(接口)：用于验证用户身份
app.use('/Login', async(req, res, next) => {
    // 从查询参数中获取手机号和密码
    const name = req.query.username;
    const password = req.query.password;
    console.log(req.query)
        // 模拟身份验证逻辑
    try {
        const users = await db.query(`SELECT * FROM user WHERE name = ?`, [name]);
        const hashFromDatabase = users[0].password;
        // const users = await db.query(`SELECT * FROM user WHERE name = ? AND password = ?`, [name, password]);
        if (users.length > 0) {
            bcrypt.compare(password, hashFromDatabase, (err, result) => {
                if (err) {
                    console.error(err);
                    res.send(false);
                    return;
                }

                if (result) {
                    bcrypt.hash(password, saltRounds, async(err, hash) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        // 将哈希后的密码存储到数据库中
                        try {
                            const userId = name + ';' + hash
                            console.log(userId)
                            res.json(generateToken(userId))
                        } catch (error) {
                            res.send(false);
                        }
                    });
                } else {
                    res.send(false);
                }
            });
        } else {
            res.send(false); // 如果没有结果，返回false
        }
    } catch (error) {
        res.status(500).send('Something went wrong!');
    }
});

// 中间件函数(接口)：用于验证用户登录状态
app.use('/checkLogin', verifyToken, async(req, res, next) => {
    var arrdata = req.userId.split(';')
    const name = arrdata[0];
    const password = arrdata[1];
    try {
        const users = await db.query(`SELECT name FROM user WHERE name = ? AND password = ?`, [name, password]);
        if (users.length > 0) {
            res.send(true); // 如果有结果，返回true
        } else {
            res.send(false); // 如果没有结果，返回false
        }
    } catch (error) {
        res.status(500).send('Something went wrong!');
    }
});


// 使用Refresh Token获取新Token
app.use('/refreshToken', (req, res) => {
    const refreshToken = req.headers.authorization;
    try {
        const decoded = jwt.verify(refreshToken.split(' ')[1], refresh_secret);
        const { userId } = decoded;
        const newAccessToken = jwt.sign({ userId }, secret, { expiresIn: '1h' });
        // 发送新的AccessToken给客户端
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        return res.status(401).json({ message: 'Token验证失败' });
    }
});

// 注册用户
app.use('/Userregistration', (req, res) => {
    // 现在，req.body 包含从前端传递的JSON数据
    const plainPassword = req.body.Password;
    const username = req.body.username;
    const email = req.body.email;
    const phone = req.body.phone;
    console.log(req.body)
    bcrypt.hash(plainPassword, saltRounds, async(err, hash) => {
        if (err) {
            console.error(err);
            return;
        }
        // 将哈希后的密码存储到数据库中
        try {
            const userId = username + ';' + hash
            console.log(userId)
            const users = await db.query(`INSERT INTO user (name, password,email,phone) VALUES (?, ?,?,?)`, [username, hash, email, phone]);
            res.json(generateToken(userId))
        } catch (error) {
            res.send(false);
        }
    });
});



// 忘记密码
app.use('/ForgotPassword', (req, res) => {
    // 现在，req.body 包含从前端传递的JSON数据
    const username = req.body.username;
    const plainPassword = req.body.password;
    const email = req.body.email;
    const phone = req.body.phone;
    console.log(req.body)
    bcrypt.hash(plainPassword, saltRounds, async(err, hash) => {
        if (err) {
            console.error(err);
            return;
        }
        // 将哈希后的密码存储到数据库中
        try {
            const userId = username + ';' + hash
            console.log(userId)
            const users = await db.query(`SELECT * FROM user WHERE phone= ? AND email = ?`, [phone, email]);
            if (users.length > 0) {
                const state = await db.query(`UPDATE user SET password = ? WHERE phone = ? AND email = ?`, [hash, phone, email]);
                res.json(generateToken(userId))
            } else {
                res.send('0');
            }

        } catch (error) {
            res.send('1');
        }
    });
});


// 错误处理中间件：处理未找到的路由
app.use((req, res, next) => {
    res.status(404).send('处理未找到的路由');
    next()
});

// 错误处理中间件：处理其他错误
app.use((err, req, res, next) => {
    res.status(500).send('处理其他错误');
});

app.listen(port, () => {
    console.log(`运行起来了`);
});





//  中间件的执行顺序非常重要。中间件按照它们添加到应用程序的顺序依次执行，所以根据中间件的添加顺序，你可以区分出哪个中间件用于处理未找到的路由。
//  可以试着将错误处理中间件往前放，结果就不一样了