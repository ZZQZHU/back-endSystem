const path = require('path');

module.exports = {
    Port: 5000, // 启动端口
    staticDir: path.resolve('./static'), // 静态资源路径
    uploadDir: path.join(__dirname, path.resolve('static/')), // 上传文件路径
    saltRounds: 10, // 控制哈希强度
    corsOptions: { // 配置允许的来源
        origin: '*', // 指定允许的来源域名
    }
}