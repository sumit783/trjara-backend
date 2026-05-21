const User = require("../../models/users/User");
const AnalyticsEvent = require("../../models/logs/AnalyticsEvent");
const config = require("../../config/serverConfig");
const Store = require("../../models/shops/Store");
const Inventory = require("../../models/shops/Inventory");
const Category = require("../../models/shops/Category");
const Product = require("../../models/shops/Product");
/**
 * Get current user profile
 * @route GET /api/customer/profile
 * @access Private
 */
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-otp -otpExpiry -otpAttempts");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Update current user profile
 * @route PUT /api/customer/profile
 * @access Private
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, email } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();

        if (req.file) {
            updateData.profileImageUrl = req.file.path;
        }


        if(user.role === "owner" && user.isAdminVerified === "rejected"){
            updateData.isAdminVerified = "reuploaded";
        }
        // Check if email is already taken by another user
        if (email) {
            const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Email already in use" });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-otp -otpExpiry -otpAttempts");

        await AnalyticsEvent.create({
            event: "profile_updated",
            userId: userId,
            properties: { fieldsUpdated: Object.keys(updateData) },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Send OTP for phone verification
 * @route POST /api/customer/send-otp
 * @access Private
 */
exports.sendPhoneOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });

        // Check if phone is already taken
        const existingUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Phone number already in use" });
        }

        let otp = "1234"; // Default for development
        if (config.env === "production") {
            otp = Math.floor(1000 + Math.random() * 9000).toString();
            // TODO: Integrate SMS provider
        }

        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await User.findByIdAndUpdate(req.user._id, {
            otp,
            otpExpiry
        });

        await AnalyticsEvent.create({
            event: "phone_verification_otp_sent",
            userId: req.user._id,
            properties: { phone },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (error) {
        console.error("Error in sendPhoneOTP:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Verify OTP and update phone
 * @route POST /api/customer/verify-otp
 * @access Private
 */
exports.verifyPhoneOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: "Phone and OTP are required" });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (!user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP expired or not requested" });
        }

        if (user.otp !== String(otp)) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        const updateData = {
            phone,
            otp: null,
            otpExpiry: null,
            verified: true
        };

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true }
        ).select("-otp -otpExpiry -otpAttempts");

        await AnalyticsEvent.create({
            event: "phone_verified",
            userId: req.user._id,
            properties: { phone, previousRole: user.role },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "Phone verified and updated successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error("Error in verifyPhoneOTP:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get top 5 store logos and IDs
 * @route GET /api/customer/top-store-logos
 * @access Private
 */
exports.getTopStoreLogos = async (req, res) => {
    try {
        const stores = await Store.find({ isActive: true, logo: { $exists: true, $ne: "" } })
            .limit(5)
            .select("_id logo");

        res.status(200).json({
            success: true,
            data: stores
        });
    } catch (error) {
        console.error("Error fetching top store logos:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get product sections for home page
 * @route GET /api/customer/home-sections
 * @access Private/Public
 */
exports.getHomeSections = async (req, res) => {
    try {
        const inventories = await Inventory.find({ isAvailable: true, stock: { $gt: 0 } })
            .populate({
                path: 'product',
                populate: { path: 'category', select: 'name' }
            })
            .sort({ _id: 1 })
            .limit(100); // Fetch more to account for duplicates

        const seenProducts = new Set();
        const formattedProducts = [];

        for (const inv of inventories) {
            const productId = inv.product ? inv.product._id.toString() : inv._id.toString();
            if (!seenProducts.has(productId)) {
                seenProducts.add(productId);

                const rating = (Math.random() * (5 - 3.5) + 3.5).toFixed(1); 
                let discount = 0;
                if (inv.mrp && inv.price && inv.mrp > inv.price) {
                    discount = Math.round(((inv.mrp - inv.price) / inv.mrp) * 100);
                }
                
                const categoryName = inv.product && inv.product.category && inv.product.category.name 
                                        ? inv.product.category.name 
                                        : 'General';

                const images = inv.productImages && inv.productImages.length > 0 
                                    ? inv.productImages 
                                    : (inv.product && inv.product.images ? inv.product.images : []);

                formattedProducts.push({
                    id: inv._id,
                    name: inv.productName || (inv.product ? inv.product.name : 'Unknown Product'),
                    images: images,
                    price: inv.price,
                    mrp: inv.mrp || inv.price,
                    discount: discount,
                    rating: parseFloat(rating),
                    category: categoryName
                });
            }
        }

        const sectionsList = [
            "Top Picks For You",
            "Fresh & Healthy",
            "Weekly Deals",
            "Best Sellers",
            "New Arrivals"
        ];

        const sections = sectionsList.map((title) => {
            // Shuffle to allow overlap between sections but no duplicates within a section
            const shuffled = [...formattedProducts].sort(() => 0.5 - Math.random());
            const items = shuffled.slice(0, 10);
            return {
                title,
                items: items
            };
        });

        res.status(200).json({
            success: true,
            data: sections
        });
    } catch (error) {
        console.error("Error fetching home sections:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


const fetchAndFormatProducts = async (limit = 10) => {
    const inventories = await Inventory.find({ isAvailable: true, stock: { $gt: 0 } })
        .populate({
            path: 'product',
            populate: { path: 'category', select: 'name' }
        })
        .sort({ _id: 1 })
        .limit(100); // Fetch more to account for duplicates

    const seenProducts = new Set();
    const formattedProducts = [];

    for (const inv of inventories) {
        const productId = inv.product ? inv.product._id.toString() : inv._id.toString();
        if (!seenProducts.has(productId)) {
            seenProducts.add(productId);

            const rating = (Math.random() * (5 - 3.5) + 3.5).toFixed(1); 
            let discount = 0;
            if (inv.mrp && inv.price && inv.mrp > inv.price) {
                discount = Math.round(((inv.mrp - inv.price) / inv.mrp) * 100);
            }
            
            const categoryName = inv.product && inv.product.category && inv.product.category.name 
                                    ? inv.product.category.name 
                                    : 'General';

            const images = inv.productImages && inv.productImages.length > 0 
                                ? inv.productImages 
                                : (inv.product && inv.product.images ? inv.product.images : []);

            formattedProducts.push({
                id: inv._id,
                name: inv.productName || (inv.product ? inv.product.name : 'Unknown Product'),
                images: images,
                price: inv.price,
                mrp: inv.mrp || inv.price,
                discount: discount,
                rating: parseFloat(rating),
                category: categoryName
            });
        }
    }

    // Shuffle to allow overlap between different calls/sections
    const shuffled = formattedProducts.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
};

exports.getTopPicks = async (req, res) => {
    try {
        const items = await fetchAndFormatProducts(10);
        res.status(200).json({
            success: true,
            data: { title: 'Top Picks For You', items: items }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getFreshHealthy = async (req, res) => {
    try {
        const items = await fetchAndFormatProducts(10);
        res.status(200).json({
            success: true,
            data: { title: 'Fresh & Healthy', items: items }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getWeeklyDeals = async (req, res) => {
    try {
        const items = await fetchAndFormatProducts(10);
        res.status(200).json({
            success: true,
            data: { title: 'Weekly Deals', items: items }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getBestSellers = async (req, res) => {
    try {
        const items = await fetchAndFormatProducts(10);
        res.status(200).json({
            success: true,
            data: { title: 'Best Sellers', items: items }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getNewArrivals = async (req, res) => {
    try {
        const items = await fetchAndFormatProducts(10);
        res.status(200).json({
            success: true,
            data: { title: 'New Arrivals', items: items }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * Get all primary categories
 * @route GET /api/customer/primary-categories
 * @access Private/Public
 */
exports.getPrimaryCategories = async (req, res) => {
    try {
        const categories = await Category.find({ parent: null, isActive: true })
            .select('_id name image');

        const formattedCategories = categories.map(cat => ({
            id: cat._id,
            name: cat.name,
            image: cat.image
        }));

        res.status(200).json({
            success: true,
            data: formattedCategories
        });
    } catch (error) {
        console.error("Error fetching primary categories:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get products by primary category (including subcategories)
 * @route GET /api/customer/category/:categoryId/products
 * @access Private/Public
 */
exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Find subcategories
        const subCategories = await Category.find({ parent: categoryId, isActive: true }).select('_id');
        const subCategoryIds = subCategories.map(cat => cat._id);

        // Include the primary category itself
        const allCategoryIds = [categoryId, ...subCategoryIds];

        // Find products in these categories
        const products = await Product.find({ category: { $in: allCategoryIds }, isActive: true }).select('_id');
        const productIds = products.map(p => p._id);

        // Find inventories for these products
        const inventories = await Inventory.find({ 
            product: { $in: productIds },
            isAvailable: true, 
            stock: { $gt: 0 } 
        })
        .populate({
            path: 'product',
            populate: { path: 'category', select: 'name' }
        })
        .sort({ _id: 1 })
        .limit(100);

        const seenProducts = new Set();
        const formattedProducts = [];

        for (const inv of inventories) {
            const productId = inv.product ? inv.product._id.toString() : inv._id.toString();
            if (!seenProducts.has(productId)) {
                seenProducts.add(productId);

                const rating = (Math.random() * (5 - 3.5) + 3.5).toFixed(1); 
                let discount = 0;
                if (inv.mrp && inv.price && inv.mrp > inv.price) {
                    discount = Math.round(((inv.mrp - inv.price) / inv.mrp) * 100);
                }
                
                const categoryName = inv.product && inv.product.category && inv.product.category.name 
                                        ? inv.product.category.name 
                                        : 'General';

                const images = inv.productImages && inv.productImages.length > 0 
                                    ? inv.productImages 
                                    : (inv.product && inv.product.images ? inv.product.images : []);

                formattedProducts.push({
                    id: inv._id,
                    name: inv.productName || (inv.product ? inv.product.name : 'Unknown Product'),
                    images: images,
                    price: inv.price,
                    mrp: inv.mrp || inv.price,
                    discount: discount,
                    rating: parseFloat(rating),
                    category: categoryName
                });
            }
        }

        res.status(200).json({
            success: true,
            data: formattedProducts
        });
    } catch (error) {
        console.error("Error fetching products by category:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get product details by ID
 * @route GET /api/customer/products/:id
 * @access Private/Public
 */
exports.getProductDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const inventory = await Inventory.findById(id)
            .populate({
                path: 'product',
                populate: { path: 'category', select: 'name' }
            })
            .populate('store', 'name logo');

        if (!inventory) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const rating = (Math.random() * (5 - 3.5) + 3.5).toFixed(1); 
        let discount = 0;
        if (inventory.mrp && inventory.price && inventory.mrp > inventory.price) {
            discount = Math.round(((inventory.mrp - inventory.price) / inventory.mrp) * 100);
        }

        const categoryName = inventory.product && inventory.product.category && inventory.product.category.name 
                                ? inventory.product.category.name 
                                : 'General';

        const images = inventory.productImages && inventory.productImages.length > 0 
                            ? inventory.productImages 
                            : (inventory.product && inventory.product.images ? inventory.product.images : []);

        // Find all variants for this product in the same store
        const variantInventories = await Inventory.find({
            product: inventory.product._id,
            store: inventory.store._id,
            isAvailable: true
        });

        const variants = variantInventories.map(v => {
            let vDiscount = 0;
            if (v.mrp && v.price && v.mrp > v.price) {
                vDiscount = Math.round(((v.mrp - v.price) / v.mrp) * 100);
            }
            return {
                id: v._id,
                price: v.price,
                mrp: v.mrp || v.price,
                discount: vDiscount,
                options: v.variantOptions,
                stock: v.stock,
                images: v.productImages && v.productImages.length > 0 ? v.productImages : []
            };
        });

        const productDetails = {
            id: inventory._id,
            name: inventory.productName || (inventory.product ? inventory.product.name : 'Unknown Product'),
            description: inventory.product ? inventory.product.description : '',
            brand: inventory.product ? inventory.product.brand : '',
            images: images,
            price: inventory.price,
            mrp: inventory.mrp || inventory.price,
            discount: discount,
            rating: parseFloat(rating),
            category: categoryName,
            stock: inventory.stock,
            isAvailable: inventory.isAvailable,
            store: inventory.store ? { id: inventory.store._id, name: inventory.store.name, logo: inventory.store.logo } : null,
            variants: variants
        };

        res.status(200).json({
            success: true,
            data: productDetails
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};