const pool = require('./db')

async function testConnection() {
    try {
        const res = await pool.query("SELECT NOW()")
        console.log(`Koneksi berhasil`, res.rows[0].now)
    } catch (error) {
        console.log(`Koneksi gagal`, error.message)
    } finally {
        await pool.end()
    }
}

testConnection()