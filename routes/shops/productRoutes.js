const express = require("express");
const upload = require("../../middlewares/upload");
const { createProduct, getProducts, getProductById, updateProduct, deleteProduct } = require("../../controllers/shops/productController");

const router = express.Router();

router.post(
    "/",
    upload.fields([{ name: "thumbnailUrl", maxCount: 1 }, { name: "imageUrls", maxCount: 5 }]),
    createProduct
);

router.get("/", getProducts);
router.get("/:id", getProductById);

router.put(
    "/:id",
    upload.fields([{ name: "thumbnailUrl", maxCount: 1 }, { name: "imageUrls", maxCount: 5 }]),
    updateProduct
);

router.delete("/:id", deleteProduct);

module.exports = router;
