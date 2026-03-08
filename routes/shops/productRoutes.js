const express = require("express");
const upload = require("../../middlewares/upload");
const {
    createProduct,
    addVariantOptions,
    generateVariants,
    addInventory,
    generateQRCodes,
    updateInventoryStock,
    deleteInventory
} = require("../../controllers/shops/productController");
const authMiddleware = require("../../middlewares/authMiddleware");

const router = express.Router();

// 1. Create Base Product
// Uses upload.fields to accept multiple images under the "images" key
router.post("/", authMiddleware, upload.fields([{ name: "images", maxCount: 5 }]), createProduct);

// 2. Add Variant Options
router.post("/:productId/options", authMiddleware, addVariantOptions);

// 3. Generate Variants
router.post("/:productId/variants/generate", authMiddleware, generateVariants);

// 4. Add Price & Stock (Inventory)
router.post("/:productId/inventory", authMiddleware, addInventory);

// 5. Generate QR Code - Note this is an inventory operation, mapped globally or under product
router.post("/inventory/qrcodes/generate", authMiddleware, generateQRCodes);

// 6. Update Inventory Stock
router.put("/inventory/:inventoryId", authMiddleware, updateInventoryStock);

// 7. Delete Inventory
router.delete("/inventory/:inventoryId", authMiddleware, deleteInventory);

module.exports = router;
