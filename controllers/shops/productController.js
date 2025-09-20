const Inventory = require("../../models/shops/Inventory");
const Product = require("../../models/shops/Product");
const InventoryVariant = require("../../models/shops/InventoryVariant");
const generateUniqueSlug = require("../../utils/slugify");

// -------------------- CREATE --------------------
exports.createProduct = async (req, res) => {
    try {
        const { shopId, categoryId, title, description } = req.body;

        if (!shopId || !title) {
            return res.status(400).json({ success: false, message: "shopId and title are required" });
        }

        const slug = await generateUniqueSlug(title, Product);

        const product = new Product({
            shopId,
            categoryId,
            title,
            slug,
            description,
            thumbnailUrl: req.files?.thumbnailUrl
                ? `/uploads/${req.files.thumbnailUrl[0].filename}`
                : null,
            imageUrls: req.files?.imageUrls
                ? req.files.imageUrls.map((f) => `/uploads/${f.filename}`)
                : [],
        });

        const savedProduct = await product.save();
        res.status(201).json({ success: true, message: "Product created", data: savedProduct });
    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// -------------------- READ (ALL with filters) --------------------
exports.getProducts = async (req, res) => {
    try {
        const { shopId, categoryId, search, isActive, page = 1, limit = 10 } = req.query;
        const query = {};

        if (shopId) query.shopId = shopId;
        if (categoryId) query.categoryId = categoryId;
        if (isActive !== undefined) query.isActive = isActive === "true";

        if (search) {
            query.$or = [
                { title: new RegExp(search, "i") },
                { description: new RegExp(search, "i") },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            count: products.length,
            data: products,
        });
    } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// -------------------- READ (SINGLE) --------------------
exports.getProductById = async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId)
            .populate("shopId", "name type")
            .populate("categoryId", "title slug");

        if (!product) {
            return res
                .status(404)
                .json({ success: false, message: "Product not found" });
        }

        // 1️⃣ Get all inventories for this product
        const inventories = await Inventory.find({ productId });

        // 2️⃣ For each inventory, fetch variants
        const inventoryWithVariants = await Promise.all(
            inventories.map(async (inv) => {
                const variants = await InventoryVariant.find({ inventoryId: inv._id })
                    .populate("variantOptionId", "name values"); // link to VariantOption

                return {
                    ...inv.toObject(),
                    variants,
                };
            })
        );

        res.json({
            success: true,
            data: {
                product,
                inventories: inventoryWithVariants,
            },
        });
    } catch (error) {
        console.error("Get product error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};


// -------------------- UPDATE --------------------
exports.updateProduct = async (req, res) => {
    try {
        const { title, description, categoryId, isActive } = req.body;

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (title) {
            product.title = title;
            product.slug = await generateUniqueSlug(title, Product, product._id);
        }
        if (description) product.description = description;
        if (categoryId) product.categoryId = categoryId;
        if (isActive !== undefined) product.isActive = isActive;

        if (req.files?.thumbnailUrl) {
            product.thumbnailUrl = `/uploads/${req.files.thumbnailUrl[0].filename}`;
        }
        if (req.files?.imageUrls) {
            product.imageUrls = req.files.imageUrls.map((f) => `/uploads/${f.filename}`);
        }

        const updated = await product.save();
        res.json({ success: true, message: "Product updated", data: updated });
    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// -------------------- DELETE --------------------
exports.deleteProduct = async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.json({ success: true, message: "Product deleted" });
    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
