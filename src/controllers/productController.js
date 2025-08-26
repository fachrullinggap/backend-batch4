const env = require('dotenv');
const { PrismaClient } = require('../../generated/prisma');
// const {PrismaClient} = require("@prisma/client")
const bcrypt = require('bcrypt');
const { put, del } = require('@vercel/blob');

const prisma = new PrismaClient();

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      const err = new Error('Product ID harus nomor yang valid');
      err.status = 400; // Bad Request
      throw err;
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      const err = new Error('product not found.');
      err.status = 404; // Not Found
      throw err;
    }

    const formattedProduct = {
      id: product.id.toString(),
      name: product.name,
      price: parseFloat(product.price),
      category: product.category,
      detail: product.detail,
      image: product.image,
    };

    return res.status(200).json({
      message: 'Successfully retrieved user',
      data: formattedProduct,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        id: 'asc', // Optional: order the results by user ID
      },
    });

    // 2. Map the results to flatten the data structure
    // The query above returns role as an object: { role: { name: 'Admin' } }
    // We need to transform it to: { role: 'Admin' }
    const formattedProducts = products.map((product) => ({
      id: product.id.toString(),
      name: product.name,
      price: parseFloat(product.price),
      category: product.category,
      detail: product.detail,
      image: product.image,
    }));

    // 3. Send the formatted data as the response
    return res.status(200).json({
      message: 'Sukses mendapatkan data semua produk',
      data: formattedProducts,
    });
  } catch (error) {
    // Pass any errors to the next middleware
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { role } = req.user;
    productPictureUrl = null;

    if (role !== 'admin') {
      const err = new Error('Hanya admin yang boleh menghapus user.');
      err.status = 404;
      throw err;
    }

    const { name, price, category, detail } = req.body;

    if (!name || !price || !category) {
      const err = new Error('name, price, dan category harus di isi');
      err.status = 400;
      throw err;
    }

    const existProduct = await prisma.product.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existProduct) {
      const err = new Error('Produk sudah terdaftar.');
      err.status = 400;
      throw err;
    }

    if (req.file) {
      const file = req.file;
      const blob = await put(file.originalname, file.buffer, {
        access: 'public',
      });
      productPictureUrl = blob.url;
    }

    const result = await prisma.product.create({
      data: {
        name: name,
        price: parseFloat(price),
        category: category,
        detail: detail,
        image: productPictureUrl,
      },
    });

    return res.status(201).json({
      message: 'User berhasil terdaftar',
      data: {
        ...result,
        id: result.id.toString(), // Convert BigInt to string
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { id: productIdString } = req.params;

    // Authorization check
    if (role !== 'admin') {
      const err = new Error('Hanya admin yang boleh menghapus user.');
      err.status = 403; // 403 Forbidden is more appropriate for role issues
      throw err;
    }

    const productId = parseInt(productIdString, 10);
    if (isNaN(productId)) {
      const err = new Error('User ID tidak valid.');
      err.status = 400;
      throw err;
    }

    const productToDelete = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        image: true, // Only get the field we need for the blob deletion
      },
    });

    if (!productToDelete) {
      const err = new Error('Prodcut tidak ditemukan.');
      err.status = 404;
      throw err;
    }

    if (productToDelete.image) {
      await del(productToDelete.image);
    }

    // Now, delete the user from the database
    await prisma.product.delete({
      where: {
        id: productId,
      },
    });

    return res.status(200).json({
      message: 'Product berhasil dihapus',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    // FIX: Get the ID from the URL parameters (req.params)
    const { id: productIdString } = req.params;
    // FIX: Get the data to be updated from the body
    const { name, price, category, detail, deleteProductPicture } = req.body;

    // FIX: Convert the ID string to a number for Prisma queries
    const productId = parseInt(productIdString, 10);
    if (isNaN(productId)) {
      const err = new Error('Product ID tidak valid.');
      err.status = 400;
      throw err;
    }

    const updateData = {};
    let oldPictureUrl = null;

    // First, find the product to get its old image URL
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { image: true },
    });

    if (!product) {
      const err = new Error('Produk tidak ditemukan.');
      err.status = 404;
      throw err;
    }
    oldPictureUrl = product.image;

    // Handle picture deletion
    if (deleteProductPicture === 'true') {
      updateData.image = null;
    }

    // Handle picture upload (overrides deletion)
    if (req.file) {
      const file = req.file;
      const blob = await put(file.originalname, file.buffer, {
        access: 'public',
      });
      updateData.image = blob.url;
    }

    // Populate updateData with text fields
    if (name) updateData.name = name;
    if (price) updateData.price = parseFloat(price); // Ensure price is a number
    if (category) updateData.category = category;
    if (detail) updateData.detail = detail;

    // Check if there are any actual changes to save
    if (Object.keys(updateData).length === 0) {
      const err = new Error('Tidak ada data yang berubah');
      err.status = 400;
      throw err;
    }

    // Perform the update in the database
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    // Clean up the old file if a new one was uploaded OR if it was deleted
    if (oldPictureUrl && (req.file || deleteProductPicture === 'true')) {
      await del(oldPictureUrl);
    }

    return res.status(200).json({
      message: 'Produk sukses diupdate', // FIX: Corrected message
      data: {
        ...updatedProduct,
        id: updatedProduct.id.toString(), // Convert BigInt to string
      },
    });
  } catch (error) {
    next(error);
  }
};
