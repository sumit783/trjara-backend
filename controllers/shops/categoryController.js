const Category = require("../../models/shops/Category");
const generateUniqueSlug = require("../../utils/slugify");

// Create Category
exports.createCategory = async (req, res) => {
    try {
        const { name, parent, isActive } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "name is required",
            });
        }

        const slug = await generateUniqueSlug(name, Category);

        const image = req.files?.["image"]
            ? `/uploads/${req.files["image"][0].filename}`
            : null;

        const category = new Category({
            name,
            slug,
            parent: parent || null,
            image,
            isActive: isActive !== undefined ? isActive : true,
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
        const { name, parent, isActive } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        if (name && name !== category.name) {
            category.name = name;
            category.slug = await generateUniqueSlug(name, Category);
        }

        if (parent !== undefined) category.parent = parent || null;
        if (isActive !== undefined) category.isActive = isActive;

        if (req.files?.["image"]) {
            category.image = `/uploads/${req.files["image"][0].filename}`;
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

        // Also potentially handle child categories here later if needed
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

// Get all categories (optionally nested or filtered by active status)
exports.getCategories = async (req, res) => {
    try {
        const query = {};
        if (req.query.active === 'true') query.isActive = true;
        
        // Populate parent for tree structures if necessary
        const categories = await Category.find(query)
            .populate('parent', 'name slug')
            .sort({ createdAt: -1 });

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

// Get single category by Slug or ID
exports.getCategory = async (req, res) => {
    try {
        const { identifier } = req.params;

        // Try to find by ID first, then fallback to slug
        let category;
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            category = await Category.findById(identifier).populate('parent', 'name slug');
        } else {
            category = await Category.findOne({ slug: identifier }).populate('parent', 'name slug');
        }

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
