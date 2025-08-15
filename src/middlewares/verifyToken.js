const jwt = require('jsonwebtoken')

exports.verify = async (req, res, next) => {
    try {
        const token = req.headers["authorization"]
        if (!token) {
            const err = new Error('Token kosong, silahkan login.');
            err.status = 403;
            throw err;
        }

        const checkToken = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET)
        if (!checkToken) {
            const err = new Error('Gagal memvalidasi token.');
            err.status = 403;
            throw err;
        }

        req.user = checkToken

        next()
    } catch (error) {
        next(error)
    }
}