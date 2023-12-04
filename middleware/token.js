require('dotenv').config(); //.env文件中读取环境变量并使其在process.env中可用
const secret = process.env.SECRET_KEY; //token加密解密的密钥
const refresh_secret = process.env.REFRESH_SECRET; //refresh token加密解密的密钥
const jwt = require('jsonwebtoken'); // 导入 jsonwebtoken 模块

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
        console.log(decoded,"token验证成功")
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token验证失败' });
    }
}


module.exports = {
    generateToken,
    verifyToken
};