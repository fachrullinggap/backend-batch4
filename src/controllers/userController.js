const env = require('dotenv');
const {PrismaClient} = require("../../generated/prisma")
// const {PrismaClient} = require("@prisma/client")
const pool = require('../config/db')
const bcrypt = require("bcrypt")
const validator = require('validator')
const jwt = require('jsonwebtoken')
const { put, del } = require('@vercel/blob');


const prisma = new PrismaClient()

exports.getUserById = async (req, res, next) => {
  try {
    // 1. Get the user ID from the request parameters (e.g., from /api/user/:id)
    const { id } = req.params;

    // 2. Validate and convert the ID to a number, as it comes from the URL as a string
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      const err = new Error('User ID must be a valid number.');
      err.status = 400; // Bad Request
      throw err;
    }

    // 3. Find the unique user in the database using the converted ID
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      // Select the same fields as your get-all-users function
      select: {
        id: true,
        username: true,
        email: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    // 4. Handle the case where the user is not found
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404; // Not Found
      throw err;
    }

    // 5. Format the user data to match what the frontend expects (flatten the role)
    const formattedUser = {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role.name,
    };

    // 6. Send the successful response with the single user's data
    return res.status(200).json({
      message: 'Successfully retrieved user',
      data: formattedUser,
    });

  } catch (error) {
    // 7. Pass any errors to your error handling middleware
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    // 1. Fetch all users from the database using Prisma
    const users = await prisma.user.findMany({
      // Use 'select' to specify exactly which fields to return
      select: {
        id: true,
        username: true,
        email: true,
        // Include the related 'role' and select only its 'name' field
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        id: 'asc', // Optional: order the results by user ID
      },
    });

    // 2. Map the results to flatten the data structure
    // The query above returns role as an object: { role: { name: 'Admin' } }
    // We need to transform it to: { role: 'Admin' }
    const formattedUsers = users.map(user => ({
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role.name, // Flatten the nested role name
    }));

    // 3. Send the formatted data as the response
    return res.status(200).json({
      message: 'Sukses mendapatkan data semua user',
      data: formattedUsers,
    });
  } catch (error) {
    // Pass any errors to the next middleware
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
    try {

        const {role} = req.user

        if (role !== "admin") {
          const err = new Error('Hanya admin yang boleh menghapus user.');
          err.status = 404;
          throw err;
        }

        const {username, password, email, userRole} = req.body;

        if (!username || !password || !email || !userRole) {
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
            where: { name: userRole },
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
            const err = new Error("Nama role harus di isi")
            err.status = 400
            throw err
        }

        const result = await prisma.role.create({
            data: {
                name: role_name
            }
        })

        return res.status(201).json({
            message: "Berhasil membuat role",
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

    const token = jwt.sign({id: result.id.toString(), username: result.username, role: result.role.name}, process.env.JWT_SECRET, {expiresIn: "8h"})

    return res.status(200).json({
      message: 'User Berhasil Login',
      data: {
        username: result.username,
        id: result.id.toString(),
        email: result.email,
        role_id: result.roleId.toString(),
        role: result.role.name,
        userPicture: result.profilePictureUrl,
        token: token
      },
    });
  } catch (error) {
    next(error)
  }
}

exports.updateUser = async (req, res, next) => {
  try {
    // 1. Get the ID of the user to update from the URL parameters
    const {id} = req.params;
    const {role} = req.user
    const userId = parseInt(id, 10);

    if (role !== "admin") {
      const err = new Error('Hanya admin yang boleh menghapus user.');
      err.status = 404;
      throw err;
    }

    // Validate the user ID
    if (isNaN(userId)) {
      const err = new Error('User ID harus nomor yang valid');
      err.status = 400; // Bad Request
      throw err;
    }

    // 2. Get the new data from the request body
    const { username, email, userRole, password } = req.body;

    // 3. Prepare the data object for the Prisma update
    const updateData = {};

    if (username) {
      updateData.username = username;
    }
    if (email) {
      updateData.email = email;
    }

    // 4. Handle optional password update
    // Only hash and add the password if a new one was provided
    if (password) {
      const strongPass = validator.isStrongPassword(password)
      if (!strongPass) {
        const err = new Error("Password harus minimal 8 karakter (termasuk huruf besar, huruf kecil, angka, dan simbol")
          err.status = 400;
          throw err;
      }

      // It's recommended to add password strength validation here
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // 5. Handle role update by finding the role's ID
    if (userRole) {
      const roleRecord = await prisma.role.findUnique({
        where: { name: userRole.toLowerCase() },
      });

      if (!roleRecord) {
        const err = new Error(`Role '${userRole}' tidak ditemukan.`);
        err.status = 400;
        throw err;
      }
      // Add the foreign key 'roleId' to the update data
      updateData.roleId = roleRecord.id;
    }

    // Ensure there is at least one field to update
    if (Object.keys(updateData).length === 0) {
        const err = new Error('Tidak ada data yang di update');
        err.status = 400;
        throw err;
    }

    // 6. Perform the update in the database
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
    });

    // 7. Send a simple success response
    return res.status(200).json({
      message: "Edit user sukses",
      data: {
          id: updatedUser.id.toString(),
          username: updatedUser.username
      }
    });

  } catch (error) {
    // Pass any errors to the error handling middleware
    next(error);
  }
}

exports.deleteUser = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { id: userIdString } = req.params;

    // Authorization check
    if (role !== "admin") {
      const err = new Error('Hanya admin yang boleh menghapus user.');
      err.status = 403; // 403 Forbidden is more appropriate for role issues
      throw err;
    }

    // FIX 1: Convert the ID from string to a number
    const userId = parseInt(userIdString, 10);
    if (isNaN(userId)) {
      const err = new Error('User ID tidak valid.');
      err.status = 400;
      throw err;
    }

    // FIX 3: Query the database only ONCE
    const userToDelete = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        profilePictureUrl: true, // Only get the field we need for the blob deletion
      },
    });

    // Check if the user was found
    if (!userToDelete) {
      const err = new Error('User tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    // FIX 2: Correctly check IF a picture exists, THEN delete it
    if (userToDelete.profilePictureUrl) {
      await del(userToDelete.profilePictureUrl);
    }

    // Now, delete the user from the database
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return res.status(200).json({
      message: "User berhasil dihapus",
      data: null,
    });

  } catch (error) {
    next(error);
  }
};

