const express = require("express");
const upload = require("../../middlewares/upload");
const { CreateVendorShop, EditVendorShop } = require("../../controllers/shops/Shop");
const staffRoutes = require("./staffRoutes");
const storeDocumentRoutes = require("./storeDocumentRoutes");
const authMiddleware = require("../../middlewares/authMiddleware");

const router = express.Router();

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
