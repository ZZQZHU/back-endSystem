const { logError } = require('../tool/logger');

function errorHandler(err, req, res, next) {
    // 如果在其他中间件或路由处理函数中发生了错误，将进入这里
    console.error(err);
    // 记录错误日志
    logError(err, req);
    // 返回适当的错误响应给客户端
    res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = errorHandler;