// This controller updates the user who is currently logged in
exports.updateProfile = async (req, res, next) => {
  try {
    // 1. Get the ID of the logged-in user from the token (provided by the 'verify' middleware)
    const { id: userId } = req.user;

    // 2. Get the new data from the JSON request body
    const { username, email, password } = req.body;

    const updateData = {};

    let oldPictureUrl = null;

    if (username) updateData.username = username;
    if (email) updateData.email = email;

    if (password) {
      const strongPass = validator.isStrongPassword(password)
      if (!strongPass) {
        const err = new Error("Password harus minimal 8 karakter (termasuk huruf besar, huruf kecil, angka, dan simbol")
          err.status = 400;
          throw err;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // 1. Handle File Upload
    if (req.file) {

      //Before uploading, find the user and get the old picture URL
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePictureUrl: true },
      });
      oldPictureUrl = user?.profilePictureUrl;

      const file = req.file;
      // The 'put' function uploads the file from the buffer
      const blob = await put(file.originalname, file.buffer, {
        access: 'public',
      });
      // Add the returned public URL to our update data
      updateData.profilePictureUrl = blob.url;
    }

    if (Object.keys(updateData).length === 0) {
        const err = new Error('Tidak ada data yang berubah');
        err.status = 400;
        throw err;
    }

    // 3. Perform the update in the database
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    if (oldPictureUrl) {
      await del(oldPictureUrl);
    }

    return res.status(200).json({
      message: "Profile sukses diupdate",
      userPictureUrl: updateData.profilePictureUrl
    });

  } catch (error) {
    next(error);
  }
};

exports.deleteProfilePic = async (req, res, next) => {
  try {
    // 1. Get the ID of the logged-in user
    const { id: userId } = req.user;

    // 2. Find the user in the database to get the current profile picture URL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePictureUrl: true }, // Only fetch the URL we need
    });

    // Handle case where user or picture doesn't exist
    if (!user || !user.profilePictureUrl) {
      return res.status(404).json({
        message: "Foto profile tidak ditemukan atau sudah dihapus.",
      });
    }

    // 3. Update the user record in the database, setting the URL to null
    await prisma.user.update({
      where: { id: userId },
      data: {
        profilePictureUrl: null, // This effectively "deletes" the value from the column
      },
    });

    // 4. If the database update is successful, delete the actual file from storage
    await del(user.profilePictureUrl);

    // 5. Send a success response
    return res.status(200).json({
      message: "Foto profile berhasil dihapus", // "Profile picture successfully deleted"
      userPictureUrl: null
    });

  } catch (error) {
    next(error);
  }
};