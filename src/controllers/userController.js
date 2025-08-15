const env = require('dotenv');
const {PrismaClient} = require("../../generated/prisma")
const pool = require('../config/db')
const bcrypt = require("bcrypt")
const validator = require('validator')
const jwt = require('jsonwebtoken')


const prisma = new PrismaClient()

exports.getUser = (req, res, next) => {
    const user1 = {
        nama: "Fachrul",
        asal: "Bandung",
        pekerjaan: "Software Developer"
    }

    res.send(user1);
};

exports.createUser = async (req, res, next) => {
    try {
        const {username, password, email, role} = req.body;

        if (!username || !password || !email || !role) {
            const err = new Error("Username, password, email dan role harus di isi")
            err.status = 400;
            throw err;
        }

        const strongPass = validator.isStrongPassword(password)
        if (!strongPass) {
          const err = new Error("Password harus minimal 8 karakter (termasuk huruf besar, huruf kecil, angka, dan simbol")
            err.status = 400;
            throw err;
        }
        
        // const existUser = await pool.query("SELECT id FROM user WHERE email = $1 LIMIT 1", [email])
        // Check if username or email already exists
        const existUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });
        
        if (existUser) {
            const err = new Error("Username atau email sudah terdaftar.");
            err.status = 400;
            throw err;
        }

        const searchRole = await prisma.role.findUnique({
            where: { name: role },
        });

        if (!searchRole) {
            const err = new Error("Role tidak ditemukan.");
            err.status = 500;
            throw err;
        } 

        const passwordHash = await bcrypt.hash(password, 10)
        // const result = await pool.query("INSERT INTO user (nama, email, pwd) VALUES ($1, $2, $3) RETURNING id, nama, email", [nama, email, passwordHash])
        const result = await prisma.user.create({
            data: {
                username: username,
                password: passwordHash, // use your hashed password here
                email: email,
                roleId: searchRole.id,
            },
        });

        return res.status(201).json({
            message: "User berhasil terdaftar",
            data: {                
               ...result,
                id: result.id.toString(), // Convert BigInt to string
                role: searchRole.name,
                roleId: result.roleId.toString(), // Convert BigInt to string
                email: email,
            },
        })
    } catch (error) {
        next(error)
    }
}

exports.createRole = async (req, res, next) => {
    try {
        const {role_name} = req.body
        if (!role_name) {
            const err = new Error("Role name is required")
            err.status = 400
            throw err
        }

        const result = await prisma.role.create({
            data: {
                name: role_name
            }
        })

        return res.status(201).json({
            message: "Berhasil create role",
            data: {
                ...result,
                id: result.id.toString()
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      const err = new Error('Username dan password harus diisi.');
      err.status = 400;
      throw err;
    }

    const result = await prisma.user.findUnique({
      where: {
        username,
      },
      include: {role: true}
    });

    if (!result) {
      const err = new Error('Username tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    const isValidPassword = await bcrypt.compare(password, result.password)
    if (!isValidPassword) {
      const err = new Error('Password yang anda masukkan salah.');
      err.status = 401;
      throw err;
    }

    const token = jwt.sign({id: result.id.toString(), username: result.username, role: result.role.name}, process.env.JWT_SECRET, {expiresIn: "1h"})

    return res.status(200).json({
      message: 'User Berhasil Login',
      data: {
        username: result.username,
        id: result.id.toString(),
        role_id: result.roleId.toString(),
        role: result.role.name,
        token: token
      },
    });
  } catch (error) {
    next(error)
  }
}

exports.updateUser = async (req, res, next) => {
  try {
    const {id} = req.user
    // console.log(req.user)
    const {username} = req.body

    if (!username || !id) {
      const err = new Error('Username dan id harus diisi.');
      err.status = 400;
      throw err;
    }

    const isExistUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!isExistUser) {
      const err = new Error('Username tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    const result = await prisma.user.update({
      where: {
        id
      },
      data: {
        username: username
      }
    })

    return res.status(201).json({
      username: result.username,
      id: result.id.toString(),
      role_id: result.roleId.toString(),
    });
  } catch (error) {
    next(error)
  }
}

exports.deleteUser = async (req, res, next) => {
  try {
    const {role, id} = req.user

    if (role !== "admin") {
      const err = new Error('Hanya admin yang boleh menghapus user.');
      err.status = 404;
      throw err;
    }

    const isExistUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!isExistUser) {
      const err = new Error('Username tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    await prisma.user.delete({
      where: {
        id
      }
    })

    return res.status(200).json({
      message: "user berhasil dihapus",
      data: null
    })
  } catch (error) {
    next(error)
  }
}