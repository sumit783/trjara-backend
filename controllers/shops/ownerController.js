const User = require("../../models/users/User");
const Shop = require("../../models/shops/Store");
const Category = require("../../models/shops/Category");
const StoreDocument = require("../../models/shops/StoreDocument");
const Inventory = require("../../models/shops/Inventory");
const Order = require("../../models/orders/Order");
const BankAccount = require("../../models/finance/BankAccount");
const Wallet = require("../../models/finance/Wallet");
const WithdrawalRequest = require("../../models/finance/withdrawal");
const Transaction = require("../../models/finance/Transaction");
const mongoose = require("mongoose");

/**
 * Get store owner profile (user details + owned shops)
 * @route GET /api/owner/profile
 * @access Private (Owner)
 */
exports.getOwnerProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch user details
        const user = await User.findById(userId).select("-otp -otpExpiry -otpAttempts");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Fetch owned shops
        const shops = await Shop.find({ owner: userId });

        res.status(200).json({
            success: true,
            data: {
                user,
                shops
            }
        });
    } catch (error) {
        console.error("Error fetching owner profile:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

/**
 * Get all root categories (categories without a parent)
 * @route GET /api/owner/categories/root
 * @access Private (Owner)
 */
exports.getRootCategories = async (req, res) => {
    try {
        const rootCategories = await Category.find({ parent: null, isActive: true })
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: "Root categories fetched successfully",
            count: rootCategories.length,
            data: rootCategories
        });
    } catch (error) {
        console.error("Error fetching root categories:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

/**
 * Get current user details
 * @route GET /api/owner/user-details
 * @access Private (Owner)
 */
exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-otp -otpExpiry -otpAttempts");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get current owner's store details
 * @route GET /api/owner/store-details
 * @access Private (Owner)
 */
exports.getStoreDetails = async (req, res) => {
    try {
        const shops = await Shop.find({ owner: req.user._id }).populate("category", "name slug");
        res.status(200).json({ success: true, count: shops.length, data: shops });
    } catch (error) {
        console.error("Error fetching store details:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get current owner's uploaded documents
 * @route GET /api/owner/uploaded-documents
 * @access Private (Owner)
 */
exports.getUploadedDocuments = async (req, res) => {
    try {
        // Find shops owned by the user
        const shopIds = await Shop.find({ owner: req.user._id }).distinct("_id");
        
        // Find documents for those shops
        const documents = await StoreDocument.find({ store: { $in: shopIds } }).populate("store", "name");
        
        res.status(200).json({ success: true, count: documents.length, data: documents });
    } catch (error) {
        console.error("Error fetching uploaded documents:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get combined verification data (user + stores + documents)
 * @route GET /api/owner/verification-data
 * @access Private (Owner)
 */
exports.getVerificationData = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch user, shops, and documents concurrently
        const [user, shops] = await Promise.all([
            User.findById(userId).select("-otp -otpExpiry -otpAttempts"),
            Shop.find({ owner: userId }).populate("category", "name slug")
        ]);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const shopIds = shops.map(shop => shop._id);
        const documents = await StoreDocument.find({ store: { $in: shopIds } }).populate("store", "name");

        res.status(200).json({
            success: true,
            data: {
                user,
                shops,
                documents
            }
        });
    } catch (error) {
        console.error("Error fetching verification data:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Check overall verification status (User Identity -> Documents -> Store Details)
 * @route GET /api/owner/status-check
 * @access Private (Owner)
 */
exports.checkVerificationStatus = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Check User Identity Verification
        const user = await User.findById(userId).select("isAdminVerified adminNote");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isAdminVerified !== "verified") {
            return res.status(200).json({
                success: true,
                currentStep: "user_identity",
                status: user.isAdminVerified,
                adminNote: user.adminNote,
                isVerified: false
            });
        }

        // 2. Check Store Documents
        const store = await Shop.findOne({ owner: userId });
        if (!store) {
            return res.status(200).json({
                success: true,
                currentStep: "store_details",
                status: "not_created",
                isVerified: false
            });
        }

        const documents = await StoreDocument.find({ store: store._id });
        const uploadedDocs = documents.map(doc => doc.documentType);
        
        // Check if either GST or Shop License is uploaded
        const hasRequiredDoc = uploadedDocs.includes("gst") || uploadedDocs.includes("shop_license");
        
        const missingDocs = hasRequiredDoc ? [] : ["gst", "shop_license"];
        const unverifiedDocs = documents.filter(doc => doc.verificationStatus !== "verified");

        if (!hasRequiredDoc || unverifiedDocs.length > 0) {
            return res.status(200).json({
                success: true,
                currentStep: "documents",
                status: unverifiedDocs.length > 0 ? "document_pending_or_rejected" : "upload_pending",
                missingDocuments: missingDocs,
                unverifiedDocuments: unverifiedDocs.map(doc => ({ type: doc.documentType, status: doc.verificationStatus, reason: doc.reason })),
                isVerified: false
            });
        }

        // 3. Check Store Details Verification
        if (store.adminVerificationStatus !== "verified") {
            return res.status(200).json({
                success: true,
                currentStep: "store_details",
                status: store.adminVerificationStatus,
                adminNote: store.adminVerificationReason,
                isVerified: false
            });
        }

        // All checks passed
        res.status(200).json({
            success: true,
            currentStep: "completed",
            status: "verified",
            isVerified: true,
            storeId: store._id
        });

    } catch (error) {
        console.error("Error checking verification status:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get list of categories where store products are present
 * @route GET /api/shops/:shopId/categories
 * @access Private (Owner/Staff)
 */
exports.getStoreProductCategories = async (req, res) => {
    try {
        const { shopId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(shopId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid shop ID"
            });
        }

        const categories = await Inventory.aggregate([
            {
                $match: {
                    store: new mongoose.Types.ObjectId(shopId)
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $group: {
                    _id: "$productDetails.category"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            {
                $unwind: "$categoryDetails"
            },
            {
                $project: {
                    _id: 1,
                    name: "$categoryDetails.name",
                    slug: "$categoryDetails.slug",
                    image: "$categoryDetails.image"
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Store product categories fetched successfully",
            count: categories.length,
            data: categories
        });

    } catch (error) {
        console.error("Error fetching store product categories:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

/**
 * Get all orders placed at shops owned by the authenticated owner
 * @route GET /api/owner/orders
 * @access Private (Owner)
 */
exports.getOwnerOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const status = req.query.status || "";

        // 1. Fetch shops owned by this owner
        const shops = await Shop.find({ owner: userId }).select("_id name");
        if (shops.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No shops found for this owner",
                pagination: {
                    totalOrders: 0,
                    totalPages: 0,
                    currentPage: page,
                    limit
                },
                count: 0,
                orders: []
            });
        }

        const shopIds = shops.map(shop => shop._id);

        // Build query
        const query = { shopIds: { $in: shopIds } };

        // Handle Filter by Status
        if (status) {
            query.status = status;
        }

        // Handle Search
        if (search) {
            // Find users matching search term
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const userIds = matchingUsers.map(u => u._id);

            query.$or = [
                { orderNumber: { $regex: search, $options: "i" } },
                { customerId: { $in: userIds } }
            ];
        }

        // 2. Count total orders matching the query
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        // 3. Fetch orders for these shops with skip, limit, and sorting
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("shopIds", "name logo")
            .populate("items.shopId", "name logo")
            .populate({
                path: "items.productId",
                select: "shop"
            })
            .populate({
                path: "items.inventoryId",
                select: "store"
            })
            .populate("addressId")
            .populate("customerId", "name phone email");

        // 4. Map orders to match requested fields (order id, product, quantity, amount, status)
        const formattedOrders = orders.map(order => {
            const ownerShopIdsStr = shopIds.map(id => id.toString());
            
            // Filter shops to only include those belonging to the owner
            const ownerShops = order.shopIds.filter(s => s && s._id && ownerShopIdsStr.includes(s._id.toString()));
            const firstShop = ownerShops[0] || null;

            // Filter items to only include products from the owner's shops
            const ownerItems = order.items.filter(item => {
                let itemShopId = item.shopId && item.shopId._id ? item.shopId._id.toString() : (item.shopId ? item.shopId.toString() : null);
                
                if (!itemShopId && item.productId) {
                    itemShopId = item.productId.shop && item.productId.shop._id ? item.productId.shop._id.toString() : (item.productId.shop ? item.productId.shop.toString() : null);
                }
                
                if (!itemShopId && item.inventoryId) {
                    itemShopId = item.inventoryId.store && item.inventoryId.store._id ? item.inventoryId.store._id.toString() : (item.inventoryId.store ? item.inventoryId.store.toString() : null);
                }
                
                return itemShopId && ownerShopIdsStr.includes(itemShopId);
            });

            // Map ownerItems to response format
            const mappedItems = ownerItems.map(item => {
                const mappedShopId = item.shopId && item.shopId._id ? item.shopId._id : (
                    item.shopId || (
                        item.productId && item.productId.shop ? (item.productId.shop._id || item.productId.shop) : (
                            item.inventoryId && item.inventoryId.store ? (item.inventoryId.store._id || item.inventoryId.store) : null
                        )
                    )
                );
                return {
                    _id: item._id,
                    productId: item.productId && item.productId._id ? item.productId._id : item.productId,
                    shopId: mappedShopId,
                    name: item.name,
                    image: item.image,
                    variant: item.variant,
                    price: item.price,
                    quantity: item.quantity,
                    total: item.total,
                    status: item.status || "pending",
                    statusReason: item.statusReason || ""
                };
            });

            // Sum up the total for items belonging to this owner's store(s)
            const storeItemsTotal = mappedItems.reduce((sum, item) => sum + (item.total || 0), 0);

            return {
                orderId: order._id,
                orderNumber: order.orderNumber,
                customer: order.customerId ? {
                    name: order.customerId.name,
                    phone: order.customerId.phone,
                    email: order.customerId.email
                } : null,
                shop: firstShop ? {
                    id: firstShop._id,
                    name: firstShop.name
                } : null,
                shops: ownerShops.map(s => ({
                    id: s?._id,
                    name: s?.name,
                    logo: s?.logo
                })),
                items: mappedItems,
                amount: storeItemsTotal,
                status: order.status,
                placedAt: order.placedAt || order.createdAt
            };
        });

        res.status(200).json({
            success: true,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: page,
                limit
            },
            count: formattedOrders.length,
            orders: formattedOrders
        });

    } catch (error) {
        console.error("Error in getOwnerOrders:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching owner orders",
            error: error.message
        });
    }
};

/**
 * Update the packing status of a single order item (packed or failed)
 * @route PUT /api/owner/orders/:orderId/items/:itemId/status
 * @access Private (Owner)
 */
exports.updateOrderItemStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId, itemId } = req.params;
        const { status, reason } = req.body || {};

        // 1. Validate status
        if (!status || !["packed", "failed"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status is required and must be either 'packed' or 'failed'"
            });
        }

        // 2. Validate reason if status is failed
        if (status === "failed" && (!reason || !reason.trim())) {
            return res.status(400).json({
                success: false,
                message: "Reason is required when status is 'failed'"
            });
        }

        // Validate Object IDs
        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid orderId or itemId format"
            });
        }

        // 3. Fetch shops owned by this owner
        const shops = await Shop.find({ owner: userId }).select("_id");
        if (shops.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not own any shops."
            });
        }

        const ownerShopIdsStr = shops.map(shop => shop._id.toString());

        // 4. Fetch the order and populate product/inventory details to resolve shop fallback
        const order = await Order.findById(orderId)
            .populate({
                path: "items.productId",
                select: "shop"
            })
            .populate({
                path: "items.inventoryId",
                select: "store"
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // 5. Ensure the order is not in a final state where packing shouldn't change
        if (["order_cancelled", "order_delivered"].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot update item status for an order that is ${order.status.replace("order_", "")}`
            });
        }

        // 6. Find the subdocument item
        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found in this order"
            });
        }

        // 7. Verify that the item belongs to one of the owner's shops
        let itemShopIdStr = item.shopId && item.shopId._id ? item.shopId._id.toString() : (item.shopId ? item.shopId.toString() : null);
        
        if (!itemShopIdStr && item.productId) {
            itemShopIdStr = item.productId.shop && item.productId.shop._id ? item.productId.shop._id.toString() : (item.productId.shop ? item.productId.shop.toString() : null);
        }
        
        if (!itemShopIdStr && item.inventoryId) {
            itemShopIdStr = item.inventoryId.store && item.inventoryId.store._id ? item.inventoryId.store._id.toString() : (item.inventoryId.store ? item.inventoryId.store.toString() : null);
        }

        if (!itemShopIdStr || !ownerShopIdsStr.includes(itemShopIdStr)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to update status of items in this store"
            });
        }

        // 8. Update status and reason
        item.status = status;
        item.statusReason = status === "failed" ? reason.trim() : "";

        // Check if all order items are packed
        const allItemsPacked = order.items.every(orderItem => orderItem.status === "packed");
        if (allItemsPacked && ["order_placed", "order_packing"].includes(order.status)) {
            order.status = "order_ready_for_pickup";
        }

        // 9. Save updated order
        await order.save();

        res.status(200).json({
            success: true,
            message: `Item status updated to ${status} successfully`,
            data: {
                itemId: item._id,
                productId: item.productId && item.productId._id ? item.productId._id : item.productId,
                name: item.name,
                status: item.status,
                statusReason: item.statusReason,
                orderStatus: order.status
            }
        });

    } catch (error) {
        console.error("Error updating order item status:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating order item status",
            error: error.message
        });
    }
};

/**
 * Get details of a single order by ID for the authenticated owner
 * @route GET /api/owner/orders/:orderId
 * @access Private (Owner)
 */
exports.getOwnerOrderDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID format" });
        }

        // 1. Fetch shops owned by this owner
        const shops = await Shop.find({ owner: userId }).select("_id name");
        if (shops.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not own any shops."
            });
        }

        const shopIds = shops.map(shop => shop._id);
        const ownerShopIdsStr = shopIds.map(id => id.toString());

        // 2. Fetch the order
        const order = await Order.findById(orderId)
            .populate("shopIds", "name logo phone banner address city state pincode location")
            .populate("items.shopId", "name logo phone banner address city state pincode location")
            .populate("addressId")
            .populate("riderId", "name phone profileImageUrl")
            .populate({
                path: "items.productId",
                select: "shop"
            })
            .populate({
                path: "items.inventoryId",
                select: "-variantOptions -productVariant",
                populate: {
                    path: "variant"
                }
            })
            .populate("customerId", "name phone email");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // 3. Filter items to display only those belonging to the owner's shops
        const ownerItems = order.items.filter(item => {
            let itemShopId = item.shopId && item.shopId._id ? item.shopId._id.toString() : (item.shopId ? item.shopId.toString() : null);
            
            if (!itemShopId && item.productId) {
                itemShopId = item.productId.shop && item.productId.shop._id ? item.productId.shop._id.toString() : (item.productId.shop ? item.productId.shop.toString() : null);
            }
            
            if (!itemShopId && item.inventoryId) {
                itemShopId = item.inventoryId.store && item.inventoryId.store._id ? item.inventoryId.store._id.toString() : (item.inventoryId.store ? item.inventoryId.store.toString() : null);
            }
            
            return itemShopId && ownerShopIdsStr.includes(itemShopId);
        });

        // If no items belong to this owner's stores, return 403 Forbidden
        if (ownerItems.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to view this order"
            });
        }

        const ownerShops = order.shopIds.filter(s => s && s._id && ownerShopIdsStr.includes(s._id.toString()));
        const firstShop = ownerShops[0] || null;

        const mappedItems = ownerItems.map(item => {
            const mappedShopId = item.shopId && item.shopId._id ? item.shopId._id : (
                item.shopId || (
                    item.productId && item.productId.shop ? (item.productId.shop._id || item.productId.shop) : (
                        item.inventoryId && item.inventoryId.store ? (item.inventoryId.store._id || item.inventoryId.store) : null
                    )
                )
            );
            return {
                _id: item._id,
                productId: item.productId && item.productId._id ? item.productId._id : item.productId,
                shopId: mappedShopId,
                name: item.name,
                image: item.image,
                variant: item.variant,
                price: item.price,
                quantity: item.quantity,
                total: item.total,
                status: item.status || "pending",
                statusReason: item.statusReason || ""
            };
        });

        const storeItemsTotal = mappedItems.reduce((sum, item) => sum + (item.total || 0), 0);

        const formattedOrder = {
            orderId: order._id,
            orderNumber: order.orderNumber,
            customer: order.customerId ? {
                name: order.customerId.name,
                phone: order.customerId.phone,
                email: order.customerId.email
            } : null,
            shop: firstShop ? {
                id: firstShop._id,
                name: firstShop.name,
                logo: firstShop.logo,
                phone: firstShop.phone,
                banner: firstShop.banner,
                address: firstShop.address,
                city: firstShop.city,
                state: firstShop.state,
                pincode: firstShop.pincode
            } : null,
            shops: ownerShops.map(s => ({
                id: s?._id,
                name: s?.name,
                logo: s?.logo
            })),
            items: mappedItems,
            amount: storeItemsTotal,
            status: order.status,
            placedAt: order.placedAt || order.createdAt,
            address: order.addressId,
            rider: order.riderId ? {
                name: order.riderId.name,
                phone: order.riderId.phone,
                profileImageUrl: order.riderId.profileImageUrl
            } : null,
            deliveryTime: order.deliveryTime,
            payment: {
                method: order.payment?.method,
                status: order.payment?.status
            }
        };

        res.status(200).json({
            success: true,
            order: formattedOrder
        });

    } catch (error) {
        console.error("Error in getOwnerOrderDetails:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching order details",
            error: error.message
        });
    }
};

/**
 * Add a new bank account or UPI ID for the owner
 * @route POST /api/owner/bank-accounts
 * @access Private (Owner)
 */
exports.addBankAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { accountHolderName, bankName, accountNumber, ifscCode, upiId, isDefault } = req.body;

        // Validation: Either Bank details or UPI ID must be provided
        const hasBankDetails = accountHolderName && bankName && accountNumber && ifscCode;
        const hasUpiDetails = upiId && upiId.trim() !== "";

        if (!hasBankDetails && !hasUpiDetails) {
            return res.status(400).json({
                success: false,
                message: "Please provide either complete bank account details (holder name, bank name, account number, IFSC code) OR a UPI ID."
            });
        }

        // Check if user has any existing active bank accounts
        const existingAccountsCount = await BankAccount.countDocuments({ userId, isActive: true });
        
        // If it's the first active account, it must be the default/primary one
        let defaultFlag = isDefault || existingAccountsCount === 0;

        // If this new account is marked as default, unset other defaults on active accounts
        if (defaultFlag) {
            await BankAccount.updateMany({ userId, isActive: true }, { isDefault: false });
        }

        const newAccount = new BankAccount({
            userId,
            accountHolderName: hasBankDetails ? accountHolderName : undefined,
            bankName: hasBankDetails ? bankName : undefined,
            accountNumber: hasBankDetails ? accountNumber : undefined,
            ifscCode: hasBankDetails ? ifscCode : undefined,
            upiId: hasUpiDetails ? upiId : undefined,
            isDefault: defaultFlag,
            isActive: true
        });

        await newAccount.save();

        res.status(201).json({
            success: true,
            message: "Bank account / UPI ID added successfully",
            data: newAccount
        });
    } catch (error) {
        console.error("Error in addBankAccount:", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding bank account",
            error: error.message
        });
    }
};

/**
 * Get all active bank accounts / UPI IDs for the owner
 * @route GET /api/owner/bank-accounts
 * @access Private (Owner)
 */
exports.getBankAccounts = async (req, res) => {
    try {
        const userId = req.user._id;

        // Retrieve active accounts sorted with primary/default first, then newest first
        const accounts = await BankAccount.find({ userId, isActive: true })
            .sort({ isDefault: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: accounts.length,
            data: accounts
        });
    } catch (error) {
        console.error("Error in getBankAccounts:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching bank accounts",
            error: error.message
        });
    }
};

/**
 * Set a specific active bank account / UPI ID as primary (default)
 * @route PUT /api/owner/bank-accounts/:id/primary
 * @access Private (Owner)
 */
exports.setPrimaryBankAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bank account ID format"
            });
        }

        // Check if active account exists and belongs to user
        const account = await BankAccount.findOne({ _id: id, userId, isActive: true });
        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found or access denied"
            });
        }

        // Unset any current default active account
        await BankAccount.updateMany({ userId, isActive: true }, { isDefault: false });

        // Set this account as default
        account.isDefault = true;
        await account.save();

        res.status(200).json({
            success: true,
            message: "Primary bank account updated successfully",
            data: account
        });
    } catch (error) {
        console.error("Error in setPrimaryBankAccount:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating primary bank account",
            error: error.message
        });
    }
};

/**
 * Deactivate a bank account / UPI ID (logical delete)
 * @route DELETE /api/owner/bank-accounts/:id
 * @access Private (Owner)
 */
exports.deleteBankAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bank account ID format"
            });
        }

        // Find only active account
        const account = await BankAccount.findOne({ _id: id, userId, isActive: true });
        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found or access denied"
            });
        }

        const wasDefault = account.isDefault;

        // Mark the account as inactive and remove default status
        account.isActive = false;
        account.isDefault = false;
        await account.save();

        // If the deactivated account was the primary one, promote another active account to primary
        if (wasDefault) {
            const nextAccount = await BankAccount.findOne({ userId, isActive: true }).sort({ createdAt: -1 });
            if (nextAccount) {
                nextAccount.isDefault = true;
                await nextAccount.save();
            }
        }

        res.status(200).json({
            success: true,
            message: "Bank account / UPI ID deactivated successfully"
        });
    } catch (error) {
        console.error("Error in deleteBankAccount:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deactivating bank account",
            error: error.message
        });
    }
};

/**
 * Create a new withdrawal request for the owner using their primary/default bank details
 * @route POST /api/owner/withdrawals
 * @access Private (Owner)
 */
exports.createWithdrawalRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount } = req.body;

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid withdrawal amount greater than zero."
            });
        }

        // 1. Find the primary and active bank account
        const defaultBankAccount = await BankAccount.findOne({ userId, isDefault: true, isActive: true });
        if (!defaultBankAccount) {
            return res.status(400).json({
                success: false,
                message: "No primary/default bank account or UPI ID found. Please set a primary bank account/UPI ID before making a withdrawal request."
            });
        }

        // 2. Atomically check and deduct balance from Wallet
        const wallet = await Wallet.findOneAndUpdate(
            { userId, balance: { $gte: amountNum } },
            { $inc: { balance: -amountNum } },
            { new: true }
        );

        if (!wallet) {
            // Check if wallet exists to give a better error message
            const checkWallet = await Wallet.findOne({ userId });
            if (!checkWallet) {
                return res.status(404).json({
                    success: false,
                    message: "Wallet not found for this user."
                });
            }
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Your current wallet balance is Rs. ${checkWallet.balance}.`
            });
        }

        // 3. Create Withdrawal Request
        const withdrawalRequest = new WithdrawalRequest({
            userId,
            walletId: wallet._id,
            bankAccountId: defaultBankAccount._id,
            amount: amountNum,
            status: "pending"
        });
        await withdrawalRequest.save();

        // 4. Create Transaction Log
        const accountLabel = defaultBankAccount.upiId 
            ? `UPI (${defaultBankAccount.upiId})` 
            : `Bank A/c (...${defaultBankAccount.accountNumber.slice(-4)})`;

        const transaction = new Transaction({
            userId,
            walletId: wallet._id,
            amount: amountNum,
            type: "withdrawal",
            status: "pending",
            description: `Withdrawal request of Rs. ${amountNum} initiated to ${accountLabel}`
        });
        await transaction.save();

        res.status(201).json({
            success: true,
            message: "Withdrawal request created successfully",
            data: {
                withdrawalRequest,
                newBalance: wallet.balance
            }
        });
    } catch (error) {
        console.error("Error in createWithdrawalRequest:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating withdrawal request",
            error: error.message
        });
    }
};

/**
 * Get withdrawal requests history for the owner
 * @route GET /api/owner/withdrawals
 * @access Private (Owner)
 */
exports.getOwnerWithdrawalRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const totalRequests = await WithdrawalRequest.countDocuments({ userId });
        const totalPages = Math.ceil(totalRequests / limit);

        const requests = await WithdrawalRequest.find({ userId })
            .populate("bankAccountId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            message: "Withdrawal requests retrieved successfully",
            pagination: {
                currentPage: page,
                totalPages,
                totalRequests,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            data: requests
        });
    } catch (error) {
        console.error("Error in getOwnerWithdrawalRequests:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching withdrawal requests",
            error: error.message
        });
    }
};
