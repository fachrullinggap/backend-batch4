exports.uploadFile = async (req, res) => {
    try {
        const {file} = req
        console.log(file)

        return res.status(201).json({
            message: "Upload berhasil",
            data: null
        })
    } catch (error) {
        throw new Error(error.message || "internal server error") 
    }
}