const express = require('express');
const productController = require("../controllers/productController")
const {verify} = require('../middlewares/verifyToken')
const upload = require('../middlewares/upload');

const router = express.Router();

router.get('/get-product/:id',verify, productController.getProductById )
router.get('/get-products',verify, productController.getProducts)
router.post('/create',verify, upload.single('productPicture'), productController.createProduct)
router.delete('/delete/:id', verify, productController.deleteProduct)
router.patch('/edit-product/:id', verify, upload.single('productPicture'), productController.updateProduct)

module.exports = router;