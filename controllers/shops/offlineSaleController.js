const QRCode = require("../../models/shops/QRCode");
const Inventory = require("../../models/shops/Inventory");
const InventoryLog = require("../../models/shops/InventoryLog");
const mongoose = require("mongoose");

/**
 * Get inventory details by scanning a QR code
 * @route GET /api/owner/inventory/qr/:code
 * @access Private (Owner)
 */
exports.getInventoryByQRCode = async (req, res) => {
    try {
        const { code } = req.params;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "QR code is required"
            });
        }

        // Find the QR code and populate inventory details
        const qrRecord = await QRCode.findOne({ code, isActive: true })
            .populate({
                path: "inventory",
                populate: {
                    path: "product",
                    select: "name description images brand"
                }
            });

        if (!qrRecord || !qrRecord.inventory) {
            return res.status(404).json({
                success: false,
                message: "Invalid or inactive QR code"
            });
        }

        const inventory = qrRecord.inventory;

        // Ensure the inventory belongs to the owner's shop (if needed, though QR code is usually shop-specific)
        // You might want to add a check here to ensure the owner owns qrRecord.store

        res.status(200).json({
            success: true,
            message: "Inventory details fetched successfully",
            data: {
                inventoryId: inventory._id,
                productName: inventory.productName || (inventory.product ? inventory.product.name : "Unknown Product"),
                sku: inventory.sku,
                price: inventory.price,
                stock: inventory.stock,
                productImages: inventory.productImages || (inventory.product ? inventory.product.images : []),
                variantOptions: inventory.variantOptions
            }
        });

    } catch (error) {
        console.error("Error fetching inventory by QR code:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

/**
 * Process an offline sale
 * @route POST /api/owner/sell-offline
 * @access Private (Owner)
 */
exports.processOfflineSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "An array of items with inventoryId and quantity is required"
            });
        }

        const processedItems = [];

        for (const item of items) {
            const { inventoryId, quantity } = item;

            if (!inventoryId || !quantity || quantity <= 0) {
                throw new Error("Each item must have a valid inventoryId and positive quantity");
            }

            const inventory = await Inventory.findById(inventoryId).session(session);

            if (!inventory) {
                throw new Error(`Inventory record not found for ID: ${inventoryId}`);
            }

            if (inventory.stock < quantity) {
                throw new Error(`Insufficient stock for ${inventory.productName || inventoryId}. Available: ${inventory.stock}, Requested: ${quantity}`);
            }

            // Reduce stock
            inventory.stock -= quantity;
            await inventory.save({ session });

            // Log the inventory change
            await InventoryLog.create([{
                inventory: inventoryId,
                changeType: "remove",
                quantity: -quantity,
                reason: "Offline Sale",
                staff: req.user._id
            }], { session });

            processedItems.push({
                inventoryId: inventory._id,
                productName: inventory.productName,
                remainingStock: inventory.stock,
                soldQuantity: quantity
            });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Offline sale processed successfully",
            data: processedItems
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        
        console.error("Error processing offline sale:", error.message);
        res.status(400).json({
            success: false,
            message: error.message || "Server error"
        });
    }
};
