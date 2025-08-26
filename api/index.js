require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const PORT = process.env.SERVER_PORT || 3000

//import router
const router = require('../src/routes/router');
const userRouter = require('../src/routes/userRouter');
const productRouter = require('../src/routes/productRouter');
const reportRouter = require('../src/routes/reportRouter');
const dashboardRoutes = require('../src/routes/dashboardRoutes');
const todoRouter = require('../src/routes/todoRouter')
const uploadRouter = require("../src/routes/uploadRouter")

//import custom middleware
const {logger} = require('../src/middlewares/logger');

const app = express();

//use middlewares
app.use(logger);
app.use('/static', express.static('public'));
app.use(compression())
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors({ origin: true, credentials: true }));

app.use('/', router);
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/order', reportRouter);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/todo', todoRouter)
app.use('/api/upload', uploadRouter)

//handle error jika route tidak ditemukan
app.get('/*splat', async (req, res, next) => {
  return res.status(400).json({
    message: "Route not Found",
    data: null
  })
})

//global error handling untuk tiap service
app.use((err, req, res, next) =>{
  console.error("Terjadi error", err.stack || err)

  return res.status(err.status || 500).json({
    message: err.message,
    data: err.message || "Internal server error"
  })
})

app.listen(PORT, () => {
  console.log('Server Running');
});
