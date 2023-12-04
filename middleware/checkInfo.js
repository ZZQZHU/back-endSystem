function validateForm(req, res, next) {
    const { username, phone, email } = req.body;

    // 检查用户名
    if (!username || username.trim() === '') {
        return res.status(400).json({ error: '用户名不能为空' });
    }

    // 检查手机号
    if (!phone || !/^\d{10}$/.test(phone)) {
        return res.status(400).json({ error: '请输入有效的手机号' });
    }

    // 检查邮箱
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '请输入有效的邮箱地址' });
    }

    // 如果通过验证，继续下一个中间件或路由处理函数
    next();
}

module.exports = validateForm;