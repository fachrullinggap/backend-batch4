const express = require('express');
const userController = require("../controllers/userController")

const router = express.Router();

router.get('/', userController.getUser)
router.post('/create', userController.createUser)
router.post('/create-role', userController.createRole)
router.post('/login', userController.login)
router.put('/update/:id', userController.updateUser)
router.delete('/delete/:id', userController.deleteUser)

module.exports = router;