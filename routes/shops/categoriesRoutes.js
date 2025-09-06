const express = require("express");
const upload = require("../../middlewares/upload");
const {
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByShop,
    getCategoryBySequence,
} = require("../../controllers/shops/categoryController");

const router = express.Router();

// Create category (with image uploads)
router.post(
    "/",
    upload.fields([
        { name: "verticalImageUrl", maxCount: 1 },
        { name: "mainIconUrl", maxCount: 1 },
    ]),
    createCategory
);

// Update category
router.put(
    "/:categoryId",
    upload.fields([
        { name: "verticalImageUrl", maxCount: 1 },
        { name: "mainIconUrl", maxCount: 1 },
    ]),
    updateCategory
);

// Delete category
router.delete("/:categoryId", deleteCategory);

// Get all categories by shop
router.get("/shop/:shopId", getCategoriesByShop);

// Get category by sequence within shop
router.get("/shop/:shopId/sequence/:sequence", getCategoryBySequence);

module.exports = router;
