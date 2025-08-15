const express = require('express');
const userController = require("../controllers/userController")
const {verify} = require('../middlewares/verifyToken')

const router = express.Router();

router.get('/', userController.getUser)
router.post('/create', userController.createUser)
router.post('/create-role',verify , userController.createRole)
router.post('/login', userController.login)
router.put('/update', verify, userController.updateUser)
router.delete('/delete', verify, userController.deleteUser)

module.exports = router;