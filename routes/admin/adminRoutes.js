const express = require("express");
const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");
const roleController = require("../../controllers/shops/roleController");
const { getAllStores, verifyStore } = require("../../controllers/shops/Shop");
const {createVariantOption,getVariantOptions,updateVariantOption,deleteVariantOption} = require("../../controllers/shops/variantOptionController");

const router = express.Router();

// Admin-only: Get all stores
router.get("/stores", adminAuthMiddleware, getAllStores);

// Admin-only: Verify store
router.put("/stores/:storeId/verify", adminAuthMiddleware, verifyStore);

// Admin-only: Variant Options
router.post("/variant-options", adminAuthMiddleware, createVariantOption);
router.get("/variant-options", adminAuthMiddleware,getVariantOptions);
router.put("/variant-options/:id", adminAuthMiddleware,updateVariantOption);
router.delete("/variant-options/:id", adminAuthMiddleware,deleteVariantOption);

// Admin-only: Create a role
// router.post("/roles", adminAuthMiddleware, roleController.createRole);

// Optional: expose other role endpoints for admins
// router.get("/roles", adminAuthMiddleware, roleController.getRoles);
// router.get("/roles/:id", adminAuthMiddleware, roleController.getRoleById);
// router.put("/roles/:id", adminAuthMiddleware, roleController.updateRole);
// router.delete("/roles/:id", adminAuthMiddleware, roleController.deleteRole);

module.exports = router;
