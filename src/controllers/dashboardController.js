const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
const { endOfDay } = require('date-fns');

/**
 * Fetches main statistics for the dashboard cards.
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        // 1. Get Total Orders
        const totalOrders = await prisma.order.count();

        // 2. Get Total Omzet (Revenue)
        const totalOmzetResult = await prisma.order.aggregate({
            _sum: {
                total: true,
            },
        });
        const totalOmzet = totalOmzetResult._sum.total || 0;

        // 3. Get Total Items Sold by Category
        const categorySales = await prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: {
                quantity: true,
            },
        });

        const productDetails = await prisma.product.findMany({
            where: {
                id: { in: categorySales.map(s => s.productId) }
            },
            select: {
                id: true,
                category: true,
            }
        });

        const productCategoryMap = new Map(productDetails.map(p => [p.id, p.category]));

        const totalSalesByCategory = {
            Foods: 0,
            Beverages: 0,
            Dessert: 0,
        };

        for (const sale of categorySales) {
            const category = productCategoryMap.get(sale.productId);
            if (category && totalSalesByCategory.hasOwnProperty(category)) {
                totalSalesByCategory[category] += sale._sum.quantity;
            }
        }

        res.status(200).json({
            message: "Successfully retrieved dashboard stats.",
            data: {
                totalOrders,
                totalOmzet: parseFloat(totalOmzet),
                totalItemsSold: totalSalesByCategory.Foods + totalSalesByCategory.Beverages + totalSalesByCategory.Dessert,
                totalFoodSales: totalSalesByCategory.Foods,
                totalBeverageSales: totalSalesByCategory.Beverages,
                totalDessertSales: totalSalesByCategory.Dessert,
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Fetches daily revenue (omzet) for the bar chart within a date range.
 */
exports.getDailyOmzet = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start date and end date are required." });
        }

        const effectiveEndDate = endOfDay(new Date(endDate));

        const dailyData = await prisma.$queryRaw`
            SELECT
                TO_CHAR(o."orderDate"::DATE, 'YYYY-MM-DD') as date,
                p.category,
                SUM(oi.quantity * oi.price)::float as total
            FROM "OrderItem" oi
            JOIN "Order" o ON oi."orderId" = o.id
            JOIN "Product" p ON oi."productId" = p.id
            WHERE o."orderDate" >= ${new Date(startDate)} AND o."orderDate" <= ${effectiveEndDate}
            GROUP BY date, p.category
            ORDER BY date ASC;
        `;

        const formattedData = {};
        dailyData.forEach(row => {
            if (!formattedData[row.date]) {
                formattedData[row.date] = { date: row.date, food: 0, beverage: 0, dessert: 0 };
            }
            if (row.category === 'Foods') formattedData[row.date].food = row.total;
            if (row.category === 'Beverages') formattedData[row.date].beverage = row.total;
            if (row.category === 'Dessert') formattedData[row.date].dessert = row.total;
        });

        res.status(200).json({
            message: "Successfully retrieved daily omzet.",
            data: Object.values(formattedData)
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Fetches the top-selling products by category for the detail modals.
 */
exports.getTopSellingProducts = async (req, res, next) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ message: "Category is required." });
        }

        const topProducts = await prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                product: {
                    category: category,
                },
            },
            _sum: {
                quantity: true,
            },
            orderBy: {
                _sum: {
                    quantity: 'desc',
                },
            },
            take: 10,
        });

        const productIds = topProducts.map(p => p.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
            },
            select: {
                id: true,
                name: true,
            },
        });
        const productNameMap = new Map(products.map(p => [p.id, p.name]));

        const formattedData = topProducts.map(p => ({
            name: productNameMap.get(p.productId),
            sales: p._sum.quantity,
        }));

        res.status(200).json({
            message: `Successfully retrieved top selling ${category}.`,
            data: formattedData,
        });

    } catch (error) {
        next(error);
    }
};
