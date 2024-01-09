const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const db = require('./../../sql/db') // 导入数据库连接

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
        const imageUrl = `http://116.62.189.123:88/imgs/${req.file.filename}`;
        // 将图片信息插入到数据库中
        const imageInfo = {
            post_id: "12312435776769", // 从请求中获取博文ID，这需要根据你的实际前端请求进行修改
            image_url: imageUrl,
            ispreserve: 0, // 默认值，你可以根据需要修改
        };
        const AddImg = await db.query(`INSERT INTO postimages (image_id, post_id, image_url, ispreserve)
        VALUES  (UUID(), ?,?,?);`, ["12312435776769", imageUrl, 0], (err, result) => {

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

module.exports = router;
