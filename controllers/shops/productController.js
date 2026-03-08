const Product = require("../../models/shops/Product");
const VariantOption = require("../../models/shops/VariantOption");
const ProductVariant = require("../../models/shops/ProductVariant");
const Inventory = require("../../models/shops/Inventory");
const InventoryLog = require("../../models/shops/InventoryLog");
const QRCode = require("../../models/shops/QRCode");
const generateUniqueSlug = require("../../utils/slugify");
const crypto = require("crypto");

// 1. Create Base Product
exports.createProduct = async (req, res) => {
    try {
        const { name, description, brand, category, isActive } = req.body;

        if (!name || !category) {
            return res.status(400).json({ success: false, message: "name and category are required" });
        }

        const images = [];
        if (req.files && req.files["images"]) {
            for (const file of req.files["images"]) {
                images.push(`/uploads/${file.filename}`);
            }
        }

        const product = new Product({
            name,
            description,
            brand,
            category,
            images,
            isActive: isActive !== undefined ? isActive : true
        });

        const savedProduct = await product.save();

        res.status(201).json({
            success: true,
            message: "Product base created successfully",
            data: savedProduct
        });

    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 2. Add Variant Options
exports.addVariantOptions = async (req, res) => {
    try {
        const { productId } = req.params;
        const { options } = req.body; // Array of { name: 'Size', values: ['S', 'M', 'L'] }

        if (!options || !Array.isArray(options)) {
            return res.status(400).json({ success: false, message: "options array is required" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const savedOptions = [];
        for (const opt of options) {
            const newOption = new VariantOption({
                name: opt.name,
                values: opt.values
            });
            const savedOption = await newOption.save();
            savedOptions.push(savedOption._id);
        }

        // Link options to product
        product.options = [...(product.options || []), ...savedOptions];
        await product.save();

        // Automatically sync variants as requested by the user
        const createdVariants = await syncProductVariants(productId);

        res.status(201).json({
            success: true,
            message: "Variant options added and variants generated",
            data: {
                options: savedOptions,
                variants: createdVariants
            }
        });
    } catch (error) {
        console.error("Error adding variant options:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Helper function to sync/generate variants for a product
const syncProductVariants = async (productId) => {
    const product = await Product.findById(productId).populate("options");
    if (!product) throw new Error("Product not found");

    if (!product.options || product.options.length === 0) {
        return [];
    }

    // Helper to generate Cartesian product of arrays
    const cartesianProduct = (arrays) => {
        return arrays.reduce((acc, curr) =>
            acc.flatMap(c => curr.map(n => [...c, n])),
            [[]]
        );
    };

    const optionNames = product.options.map(o => o.name);
    const optionValuesList = product.options.map(o => o.values);

    const combinations = cartesianProduct(optionValuesList);

    const createdVariants = [];

    // Clear existing variants from the collection for this product to avoid duplicates
    // Note: In a production app, you might want to preserve some data (like old SKUs or images)
    await ProductVariant.deleteMany({ product: productId });

    for (const combo of combinations) {
        const optionsMap = new Map();
        for (let i = 0; i < optionNames.length; i++) {
            optionsMap.set(optionNames[i], combo[i]);
        }

        const skuSuffix = combo.map(v => v.substring(0, 3).toUpperCase()).join('-');
        const sku = `PRD-${productId.substring(18, 24)}-${skuSuffix}-${Date.now().toString().slice(-4)}`;

        const variant = new ProductVariant({
            product: productId,
            options: optionsMap,
            sku: sku
        });

        const savedVariant = await variant.save();
        createdVariants.push(savedVariant);
    }

    // Link variants to product
    product.productVariant = createdVariants.map(v => v._id);
    await product.save();

    return createdVariants;
};

// 3. Generate Variants
exports.generateVariants = async (req, res) => {
    try {
        const { productId } = req.params;
        const createdVariants = await syncProductVariants(productId);

        res.status(201).json({
            success: true,
            message: "Product variants generated and linked successfully",
            count: createdVariants.length,
            data: createdVariants
        });

    } catch (error) {
        console.error("Error generating variants:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 4. Add Price & Stock (Inventory)
exports.addInventory = async (req, res) => {
    try {
        const { productId } = req.params;
        const { storeId, inventoryData } = req.body;
        // inventoryData = [{ variantId, price, mrp, stock }, ...]

        if (!storeId || !inventoryData || !Array.isArray(inventoryData)) {
            return res.status(400).json({ success: false, message: "storeId and inventoryData array are required" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const createdInventories = [];

        for (const item of inventoryData) {
            let variantOptions = null;
            let sku = null;

            if (item.variantId) {
                const variant = await ProductVariant.findById(item.variantId);
                if (variant) {
                    variantOptions = variant.options;
                    sku = variant.sku;
                }
            }

            const inventory = new Inventory({
                store: storeId,
                product: productId,
                variant: item.variantId || null,
                productName: product.name,
                productImages: product.images,
                variantOptions: variantOptions,
                sku: sku || item.sku,
                price: item.price,
                mrp: item.mrp || item.price,
                stock: item.stock || 0
            });

            const savedInv = await inventory.save();

            // Log the inventory addition
            await InventoryLog.create({
                inventory: savedInv._id,
                changeType: "add",
                quantity: item.stock || 0,
                reason: "Initial stock addition",
                staff: req.user._id
            });

            createdInventories.push(savedInv);
        }

        res.status(201).json({
            success: true,
            message: "Inventory records created and logged successfully",
            count: createdInventories.length,
            data: createdInventories
        });

    } catch (error) {
        console.error("Error adding inventory:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 5. Generate QR Code
exports.generateQRCodes = async (req, res) => {
    try {
        // Accept an array of inventory IDs
        const { inventoryIds, storeId } = req.body;

        if (!inventoryIds || !Array.isArray(inventoryIds) || !storeId) {
            return res.status(400).json({ success: false, message: "inventoryIds array and storeId are required" });
        }

        const createdQRs = [];

        for (const invId of inventoryIds) {
            const code = crypto.randomBytes(8).toString('hex').toUpperCase();

            const qrCode = new QRCode({
                code: `QR-${code}`,
                inventory: invId,
                store: storeId
            });

            const savedQR = await qrCode.save();
            createdQRs.push(savedQR);
        }

        res.status(201).json({
            success: true,
            message: "QR Codes generated successfully",
            count: createdQRs.length,
            data: createdQRs
        });

    } catch (error) {
        console.error("Error generating QR codes:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 6. Update Inventory Stock
exports.updateInventoryStock = async (req, res) => {
    try {
        const { inventoryId } = req.params;
        const { stock, reason, changeType } = req.body; // changeType: "add", "remove", "adjust"

        const inventory = await Inventory.findById(inventoryId);
        if (!inventory) {
            return res.status(404).json({ success: false, message: "Inventory record not found" });
        }

        if (changeType === "add") {
            inventory.stock += stock;
        } else if (changeType === "remove") {
            inventory.stock -= stock;
        } else {
            inventory.stock = stock; // adjust/set
        }

        const updatedInv = await inventory.save();

        // Log the change
        await InventoryLog.create({
            inventory: inventoryId,
            changeType: changeType || "adjust",
            quantity: changeType === "adjust" ? stock : stock, // we log the change amount or final amount? Typically change amount.
            reason: reason || "Stock update",
            staff: req.user._id
        });

        res.status(200).json({
            success: true,
            message: "Inventory updated and logged successfully",
            data: updatedInv
        });

    } catch (error) {
        console.error("Error updating inventory:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// 7. Delete Inventory
exports.deleteInventory = async (req, res) => {
    try {
        const { inventoryId } = req.params;

        const inventory = await Inventory.findById(inventoryId);
        if (!inventory) {
            return res.status(404).json({ success: false, message: "Inventory record not found" });
        }

        // Log the deletion before actually deleting
        await InventoryLog.create({
            inventory: inventoryId,
            changeType: "remove",
            quantity: -inventory.stock,
            reason: "Inventory record deleted",
            staff: req.user._id
        });

        await Inventory.findByIdAndDelete(inventoryId);

        res.status(200).json({
            success: true,
            message: "Inventory record deleted and logged successfully"
        });

    } catch (error) {
        console.error("Error deleting inventory:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
