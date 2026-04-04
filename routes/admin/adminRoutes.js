const express = require("express");
const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");
const { getAllStores, verifyStore } = require("../../controllers/shops/Shop");
const { getAllCustomers, getCustomerById, verifyUser } = require("../../controllers/users/userController");
const { createVariantOption, getVariantOptions, updateVariantOption, deleteVariantOption } = require("../../controllers/shops/variantOptionController");
const { getAllRiders, getRiderDocuments, verifyDocument } = require("../../controllers/delivery/adminRiderController");
const { createVehicleType, getAllVehicleTypes, updateVehicleType, deleteVehicleType } = require("../../controllers/delivery/vehicleTypeController");
const upload = require("../../middlewares/upload");

const router = express.Router();

// Admin-only: Get all stores
router.get("/stores", adminAuthMiddleware, getAllStores);

// Admin-only: Verify store
router.put("/stores/:storeId/verify", adminAuthMiddleware, verifyStore);

// Admin-only: Variant Options
router.post("/variant-options", adminAuthMiddleware, createVariantOption);
router.get("/variant-options", adminAuthMiddleware, getVariantOptions);
router.put("/variant-options/:id", adminAuthMiddleware, updateVariantOption);
router.delete("/variant-options/:id", adminAuthMiddleware, deleteVariantOption);

// Admin-only: Rider management
router.get("/riders", adminAuthMiddleware, getAllRiders);
router.get("/riders/:riderId/documents", adminAuthMiddleware, getRiderDocuments);
router.put("/documents/:docId/verify", adminAuthMiddleware, verifyDocument);

// Admin-only: User management
router.get("/users", adminAuthMiddleware, getAllCustomers);
router.get("/users/:id", adminAuthMiddleware, getCustomerById);
router.put("/users/:id/verify", adminAuthMiddleware, verifyUser);

// Admin-only: Vehicle Types
router.post("/vehicle-types", adminAuthMiddleware, upload.single("image"), createVehicleType);
router.get("/vehicle-types", adminAuthMiddleware, getAllVehicleTypes);
router.put("/vehicle-types/:id", adminAuthMiddleware, upload.single("image"), updateVehicleType);
router.delete("/vehicle-types/:id", adminAuthMiddleware, deleteVehicleType);

module.exports = router;
