const express = require('express');
const todoController = require("../controllers/todoController")

const router = express.Router();

router.post('/create', todoController.createTodo)
router.get('/todos', todoController.allTodos)
router.delete('/todo/:id', todoController.deleteTodo)
router.put('/todo/:id', todoController.updateTodo)

module.exports = router