const express = require('express');
const config = require('./../../config')
const bcrypt = require('bcrypt'); //密码哈希涉及的模块
const saltRounds = config.saltRounds; // 控制哈希强度
const db = require('./../../sql/db') // 导入数据库连接
const apiLimiter = require('./../../middleware/safe').apiLimiter
const router = express.Router(); // 创建路由
const { generateToken, verifyToken } = require('./../../middleware/token'); // 导入Token中间件
require('dotenv').config(); //.env文件中读取环境变量并使其在process.env中可用
const secret = process.env.SECRET_KEY; //token加密解密的密钥
const refresh_secret = process.env.REFRESH_SECRET; //refresh token加密解密的密钥


// 获取博文信息
router.use('/Getbloginfo', apiLimiter, async (req, res) => {
    const blogid = req.body.blogid;
    const bloginfo = await db.query(`SELECT * FROM posts WHERE post_id=?`, [blogid]);
    res.json(bloginfo);
});


// 获取博文列表，分页，筛选条件
router.use('/Getbloglist', apiLimiter, async (req, res) => {
    const page = req.body.page;
    const limit = req.body.limit;
    const type = req.body.type; // 0是全部 
    const toptab = req.body.toptab; //按照时间排序
    const search = req.body.search; //搜索，根据数据表里里面的summary和title
    console.log(search, limit);

    // 分页
    const offset = (page - 1) * limit;

    // 筛选条件
    let where = '';
    if (type !== 0) {
        where += `WHERE type=${type} `;
    }
    if (search) {
        if (type !== 0) {
            where += `AND summary LIKE '%${search}%' OR title LIKE '%${search}%' `;
        } else {
            where += `WHERE summary LIKE '%${search}%' OR title LIKE '%${search}%' `;
        }

    }
    if (toptab !== 0) {
        where += `ORDER BY publish_time DESC `;
    } else {
        // 时间倒序
        where += `ORDER BY publish_time ASC `;
    }


    // 拼接SQL语句
    const sql = `SELECT * FROM posts ${where} LIMIT ${offset},${limit}`;
    console.log(sql);
    // 执行SQL语句
    const bloglist = await db.query(sql);
    res.json(bloglist);
})



module.exports = router; 