const express = require('express');
const reportController = require("../controllers/reportController")
const {verify} = require('../middlewares/verifyToken')

const router = express.Router();

router.post('/create',verify, reportController.createOrder)
router.get('/get-id-order/:id',verify, reportController.getOrderById )
router.get('/get-all-orders',verify, reportController.getAllOrders)

module.exports = router;