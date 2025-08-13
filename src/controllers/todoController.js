const pool = require("../config/db")

exports.createTodo = async (req, res) => {
    const {text} = req.body
    const result = await pool.query('INSERT INTO todos (text) VALUES ($1) RETURNING *', [text])

    res.status(201).json({
        message: "berhasil tambah data",
        data: result.rows[0]
    })
}

exports.allTodos = async (req, res) => {
    const result = await pool.query('SELECT * FROM todos ORDER BY id DESC')

    res.json({
        message: "Berhasil ambil data todos",
        data: result.rows
    })
}

exports.deleteTodo = async (req, res) => {
    const {id} = req.params
    await pool.query('DELETE FROM todos WHERE id = $1', [id])

    res.json({
        message: `Berhasil hapus todo dengan id ${id}`,
        data: null
    })
}

exports.updateTodo = async (req, res) => {
    const {id} = req.params
    const {done} = req.body

    const result = await pool.query('UPDATE todos SET done = $1 WHERE id = $2 RETURNING *', [done, id])

    res.json({
        message: `Berhasil update todo dengan id ${id}`,
        data: result.rows[0],
    })
}