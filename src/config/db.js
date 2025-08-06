const {Pool} = require("pg")

const pool = new Pool({
    user: "todo_user",
    host: "localhost",
    database: "todo_db",
    password: "todo_pass",
    port: 5432
})

module.exports = pool