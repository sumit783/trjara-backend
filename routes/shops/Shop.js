const express = require("express");
const upload = require("../../middlewares/upload");
const { CreateVendorShop, EditVendorShop } = require("../../controllers/shops/Shop");

const router = express.Router();

// For multiple files
router.post(
  "/",
  upload.fields([
    { name: "coverImageUrl", maxCount: 1 },
    { name: "logoUrl", maxCount: 1 },
  ]),
  CreateVendorShop
);

router.put(
  "/:shopId",
  upload.fields([
    { name: "logoUrl", maxCount: 1 },
    { name: "coverImageUrl", maxCount: 1 },
  ]),
  EditVendorShop
);

module.exports = router;
