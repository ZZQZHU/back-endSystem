require('dotenv').config(); //.env文件中读取环境变量并使其在process.env中可用
const path = require('path');
const express = require('express');
const db = require('./../../sql/db') // 导入数据库连接
// 引入axios
const axios = require('axios');
const router = express.Router(); // 创建路由





router.use('/chatstream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');


    try {
        const { Content, Filecontent, ConversationId, user_id, difyid } = req.body;
        let apikeylist = [
            {
                id: 'DifyizNoreZYGdSRbx',
                apikey: 'Difyqz_API_KEY'
            },
            {
                id: 'DifyGr5SH44Gh9LHoW',
                apikey: 'Difyxc_API_KEY'
            },
            {
                id: 'DifyowINfQa2atc06i',
                apikey: 'Difyms_API_KEY'
            }
        ];

        // 根据difid获取apikey
        let apikey = '';
        for (let i = 0; i < apikeylist.length; i++) {
            if (apikeylist[i].id == difyid) {
                apikey = apikeylist[i].apikey;
            }
        }
        console.log(apikey)
        // 判断Filecontent是否为空
        let querycontent = '';
        if (Filecontent == '') {
            querycontent = Content;
        } else {
            querycontent = Content + "这是我的文件内容：" + Filecontent;
        }
        axios.post('https://api.dify.ai/v1/chat-messages', {
            "inputs": {},
            "query": querycontent,
            "response_mode": "streaming",
            "conversation_id": ConversationId,
            "user": user_id,
            "files": []
        }, {
            headers: {
                Authorization: `Bearer ${process.env[apikey]}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        }).then((response) => {
            response.data.on('data', chunk => {
                res.write(`${chunk.toString()}\n\n`);
            });
            response.data.on('end', () => {
                res.write('data: [DONE]\n\n');
                res.end();
            });

        })

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while processing your request');
    }
});




// 记录用户的聊天记录，存到每日记录表里面
router.use('/recordchat', async (req, res) => {
    const { user_id, messages, type, difyid, conversation_id } = req.body;
    // 将messages转换成字符串
    const messagesstring = JSON.stringify(messages);
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = `${year}-${month}-${day}`;


    console.log(messagesstring);
    console.log(user_id);
    console.log(type);
    console.log(difyid);
    console.log(today);
    // 判断是否有当日的数据
    const sql = `SELECT * FROM aichatrecord WHERE user_id = ? AND date = ? AND type = ? AND difyid = ?AND conversation_id = ?`;
    const values = [user_id, today, type, difyid, conversation_id];
    const result = await db.query(sql, values);
    // 如果有当日的数据，更新数据
    if (result.length > 0) {
        const sql = `UPDATE aichatrecord SET chatdata = ? WHERE user_id = ? AND date = ? AND type = ? AND difyid = ?AND conversation_id = ?`;
        const values = [messagesstring, user_id, today, type, difyid, conversation_id];
        const resultup = await db.query(sql, values);
    } else {
        // 如果没有当日的数据，插入数据
        const sql = `INSERT INTO aichatrecord (user_id, chatdata, date,type,difyid,conversation_id) VALUES (?, ?, ?,?,?,?)`;
        const values = [user_id, messagesstring, today, type, difyid, conversation_id];
        const result = await db.query(sql, values);
    }
    // 返回结果
    res.json('success');
});

// 获取用户当日的聊天记录
router.use('/getchatrecord', async (req, res) => {
    const { user_id, type, difyid } = req.body;
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = `${year}-${month}-${day}`;
    const sql = `SELECT * FROM aichatrecord WHERE user_id = ? AND date = ? AND type = ? AND difyid = ?`;
    const values = [user_id, today, type, difyid];
    const result = await db.query(sql, values);
    res.json(result);
});





module.exports = router;