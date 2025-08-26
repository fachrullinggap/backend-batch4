const express = require('express');
const userController = require("../controllers/userController")
const {verify} = require('../middlewares/verifyToken')
const upload = require('../middlewares/upload');

const router = express.Router();

router.get('/get-user/:id',verify, userController.getUserById )
router.get('/get-users',verify, userController.getUsers)
router.post('/create',verify, userController.createUser)
router.post('/create-role',verify , userController.createRole)
router.post('/login', userController.login)
router.patch('/update/:id', verify, userController.updateUser)
router.delete('/delete/:id', verify, userController.deleteUser)
router.patch('/edit/profile', verify, upload.single('profilePicture'), userController.updateProfile)
router.delete('/remove/profile-pic', verify, userController.deleteProfilePic)

module.exports = router;