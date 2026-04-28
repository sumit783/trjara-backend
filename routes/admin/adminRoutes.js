const express = require("express");
const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");
const { getAllStores, verifyStore, getStoreDetailsById, getStoresWithProducts } = require("../../controllers/shops/Shop");
const { getAllUsers, getCustomerById, verifyUser } = require("../../controllers/users/userController");
const { createVariantOption, getVariantOptions, updateVariantOption, deleteVariantOption } = require("../../controllers/shops/variantOptionController");
const { getAllRiders, getRiderDocuments, verifyDocument } = require("../../controllers/delivery/adminRiderController");
const { createVehicleType, getAllVehicleTypes, updateVehicleType, deleteVehicleType } = require("../../controllers/delivery/vehicleTypeController");
const { createCharge, getCharges, updateCharge, deleteCharge, getStoresWithCharges, getProductsWithCharges } = require("../../controllers/admin/chargeController");
const { getAllProducts, getProductById } = require("../../controllers/shops/productController");
const upload = require("../../middlewares/upload");

const router = express.Router();

// Admin-only: Get all stores
router.get("/stores", adminAuthMiddleware, getAllStores);

// Admin-only: Get stores with products
router.get("/stores/products", adminAuthMiddleware, getStoresWithProducts);

// Admin-only: Get store details by ID
router.get("/stores/:storeId", adminAuthMiddleware, getStoreDetailsById);

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
router.get("/users", adminAuthMiddleware, getAllUsers);
router.get("/users/:id", adminAuthMiddleware, getCustomerById);
router.put("/users/:id/verify", adminAuthMiddleware, verifyUser);

// Admin-only: Vehicle Types
router.post("/vehicle-types", adminAuthMiddleware, upload.single("image"), createVehicleType);
router.get("/vehicle-types", adminAuthMiddleware, getAllVehicleTypes);
router.put("/vehicle-types/:id", adminAuthMiddleware, upload.single("image"), updateVehicleType);
router.delete("/vehicle-types/:id", adminAuthMiddleware, deleteVehicleType);

// Admin-only: Charges (Global, Shop, Product, etc.)
router.post("/charges", adminAuthMiddleware, createCharge);
router.get("/charges", adminAuthMiddleware, getCharges);
router.get("/charges/stores", adminAuthMiddleware, getStoresWithCharges);
router.get("/charges/products", adminAuthMiddleware, getProductsWithCharges);
router.put("/charges/:id", adminAuthMiddleware, updateCharge);
router.delete("/charges/:id", adminAuthMiddleware, deleteCharge);

// Admin-only: Products
router.get("/products", adminAuthMiddleware, getAllProducts);
router.get("/products/:productId", adminAuthMiddleware, getProductById);

module.exports = router;
