const express = require('express');
const loginRouter = require('./login');
const uploadRouter = require('./upload');


const router = express.Router();

router.use('/login', loginRouter);
router.use('/upload', uploadRouter);

module.exports = router;