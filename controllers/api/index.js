const express = require('express');
const loginRouter = require('./login');
const uploadRouter = require('./upload');
const blogRouter = require('./blog');



const router = express.Router();

router.use('/login', loginRouter);
router.use('/upload', uploadRouter);
router.use('/blog', blogRouter);

module.exports = router;