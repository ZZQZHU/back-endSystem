const express = require('express');
const config = require('./../../config')
const bcrypt = require('bcrypt'); //密码哈希涉及的模块
const saltRounds = config.saltRounds; // 控制哈希强度
const db = require('./../../sql/db') // 导入数据库连接
const router = express.Router(); // 创建路由
const { generateToken, verifyToken } = require('./../../middleware/token'); // 导入Token中间件
require('dotenv').config(); //.env文件中读取环境变量并使其在process.env中可用
const secret = process.env.SECRET_KEY; //token加密解密的密钥
const refresh_secret = process.env.REFRESH_SECRET; //refresh token加密解密的密钥
const jwt = require('jsonwebtoken'); // 导入 jsonwebtoken 模块

const apiLimiter = require('./../../middleware/safe').apiLimiter

// 中间件函数(接口)：用于验证用户身份
router.use('/gologin', apiLimiter, async (req, res, next) => {
    // 从查询参数中获取手机号和密码
    const name = req.query.username;
    const password = req.query.password;
    // 模拟身份验证逻辑
    try {
        const users = await db.query(`SELECT * FROM user WHERE name = ?`, [name]);
        if (users.length > 0) {
            const hashFromDatabase = users[0].password;
            bcrypt.compare(password, hashFromDatabase, (err, result) => {
                if (err) {
                    console.error(err);
                    res.send(false);
                    return;
                }
                if (result) {
                    bcrypt.hash(password, saltRounds, async (err, hash) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        // 将哈希后的密码存储到数据库中
                        try {
                            const userId = name + ';' + hash
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
router.use('/checkLogin', apiLimiter, verifyToken, async (req, res, next) => {
    var arrdata = req.userId.split(';')
    const name = arrdata[0];
    const password = arrdata[1];
    console.log(name, password)
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
router.use('/refreshToken', apiLimiter, (req, res) => {
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
router.use('/Userregistration', apiLimiter, (req, res) => {
    console.log("注册")
    // 现在，req.body 包含从前端传递的JSON数据
    const plainPassword = req.body.Password;
    const username = req.body.username;
    const email = req.body.email;
    const phone = req.body.phone;
    bcrypt.hash(plainPassword, saltRounds, async (err, hash) => {
        // 将哈希后的密码存储到数据库中
        try {
            const userId = username + ';' + hash
            const users = await db.query(`INSERT INTO user (name, password,email,phone) VALUES (?, ?,?,?)`, [username, hash, email, phone]);
            res.json(generateToken(userId))
        } catch (error) {
            res.send(false);
        }
    });
});



// 忘记密码
router.use('/ForgotPassword', apiLimiter, (req, res) => {
    // 现在，req.body 包含从前端传递的JSON数据
    const username = req.body.username;
    const plainPassword = req.body.password;
    const email = req.body.email;
    const phone = req.body.phone;
    bcrypt.hash(plainPassword, saltRounds, async (err, hash) => {
        if (err) {
            console.error(err);
            return;
        }
        // 将哈希后的密码存储到数据库中
        try {
            const userId = username + ';' + hash
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


module.exports = router; // 导出路由，供api下的index.js文件调用