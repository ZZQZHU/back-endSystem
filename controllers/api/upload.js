const express = require('express');
const multer = require('multer'); // 处理上传的文件
const crypto = require('crypto');
const path = require('path');
const db = require('./../../sql/db') // 导入数据库连接
const { generateToken, verifyToken } = require('./../../middleware/token'); // 导入Token中间件
const apiLimiter = require('./../../middleware/safe').apiLimiter


const router = express.Router();

// 设置存储引擎和文件名
const storage = multer.diskStorage({
    // 设置文件保存的目录，这里是相对于项目根目录的 'imgs' 文件夹
    destination: 'imgs',        //本地使用
    // 设置文件保存的目录，这里是绝对路径
    // destination: 'C:\\Users\\Administrator\\Desktop\\static\\imgs',
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

// 设置上传中间件
const upload = multer({ storage: storage });

/**
 * 处理上传请求
 * POST /upload
 */
router.post('/uploadimg', apiLimiter, upload.single('file'), async (req, res) => {
    try {
        // 检查是否有上传的文件
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log(req.file);  // 输出上传的文件信息
        // 构造图片URL
        const imageUrl = `https://static.aiblog.top/imgs/${req.file.filename}`;
        // 将图片信息插入到数据库中
        const imageInfo = {
            image_url: imageUrl,
            ispreserve: 1, // 默认值，你可以根据需要修改
        };
        const AddImg = await db.query(`INSERT INTO postimages (image_id, image_url, ispreserve)
        VALUES  (UUID(),?,?);`, [imageUrl, 1], (err, result) => {
            if (err) {
                console.log(err);
            }
        });
        // 在此处可以将图片信息插入到数据库中

        // 返回图片URL给前端
        res.json({ imageUrl: imageUrl });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 处理修改图片保存状态请求
router.post('/preserve', apiLimiter, async (req, res) => {
    try {
        // 获取图片数组
        const imageurlArr = req.body.imagearr;
        // 遍历图片数组，逐个修改保存状态
        for (let i = 0; i < imageurlArr.length; i++) {
            const updateImg = await db.query(`UPDATE postimages SET ispreserve = 0 WHERE image_url = ?;`, [imageurlArr[i]], (err, result) => {
                if (err) {
                    console.log(err);
                }
            });
        }
        // 返回成功
        res.json({ success: true });
    } catch (error) {
        console.error("Error preserving image:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// 上传博文详情
router.post('/uploadblog', apiLimiter, verifyToken, async (req, res) => {
    try {
        const { title, content, summary, type, tag, img, blogid } = req.body;
        const arrdata = req.userId.split(';')
        const user_id = arrdata[0];
        console.log(user_id, title, summary, type, tag, img, blogid)
        const date = new Date();
        const AddBlog = await db.query(`INSERT INTO posts (post_id, user_id, title, content, summary, type, tag, cover_image_url, is_publish,is_deleted,is_approved,publish_time) VALUES  (?,?,?,?,?,?,?,?,?,?,?,?);`, [blogid, user_id, title, content, summary, type, tag, img, true, false, true, date], (err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log(result);
            }
        });
        res.send(true)


    }
    catch (error) {
        console.log(error)
        res.send(false);    // 处理错误
    }
});

module.exports = router;
