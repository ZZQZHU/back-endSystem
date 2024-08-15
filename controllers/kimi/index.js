const express = require('express');
const KimiRouter = require('./chat');

const router = express.Router();

router.use('/chat', KimiRouter);

module.exports = router;