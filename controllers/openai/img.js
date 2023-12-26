require('dotenv').config(); //.env文件中读取环境变量并使其在process.env中可用
const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
    baseURL: "https://api.pumpkinaigc.online/v1",
    // baseURL: "http://192.168.0.105:5000/v1",
});

const express = require('express');
const router = express.Router(); // 创建路由




// 生成图片函数(接口)：
router.use('/createimg', async (req, res, next) => {
    console.log(req.body, typeof (req.body))
    const imgdata = req.body.prompt
    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: imgdata,
        n: 1,
        size: "1024x1024",
    });
    console.log(response.data)
    const image_url = response.data[0].url;
    res.json({ imgurl: image_url });
});
module.exports = router;