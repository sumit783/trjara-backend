const mongoose = require("mongoose");
const Order = require("../../models/orders/Order");
const User = require("../../models/users/User");
const Store = require("../../models/shops/Store");
const Rider = require("../../models/rider/Rider");

/**
 * Helper to group order items by their store and attach it as a `stores` list on the order object.
 * @param {Object} order Mongoose order document
 * @returns {Object} Plain JavaScript object with `stores` grouping
 */
const formatOrderWithStores = (order) => {
    if (!order) return null;
    const orderObj = order.toObject();
    
    const storeMap = {};
    
    const populatedStores = {};
    if (orderObj.shopIds && Array.isArray(orderObj.shopIds)) {
        orderObj.shopIds.forEach(store => {
            if (store && store._id) {
                const storeIdStr = store._id.toString();
                populatedStores[storeIdStr] = store;
                
                storeMap[storeIdStr] = {
                    store: store,
                    items: []
                };
            }
        });
    }
    
    if (orderObj.items && Array.isArray(orderObj.items)) {
        orderObj.items.forEach(item => {
            let storeId = item.shopId && item.shopId._id ? item.shopId._id.toString() : (item.shopId ? item.shopId.toString() : null);
            
            if (!storeId && item.productId) {
                storeId = item.productId.shop && item.productId.shop._id ? item.productId.shop._id.toString() : (item.productId.shop ? item.productId.shop.toString() : null);
            }
            
            if (!storeId && item.inventoryId) {
                storeId = item.inventoryId.store && item.inventoryId.store._id ? item.inventoryId.store._id.toString() : (item.inventoryId.store ? item.inventoryId.store.toString() : null);
            }
            
            if (storeId) {
                const storeInfo = populatedStores[storeId] || item.shopId || (
                    item.productId && item.productId.shop ? item.productId.shop : (
                        item.inventoryId && item.inventoryId.store ? item.inventoryId.store : { _id: storeId }
                    )
                );
                
                if (!storeMap[storeId]) {
                    storeMap[storeId] = {
                        store: storeInfo,
                        items: []
                    };
                }
                
                const itemObj = { ...item };
                itemObj.shopId = storeId;
                
                storeMap[storeId].items.push(itemObj);
            }
        });
    }
    
    orderObj.stores = Object.values(storeMap);
    
    // Remove raw lists to only send grouped stores representation
    delete orderObj.shopIds;
    delete orderObj.items;
    delete orderObj.shopId;
    
    return orderObj;
};

/**
 * Format order details for admin response
 * @param {Object} order Mongoose order document
 * @returns {Object} Formatted order object
 */
const formatOrderForAdmin = (order) => {
    const formatted = formatOrderWithStores(order);
    if (!formatted) return null;
    
    // Flatten rider details for simpler frontend rendering
    if (formatted.riderId) {
        const rider = formatted.riderId;
        formatted.rider = {
            _id: rider._id,
            isOnline: rider.isOnline,
            isAvailable: rider.isAvailable,
            rating: rider.rating,
            totalDeliveries: rider.totalDeliveries,
            verificationStatus: rider.verificationStatus,
            name: rider.user ? rider.user.name : null,
            phone: rider.user ? rider.user.phone : null,
            profileImageUrl: rider.user ? rider.user.profileImageUrl : null,
            email: rider.user ? rider.user.email : null,
            vehicleType: rider.vehicleType
        };
    } else {
        formatted.rider = null;
    }
    
    return formatted;
};

/**
 * Get all orders with search, status filtering and pagination
 * @route GET /api/admin/orders
 * @access Private (Admin only)
 */
