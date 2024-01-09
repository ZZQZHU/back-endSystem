const rateLimit = require('express-rate-limit');
// 设置限制参数，每个接口独立计数
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 2, // 允许的最大请求次数
    message: '请求次数超限，请稍后再试。',
  });

  module.exports = {
    apiLimiter
  }