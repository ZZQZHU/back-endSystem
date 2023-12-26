const express = require('express');
const imgRouter = require('./img');

const router = express.Router();

router.use('/img', imgRouter);

module.exports = router;