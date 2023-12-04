// app.js
const express = require('express');
require('dotenv').config(); //.env文件中读取环境变量并使其在process.env中可用
const config = require('./config')
const app = express();
const port = config.Port;
const errorHandler = require('./middleware/logerror');   // 导入错误处理中间件(记录接口调用失败日志)
const cors = require('cors'); // 导入 CORS 中间件
// 配置允许的来源
const corsOptions = config.corsOptions;
// 启用 CORS 中间件，允许所有来源的请求
app.use(cors(corsOptions));
app.use(express.json()); // 解析请求体中的 JSON 数据


const apiRoutes=require('./controllers/api/index')  //导入api接口路由
app.use('/api', apiRoutes);

// 错误处理中间件：记录接口调用失败日志
app.use(errorHandler);

app.listen(port, () => {
    console.log(`运行起来了 ${port}`);
});

//  中间件的执行顺序非常重要。中间件按照它们添加到应用程序的顺序依次执行，所以根据中间件的添加顺序，你可以区分出哪个中间件用于处理未找到的路由。
//  可以试着将错误处理中间件往前放，结果就不一样了