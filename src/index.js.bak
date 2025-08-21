require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');

//import router
const router = require('./routes/router');
const userRouter = require('./routes/userRouter');
const todoRouter = require('./routes/todoRouter')
const uploadRouter = require("./routes/uploadRouter")

//import custom middleware
const {logger} = require('./middlewares/logger');

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
    message: "Terjadi error",
    data: err.message || "Internal server error"
  })
})

app.listen(process.env.SERVER_PORT, () => {
  console.log('Server Running');
});