exports.getAllOrdersAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const { search, status } = req.query;

        // Build filter object
        const filter = {};

        // Filter by status if provided and not 'all'
        if (status && status !== "all") {
            filter.status = status;
        }

        // Search logic
        if (search) {
            // Find users matching search term (name, email, phone, customId)
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                    { customId: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const userIds = matchingUsers.map(u => u._id);

            // Find stores matching search term (name, email, phone, customId)
            const matchingStores = await Store.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                    { customId: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const storeIds = matchingStores.map(s => s._id);

            // Find riders matching search term (via user fields)
            const matchingRiderUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const riderUserIds = matchingRiderUsers.map(u => u._id);

            const matchingRiders = await Rider.find({ user: { $in: riderUserIds } }).select("_id");
            const riderIds = matchingRiders.map(r => r._id);

            const orConditions = [
                { orderNumber: { $regex: search, $options: "i" } },
                { customerId: { $in: userIds } },
                { shopIds: { $in: storeIds } },
                { riderId: { $in: riderIds } }
            ];

            // If the search query is a valid MongoDB ObjectId, add it to search
            if (mongoose.Types.ObjectId.isValid(search)) {
                orConditions.push({ _id: search });
            }

            filter.$or = orConditions;
        }

        // Get total count
        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);

        // Fetch orders with pagination and simplified population for table display
        const orders = await Order.find(filter)
            .populate("customerId", "name email phone customId")
            .populate({
                path: "riderId",
                populate: {
                    path: "user",
                    select: "name phone"
                }
            })
            .populate("shopIds", "name logo customId")
            .select("orderNumber customerId riderId shopIds pricing payment status createdAt")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const formattedOrders = orders.map(order => {
            const rider = order.riderId;
            return {
                _id: order._id,
                orderNumber: order.orderNumber,
                customer: order.customerId ? {
                    _id: order.customerId._id,
                    name: order.customerId.name,
                    phone: order.customerId.phone,
                    email: order.customerId.email,
                    customId: order.customerId.customId
                } : null,
                rider: rider ? {
                    _id: rider._id,
                    name: rider.user ? rider.user.name : null,
                    phone: rider.user ? rider.user.phone : null
                } : null,
                stores: order.shopIds ? order.shopIds.map(store => ({
                    _id: store._id,
                    name: store.name,
                    logo: store.logo,
                    customId: store.customId
                })) : [],
                pricing: {
                    total: order.pricing ? order.pricing.total : 0,
                    subtotal: order.pricing ? order.pricing.subtotal : 0,
                    deliveryFee: order.pricing ? order.pricing.deliveryFee : 0,
                    discount: order.pricing ? order.pricing.discount : 0
                },
                payment: {
                    method: order.payment ? order.payment.method : null,
                    status: order.payment ? order.payment.status : null
                },
                status: order.status,
                createdAt: order.createdAt
            };
        });

        res.status(200).json({
            success: true,
            message: "Orders retrieved successfully",
            data: {
                orders: formattedOrders,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalOrders,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error("Error in getAllOrdersAdmin:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve orders",
            error: error.message
        });
    }
};

/**
 * Get details of a single order by ID
 * @route GET /api/admin/orders/:id
 * @access Private (Admin only)
 */
exports.getAdminOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID format"
            });
        }

        const order = await Order.findById(id)
            .populate("customerId", "name email phone profileImageUrl customId isActive createdAt")
            .populate({
                path: "riderId",
                populate: [
                    { path: "user", select: "name email phone profileImageUrl customId" },
                    { path: "vehicleType", select: "name icon type" }
                ]
            })
            .populate("shopIds", "name logo phone email address city state pincode location customId")
            .populate("items.shopId", "name logo phone email address city state pincode location customId")
            .populate("addressId")
            .populate({
                path: "items.inventoryId",
                select: "-variantOptions -productVariant",
                populate: {
                    path: "variant"
                }
            })
            .populate("items.productId", "-description");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const formattedOrder = formatOrderForAdmin(order);

        res.status(200).json({
            success: true,
            message: "Order details retrieved successfully",
            data: formattedOrder
        });
    } catch (error) {
        console.error("Error in getAdminOrderById:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve order details",
            error: error.message
        });
    }
};
