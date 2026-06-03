const User = require("../../models/users/User");
const Shop = require("../../models/shops/Store");
const Category = require("../../models/shops/Category");
const StoreDocument = require("../../models/shops/StoreDocument");
const Inventory = require("../../models/shops/Inventory");
const Order = require("../../models/orders/Order");
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

        // 1. Fetch shops owned by this owner
        const shops = await Shop.find({ owner: userId }).select("_id name");
        if (shops.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No shops found for this owner",
                count: 0,
                orders: []
            });
        }

        const shopIds = shops.map(shop => shop._id);

        // 2. Fetch all orders for these shops
        const orders = await Order.find({ shopId: { $in: shopIds } })
            .sort({ createdAt: -1 })
            .populate("shopId", "name logo")
            .populate("addressId");

        // 3. Map orders to match requested fields (order id, product, quantity, amount, status)
        const formattedOrders = orders.map(order => ({
            orderId: order._id,
            orderNumber: order.orderNumber,
            shop: {
                id: order.shopId?._id,
                name: order.shopId?.name
            },
            items: order.items.map(item => ({
                productId: item.productId,
                name: item.name,
                image: item.image,
                variant: item.variant,
                price: item.price,
                quantity: item.quantity,
                total: item.total
            })),
            amount: order.pricing?.total || 0,
            status: order.status,
            placedAt: order.placedAt || order.createdAt
        }));

        res.status(200).json({
            success: true,
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
