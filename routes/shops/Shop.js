const express = require("express");
const upload = require("../../middlewares/upload");
const { CreateVendorShop, EditVendorShop } = require("../../controllers/shops/Shop");
const { getStoreTiming, saveStoreTiming } = require("../../controllers/shops/storeTimingController");
const { addBankAccount, getVendorBankAccount, verifyBankAccount, setDefaultBankAccount } = require("../../controllers/shops/bankAccountController");
const { createCoupon, getShopCoupons, deleteCoupon } = require("../../controllers/shops/couponController");
const { getStoreProductCategories } = require("../../controllers/shops/ownerController");
const { getStoreProductsByCategory } = require("../../controllers/shops/productController");
const staffRoutes = require("./staffRoutes");
const storeDocumentRoutes = require("./storeDocumentRoutes");
const authMiddleware = require("../../middlewares/authMiddleware");
const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");

const router = express.Router();

// Store Timing routes
router.get("/:shopId/timing", getStoreTiming);
router.post("/:shopId/timing", saveStoreTiming);

// Category routes for store products
router.get("/:shopId/categories", authMiddleware, getStoreProductCategories);
router.get("/:shopId/categories/:categoryId/products", getStoreProductsByCategory);

// Bank Account routes
router.get("/bank-account", authMiddleware, getVendorBankAccount);
router.post("/bank-account", authMiddleware, addBankAccount);
router.put("/bank-account/:accountId/default", authMiddleware, setDefaultBankAccount);
router.put("/bank-account/:accountId/verify", adminAuthMiddleware, verifyBankAccount);

// Coupon routes
router.get("/:shopId/coupons", authMiddleware, getShopCoupons);
router.post("/:shopId/coupons", authMiddleware, createCoupon);
router.delete("/:shopId/coupons/:couponId", authMiddleware, deleteCoupon);

// For multiple files
router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  CreateVendorShop
);

router.put(
  "/:shopId",
  authMiddleware,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  EditVendorShop
);

// nested shop-related routes
router.use("/staff", staffRoutes);
router.use("/documents", storeDocumentRoutes);

module.exports = router;
