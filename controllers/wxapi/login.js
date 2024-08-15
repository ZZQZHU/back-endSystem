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
const axios = require('axios');

const multer = require('multer'); // 处理上传的文件
const crypto = require('crypto');
const path = require('path');

let access_token = ''
let expires_in
let createTime



// 设置存储引擎和文件名
const storage = multer.diskStorage({
    // 设置文件保存的目录，这里是相对于项目根目录的 'imgs' 文件夹
    destination: 'imgs',        //本地使用
    // 设置文件保存的目录，这里是绝对路径
    // destination: 'C:\\Users\\Administrator\\Desktop\\static\\userimgs',
    // 设置文件名的逻辑，避免同名文件被替换
    filename: (req, file, callback) => {
        // 使用哈希算法（MD5）对原始文件名进行哈希，得到唯一标识符
        const fileHash = crypto.createHash('md5').update(file.originalname).digest('hex');
        // 构造唯一的文件名，包含文件哈希、时间戳和原始文件扩展名
        const uniqueFileName = `${fileHash}-${Date.now()}${path.extname(file.originalname)}`;
        // 将唯一文件名传递给 Multer 存储引擎
        callback(null, uniqueFileName);
    },
});



router.use('/getOpenId', apiLimiter, async (req, res, next) => {
    try {
        const jscode = req.body.code; // 从查询参数中获取 code 参数
        const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
            params: {
                appid: 'wx8f5d85c9899b6160', // 小程序的 AppID
                secret: process.env['WX_KEY'], // 小程序的 AppSecret
                js_code: jscode,
                grant_type: 'authorization_code'
            }
        });

        // 提取需要的数据openid并发送给客户端
        const openid = response.data.openid;
        res.json({ openid });

    } catch (error) {
        console.error('Failed to get openid:', error);
        res.status(500).send('Failed to get openid');
    }
});


// 设置上传中间件
const upload = multer({ storage: storage });

// 接收微信上传图片
router.use('/upload', upload.single('file'), async (req, res) => {
    try {
        console.log(req.file); // 上传的文件信息
        // 你可以在这里处理文件，例如保存文件信息到数据库

        res.status(200).json({
            success: true,
            message: '文件上传成功',
            filePath: req.file.filename
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: '文件上传失败'
        });
    }
});


// 微信用户注册录入数据库，密码加密
router.use('/register', apiLimiter, async (req, res) => {
    const { user_id, name, email, password, openid, profile_picture_url, sex } = req.body;

    try {
        // 检查用户名是否已存在
        const [user] = await db.query(`SELECT * FROM user WHERE openid = ?`, [openid]);
        console.log(user);
        if (user) {
            return res.status(409).send('该微信用户已存在');
        }

        // 检查邮箱是否已存在
        const [emailUser] = await db.query(`SELECT * FROM user WHERE email = ?`, [email]);
        console.log(emailUser)
        if (emailUser) {
            return res.status(409).send('邮箱已存在');
        }

        // 用户名不存在，可以注册

        // 对密码进行哈希
        const hash = await bcrypt.hash(password, saltRounds);

        // 获取下当前时间
        const now = new Date();

        // 将用户信息插入数据库
        await db.query(`INSERT INTO user (user_id, name, password, email, openid, profile_picture_url, sex,registration_date) VALUES (?, ?, ?, ?, ?, ?, ?,?)`, [user_id, name, hash, email, openid, profile_picture_url, sex, now]);

        // 生成token
        const userId = user_id + ';' + hash
        res.json(generateToken(userId));
    } catch (error) {
        console.error('Error during registration:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).send('用户唯一信息已存在，请重新扫码注册');
        }

        res.status(500).send('注册失败');
    }
});


// 微信自动注册
router.use('/autoregister', apiLimiter, async (req, res) => {
    const { user_id, openid } = req.body;

    try {
        // 检查用户名是否已存在
        const [user] = await db.query(`SELECT * FROM user WHERE openid = ?`, [openid]);
        console.log(user);
        if (user) {
            return res.status(409).send('该微信用户已存在');
        }
        // 用户名不存在，可以注册
        // 获取下当前时间
        const now = new Date();

        // 将用户信息插入数据库
        await db.query(`INSERT INTO user (user_id, openid,registration_date) VALUES (?, ?,?)`, [user_id, openid, now]);

        // 生成token
        const userId = user_id + ';' + openid
        res.json(generateToken(userId));
    } catch (error) {
        console.error('Error during registration:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).send('用户唯一信息已存在，请重新扫码注册');
        }

        res.status(500).send('注册失败');
    }
});


// 微信用户根据openid获取用户信息，请求头中携带openid
router.use('/getUserInfo', apiLimiter, async (req, res) => {
    const openid = req.query.openid;

    try {
        // 查询用户信息
        const [user] = await db.query(`SELECT * FROM user WHERE openid = ?`, [openid]);
        console.log(user);
        if (!user) {
            return res.status(500).send('用户不存在');
        }

        // 从数据库中取出用户信息
        const { user_id, name, email, profile_picture_url, sex, password } = user;
        // 生成token
        const userId = user_id + ';' + password
        res.json({ user_id, name, email, profile_picture_url, sex, password, accessToken: generateToken(userId) });
    } catch (error) {
        console.error('Error during getUserInfo:', error);
        res.status(500).send('获取用户信息失败');
    }
}
);


// 微信生成小程序码
// 生成小程序码
router.post('/getwxacode', apiLimiter, async (req, res) => {
    const { scene, page } = req.body;
    const accessToken = await getAccessToken();
    try {
        const response = await axios.post(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`, {
            page: page,
            scene: scene
        }, {
            responseType: 'arraybuffer' // 微信接口返回的是二进制数据
        });

        res.setHeader('Content-Type', 'image/jpeg');
        res.send(response.data);
    } catch (error) {
        console.error('Error getting wxacode:', error);
        res.status(500).send('获取小程序码失败');
    }
});

// 获取微信 access token
const getAccessToken = async () => {
    if (access_token) {
        const now = Date.now();
        if (now - createTime < expires_in * 1000) {
            return access_token;
        }
        return await fetchWxToken();
    }
    return await fetchWxToken();
}

// 请求新的微信 access token
const fetchWxToken = async () => {
    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: {
            grant_type: 'client_credential',
            appid: 'wx8f5d85c9899b6160',
            secret: process.env.WX_KEY
        }
    });

    access_token = response.data.access_token;
    expires_in = response.data.expires_in; // 过期时间 7200 秒
    createTime = Date.now();
    return access_token;
}



module.exports = router; // 导出路由，供api下的index.js文件调用