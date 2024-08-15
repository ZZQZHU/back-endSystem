const express = require('express');
const DifyRouter = require('./chat');

const router = express.Router();

router.use('/chat', DifyRouter);

module.exports = router;