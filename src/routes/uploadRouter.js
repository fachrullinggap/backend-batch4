const express = require('express')
const multer = require('multer')
const storage = multer.memoryStorage();
const uploadController = require('../controllers/uploadController')

const router = express.Router()
const upload = multer({ storage});

router.post('/', upload.single('gambar'), uploadController.uploadFile)

module.exports = router