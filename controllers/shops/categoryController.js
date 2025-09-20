const Category = require("../../models/shops/Category");
const generateUniqueSlug = require("../../utils/slugify");

// Create Category
exports.createCategory = async (req, res) => {
    try {
        const { shopId, title, oneLiner, sequence } = req.body;

        if (!title || !sequence || !shopId) {
            return res.status(400).json({
                success: false,
                message: "title, shopId and sequence are required",
            });
        }

        // Check sequence uniqueness per shop
        const existingSeq = await Category.findOne({ sequence, shopId: shopId });
        if (existingSeq) {
            return res.status(400).json({
                success: false,
                message: `Sequence number ${sequence} is already in use for this shop`,
            });
        }

        const slug = await generateUniqueSlug(title, Category);

        const verticalImageUrl = req.files?.["verticalImageUrl"]
            ? `/uploads/${req.files["verticalImageUrl"][0].filename}`
            : null;

        const mainIconUrl = req.files?.["mainIconUrl"]
            ? `/uploads/${req.files["mainIconUrl"][0].filename}`
            : null;

        const category = new Category({
            shopId,
            title,
            slug,
            verticalImageUrl,
            mainIconUrl,
            oneLiner,
            sequence,
        });

        const savedCategory = await category.save();

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: savedCategory,
        });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Edit Category
exports.updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { title, oneLiner, sequence, shopId } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // Check if sequence is changing and ensure uniqueness
        if (sequence && sequence !== category.sequence) {
            const existingSeq = await Category.findOne({ sequence, shopId: shopId || category.shopId || null });
            if (existingSeq) {
                return res.status(400).json({
                    success: false,
                    message: `Sequence ${sequence} already exists for this shop`,
                });
            }
            category.sequence = sequence;
        }

        if (title && title !== category.title) {
            category.title = title;
            category.slug = await generateUniqueSlug(title, Category);
        }

        if (oneLiner) category.oneLiner = oneLiner;

        if (req.files?.["verticalImageUrl"]) {
            category.verticalImageUrl = `/uploads/${req.files["verticalImageUrl"][0].filename}`;
        }

        if (req.files?.["mainIconUrl"]) {
            category.mainIconUrl = `/uploads/${req.files["mainIconUrl"][0].filename}`;
        }

        const updated = await category.save();

        res.json({
            success: true,
            message: "Category updated successfully",
            data: updated,
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const deleted = await Category.findByIdAndDelete(categoryId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Get all categories by shopId
exports.getCategoriesByShop = async (req, res) => {
    try {
        const { shopId } = req.params;

        const categories = await Category.find({ shopId: shopId || null }).sort({ sequence: 1 });

        res.json({
            success: true,
            message: "Categories fetched successfully",
            data: categories,
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Get single category by shopId + sequence
exports.getCategoryBySequence = async (req, res) => {
    try {
        const { shopId, sequence } = req.params;

        const category = await Category.findOne({ shopId: shopId || null, sequence: Number(sequence) });

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.json({
            success: true,
            message: "Category fetched successfully",
            data: category,
        });
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
