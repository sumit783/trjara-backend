const Shop = require("../../models/shops/Store");
const User = require("../../models/users/User");
const AnalyticsEvent = require("../../models/logs/AnalyticsEvent");

exports.CreateVendorShop = async (req, res) => {
    try {
        const owner = req.user._id;

        const {
            name,
            phone,
            email,
            description,
            address,
            city,
            state,
            pincode,
            category,
            storeType,
            businessType,
            addharNumber,
            addressNumber,
            lng,
            lat
        } = req.body;

        // Validation
        if (!owner || !name) {
            return res.status(400).json({
                success: false,
                message: "owner and name are required",
            });
        }

        // Get file paths from multer
        const logo = req.files && req.files["logo"]
            ? `/uploads/${req.files["logo"][0].filename}`
            : null;

        const banner = req.files && req.files["banner"]
            ? `/uploads/${req.files["banner"][0].filename}`
            : null;

        // Construct location if provided
        let location = undefined;
        if (lng && lat) {
            location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
        }

        // Create shop
        const shop = new Shop({
            owner,
            name,
            phone,
            email,
            description,
            address,
            city,
            state,
            pincode,
            storeType,
            businessType,
            category: category || undefined,
            addressNumber,
            addharNumber,
            location,
            logo,
            banner,
        });

        const savedShop = await shop.save();
        const user = await User.findById(owner);
        user.role = "owner";
        await user.save();

        await AnalyticsEvent.create({
            event: "shop_created",
            properties: { shopId: savedShop._id, ownerId: owner },
            source: req.headers["x-source"] || "web"
        });

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
            phone,
            email,
            description,
            address,
            city,
            state,
            pincode,
            category,
            lng,
            lat,
            addharNumber,
            isOpen,
            isActive
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
        const logo = req.files && req.files["logo"]
            ? `/uploads/${req.files["logo"][0].filename}`
            : shop.logo;

        const banner = req.files && req.files["banner"]
            ? `/uploads/${req.files["banner"][0].filename}`
            : shop.banner;

        // Update shop fields
        if (name !== undefined) shop.name = name;
        if (phone !== undefined) shop.phone = phone;
        if (email !== undefined) shop.email = email;
        if (description !== undefined) shop.description = description;
        if (address !== undefined) shop.address = address;
        if (city !== undefined) shop.city = city;
        if (state !== undefined) shop.state = state;
        if (pincode !== undefined) shop.pincode = pincode;
        if (category !== undefined) shop.category = category;
        if (isOpen !== undefined) shop.isOpen = isOpen;
        if (isActive !== undefined) shop.isActive = isActive;
        
        if (lng !== undefined && lat !== undefined) {
            shop.location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
        }

        shop.logo = logo;
        shop.banner = banner;

        const updatedShop = await shop.save();

        await AnalyticsEvent.create({
            event: "shop_updated",
            properties: { shopId: updatedShop._id, ownerId: updatedShop.owner },
            source: req.headers["x-source"] || "web"
        });

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

