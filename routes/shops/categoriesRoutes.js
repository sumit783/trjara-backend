const express = require("express");
const upload = require("../../middlewares/upload");
const {
    createCategory,
    updateCategory,
    deleteCategory,
    getCategories,
    getCategory,
} = require("../../controllers/shops/categoryController");
const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");

const router = express.Router();

// Create category (with image map to "image")
router.post(
    "/",
    adminAuthMiddleware,
    upload.fields([
        { name: "image", maxCount: 1 }
    ]),
    createCategory
);

// Update category
router.put(
    "/:categoryId",
    adminAuthMiddleware,
    upload.fields([
        { name: "image", maxCount: 1 }
    ]),
    updateCategory
);

// Delete category
router.delete("/:categoryId", adminAuthMiddleware, deleteCategory);

// Get all categories
router.get("/", getCategories);

// Get category by slug or ID
router.get("/:identifier", getCategory);

module.exports = router;
