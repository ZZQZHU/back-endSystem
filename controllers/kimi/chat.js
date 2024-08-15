require('dotenv').config(); //.env文件中读取环境变量并使其在process.env中可用
const multer = require('multer'); // 处理上传的文件
const OpenAI = require("openai");
const client = new OpenAI({
    apiKey: process.env['Kimi_API_KEY'],
    baseURL: "https://api.moonshot.cn/v1",
});
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const db = require('./../../sql/db') // 导入数据库连接
// 引入axios
const axios = require('axios');
const router = express.Router(); // 创建路由


// 设置存储引擎 Kimifiles 和文件名
const storage = multer.diskStorage({
    destination: 'Kimiuploads/', // 设置文件保存的目录，这里是相对于项目根目录的 'Kimiuploads' 文件夹  本地使用
    filename: (req, file, callback) => {
        // 使用哈希算法（MD5）对原始文件名进行哈希，得到唯一标识符
        const fileHash = crypto.createHash('md5').update(file.originalname).digest('hex');
        // 构造唯一的文件名，包含文件哈希、时间戳和原始文件扩展名
        const uniqueFileName = `${fileHash}-${Date.now()}${path.extname(file.originalname)}`;
        // 将唯一文件名传递给 Multer 存储引擎
        callback(null, uniqueFileName);
    },
});
// 设置上传中间件
const upload = multer({ storage: storage });




router.use('/chatstream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const { model, messages } = req.body;
        const response = await client.chat.completions.create({
            model: model,
            messages: messages,
            temperature: 0.3,
            stream: true,
        });

        for await (const chunk of response) {
            const chunkMessage = chunk.choices[0].delta;
            if (!chunkMessage.content) continue;
            // 处理成字符串
            const chunkstring = JSON.stringify(chunk);
            res.write(`data: ${chunkstring}\n\n`);
        }
        // 发送最后一条数据，并关闭流
        res.write(`data: [DONE]\n\n`);
        res.end();  // 关闭流 重要
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while processing your request');
    }
});




// 上传文件，formdata 接受文件流
router.use('/uploadfile', upload.single('file'), async (req, res) => {
    try {
        // 检查是否有上传的文件
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log(req.file, '文件类型');  // 输出上传的文件信息
        console.log(req.file.path);  // 输出上传的文件信息
        let file_object = await client.files.create({
            file: fs.createReadStream(req.file.path),
            purpose: "file-extract"
        });
        // // 判断文件类型，如果是图片，就不删除，并且返回图片的url
        // if (req.file.mimetype.includes('image')) {
        //     let imgurl = "https://backsys.aiblog.top/kimifiles/" + req.file.filename;
        //     res.json({ file_object, imgurl });
        //     return;
        // }
        // // 将上传的文件从服务器删除
        // // C:\\Users\\Administrator\\Desktop\\static\\kimifiles
        fs.unlinkSync(req.file.path)
        res.json({ file_object, imgurl: '' });
    } catch (error) {
        // 将上传的文件从服务器删除
        fs.unlinkSync(req.file.path)
        res.json({ state: false, imgurl: '' });
    }
});

// 读取文件内容 根据文件id
router.use('/readfile', async (req, res) => {
    try {
        let { file_id } = req.body;
        let file_object = await (await client.files.content(file_id)).text()
        res.json(file_object);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while processing your request');
    }
});

// 删除文件 根据文件id
router.use('/deletefile', async (req, res) => {
    // 通过axios  调用第三方接口 DELETE https://api.moonshot.cn/v1/files/{file_id}
    try {
        let { file_id } = req.body;
        const response = await axios.delete(`https://api.moonshot.cn/v1/files/${file_id}`, {
            headers: {
                Authorization: `Bearer ${process.env.Kimi_API_KEY}`,
            },
        });
        // 返回删除结果的数据部分
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while processing your request');
    }
});

// 获取文件列表
router.use('/filelist', async (req, res) => {
    try {
        let file_object = await client.files.list()
        res.json(file_object);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while processing your request');
    }
});

// 计算token  存到每日token的数据表里面
router.use('/estimatetoken', async (req, res) => {
    // 通过axios  调用第三方接口  https://api.moonshot.cn/v1/tokenizers/estimate-token-count
    const { model, messages, user_id } = req.body;
    try {
        const response = await axios.post('https://api.moonshot.cn/v1/tokenizers/estimate-token-count', {
            model: model,
            messages: messages,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.Kimi_API_KEY}`,
            },
        });
        console.log(response.data.data.total_tokens);
        //  存到aitoken的数据表里面
        const chattoken = response.data.data.total_tokens;
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const today = `${year}-${month}-${day}`;
        // 判断是否有当日的数据
        const sql = `SELECT * FROM aitoken WHERE user_id = ? AND date = ?`;
        const values = [user_id, today];
        const result = await db.query(sql, values);
        // 如果有当日的数据，更新数据 在原来的基础上加上新的token
        if (result.length > 0) {
            const sql = `UPDATE aitoken SET chattoken = ? WHERE user_id = ? AND date = ?`;
            // 字符串转数字相加
            const newtoken = Number(result[0].chattoken) + new Number(chattoken);
            const values = [newtoken, user_id, today];
            const resultup = await db.query(sql, values);
        } else {
            // 如果没有当日的数据，插入数据
            const sql = `INSERT INTO aitoken (user_id, chattoken, date) VALUES (?, ?, ?)`;
            const values = [user_id, chattoken, today];
            const result = await db.query(sql, values);
        }
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while processing your request');
    }
});

// 获取用户当日的累积token
router.use('/gettoken', async (req, res) => {
    const { user_id } = req.body;
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = `${year}-${month}-${day}`;
    const sql = `SELECT * FROM aitoken WHERE user_id = ? AND date = ?`;
    const values = [user_id, today];
    const result = await db.query(sql, values);
    res.json(result);
});


// 记录用户的聊天记录，存到每日记录表里面
router.use('/recordchat', async (req, res) => {
    const { user_id, messages, type } = req.body;
    // 将messages转换成字符串
    const messagesstring = JSON.stringify(messages);
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = `${year}-${month}-${day}`;
    // 判断是否有当日的数据
    const sql = `SELECT * FROM aichatrecord WHERE user_id = ? AND date = ?`;
    const values = [user_id, today];
    const result = await db.query(sql, values);
    // 如果有当日的数据，更新数据
    if (result.length > 0) {
        const sql = `UPDATE aichatrecord SET chatdata = ? WHERE user_id = ? AND date = ? AND type = ?`;
        const values = [messagesstring, user_id, today, type];
        const resultup = await db.query(sql, values);
    } else {
        // 如果没有当日的数据，插入数据
        const sql = `INSERT INTO aichatrecord (user_id, chatdata, date,type) VALUES (?, ?, ?,?)`;
        const values = [user_id, messagesstring, today, type];
        const result = await db.query(sql, values);
    }
    // 返回结果
    res.json('success');
});

// 获取用户当日的聊天记录
router.use('/getchatrecord', async (req, res) => {
    const { user_id, type } = req.body;
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = `${year}-${month}-${day}`;
    const sql = `SELECT * FROM aichatrecord WHERE user_id = ? AND date = ? AND type = ?`;
    const values = [user_id, today, type];
    const result = await db.query(sql, values);
    res.json(result);
});





module.exports = router;