const express = require('express');
const dashboardController = require("../controllers/dashboardController");
const { verify } = require('../middlewares/verifyToken');

const router = express.Router();

// Route to get the main statistics for the dashboard cards
router.get('/stats', verify, dashboardController.getDashboardStats);

// Route to get the daily revenue data for the bar chart
router.get('/daily-omzet', verify, dashboardController.getDailyOmzet);

// Route to get the top-selling products for the detail modals
router.get('/top-products', verify, dashboardController.getTopSellingProducts);

module.exports = router;
