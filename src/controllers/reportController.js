const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

// The createOrder function remains the same
exports.createOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      userId,
      orderType,
      orderDetails,
      amountReceived,
      items,
    } = req.body;

    if (!customerName || !userId || !orderType || !amountReceived || !items || items.length === 0) {
      const err = new Error('Missing required fields for creating an order.');
      err.status = 400;
      throw err;
    }

    let customer = await prisma.customer.findFirst({
        where: { name: customerName }
    });

    if (!customer) {
        customer = await prisma.customer.create({
            data: { name: customerName }
        });
    }
    const customerId = customer.id;

    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productPriceMap = new Map(products.map(p => [p.id.toString(), p.price]));

    let subTotal = 0;
    const orderItemsData = items.map(item => {
      const price = productPriceMap.get(item.productId.toString());
      if (price === undefined) {
        throw new Error(`Product with ID ${item.productId} not found or has no price.`);
      }
      subTotal += parseFloat(price) * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: price,
      };
    });

    const tax = subTotal * 0.11;
    const total = subTotal + tax;
    const change = amountReceived - total;

    if (change < 0) {
        const err = new Error('Amount received is less than the total amount.');
        err.status = 400;
        throw err;
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        userId,
        orderType,
        orderDetails,
        subTotal,
        tax,
        total,
        amountReceived,
        amountChange: change,
        orderItems: {
          create: orderItemsData,
        },
      },
    });

    return res.status(201).json({
      message: 'Order created successfully.',
    });

  } catch (error) {
    next(error);
  }
};


/**
 * Retrieves a single order by its unique ID.
 * --- THIS FUNCTION HAS BEEN UPDATED ---
 */
exports.getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id: id },
            include: {
                customer: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                    }
                },
                orderItems: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!order) {
            const err = new Error('Order not found.');
            err.status = 404;
            throw err;
        }

        const formattedOrder = {
            id: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            orderType: order.orderType,
            orderDetails: order.orderDetails,
            status: order.status,
            subTotal: parseFloat(order.subTotal),
            tax: parseFloat(order.tax),
            total: parseFloat(order.total),
            amountReceived: parseFloat(order.amountReceived),
            amountChange: parseFloat(order.amountChange),
            customerId: order.customerId.toString(),
            userId: order.userId.toString(),
            customer: {
                id: order.customer.id.toString(),
                name: order.customer.name,
                phone: order.customer.phone,
                email: order.customer.email,
            },
            user: {
                id: order.user.id.toString(),
                username: order.user.username,
            },
            orderItems: order.orderItems.map(item => ({
                id: item.id.toString(),
                quantity: item.quantity,
                price: parseFloat(item.price),
                orderId: item.orderId,
                productId: item.productId.toString(),
                product: {
                    id: item.product.id.toString(),
                    name: item.product.name,
                    detail: item.product.detail,
                    price: parseFloat(item.product.price),
                    image: item.product.image,
                    category: item.product.category,
                }
            }))
        };

        return res.status(200).json({
            message: 'Successfully retrieved order report',
            data: formattedOrder,
        });

    } catch (error) {
        next(error);
    }
};

// The getAllOrders function remains the same
exports.getAllOrders = async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                customer: {
                    select: { name: true }
                },
                user: {
                    select: { username: true }
                }
            },
            orderBy: {
                orderDate: 'desc'
            }
        });

        const formattedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            customerName: order.customer.name,
            processedBy: order.user.username,
            total: parseFloat(order.total),
            status: order.status
        }));

        return res.status(200).json({
            message: 'Successfully retrieved all order reports',
            data: formattedOrders,
        });

    } catch (error) {
        next(error);
    }
};
