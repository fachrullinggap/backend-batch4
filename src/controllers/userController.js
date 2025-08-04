exports.getUser = (req, res, next) => {
    const user1 = {
        nama: "Fachrul",
        asal: "Bandung",
        pekerjaan: "Software Developer"
    }

    res.send(user1);
};

exports.createUser = (req, res, next) => {
    const data = req.body
    
    data.umur = 31

    res.send(data)
}