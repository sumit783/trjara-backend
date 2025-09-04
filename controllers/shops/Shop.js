const Shop = require("../../models/shops/Shop");

exports.CreateVendorShop = async (req, res) => {
    try {
        const {
            ownerUserId,
            name,
            type,
            businessType,
            phone,
            email,
            gstin,
            pickupAddressId,
        } = req.body;

        // Validation
        if (!ownerUserId || !name || !type || !businessType) {
            return res.status(400).json({
                success: false,
                message: "ownerUserId, name, type, and businessType are required",
            });
        }

        // Get file paths from multer
        const logoUrl = req.files["logoUrl"]
            ? `/uploads/${req.files["logoUrl"][0].filename}`
            : null;

        const coverImageUrl = req.files["coverImageUrl"]
            ? `/uploads/${req.files["coverImageUrl"][0].filename}`
            : null;

        // Create shop
        const shop = new Shop({
            ownerUserId,
            name,
            type,
            businessType,
            phone,
            email,
            gstin,
            pickupAddressId,
            logoUrl,
            coverImageUrl,
        });

        const savedShop = await shop.save();

        res.status(201).json({
            success: true,
            message: "Shop created successfully",
            data: savedShop,
        });
    } catch (error) {
        console.error("Error creating shop:", error);
        res
            .status(500)
            .json({ success: false, message: "Server error", error: error.message });
    }
};



exports.EditVendorShop = async (req, res) => {
    try {
        const { shopId } = req.params;
        const {
            name,
            type,
            businessType,
            phone,
            email,
            gstin,
            pickupAddressId,
        } = req.body;

        // Check if shop exists
        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found",
            });
        }

        // Handle file updates from multer
        const logoUrl = req.files["logoUrl"]
            ? `/uploads/${req.files["logoUrl"][0].filename}`
            : shop.logoUrl;

        const coverImageUrl = req.files["coverImageUrl"]
            ? `/uploads/${req.files["coverImageUrl"][0].filename}`
            : shop.coverImageUrl;

        // Update shop fields
        shop.name = name || shop.name;
        shop.type = type || shop.type;
        shop.businessType = businessType || shop.businessType;
        shop.phone = phone || shop.phone;
        shop.email = email || shop.email;
        shop.gstin = gstin || shop.gstin;
        shop.pickupAddressId = pickupAddressId || shop.pickupAddressId;
        shop.logoUrl = logoUrl;
        shop.coverImageUrl = coverImageUrl;

        const updatedShop = await shop.save();

        res.status(200).json({
            success: true,
            message: "Shop updated successfully",
            data: updatedShop,
        });
    } catch (error) {
        console.error("Error updating shop:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};
