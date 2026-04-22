const mongoose = require("mongoose");
const Shop = require("../../models/shops/Store");
const Category = require("../../models/shops/Category");
const User = require("../../models/users/User");
const StoreDocument = require("../../models/shops/StoreDocument");
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
            ? req.files["logo"][0].path
            : null;

        const banner = req.files && req.files["banner"]
            ? req.files["banner"][0].path
            : null;

        // Construct location if provided
        let location = undefined;
        if (lng && lat) {
            location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
        }

        // Parse category to handle array format from form-data
        let parsedCategory = undefined;
        if (category) {
            if (Array.isArray(category)) {
                parsedCategory = category;
            } else if (typeof category === 'string') {
                try {
                    parsedCategory = JSON.parse(category);
                    if (!Array.isArray(parsedCategory)) parsedCategory = [parsedCategory];
                } catch(e) {
                    parsedCategory = category.split(',').map(c => c.trim()).filter(Boolean);
                }
            }
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
            category: parsedCategory,
            addharNumber,
            location,
            logo,
            banner,
        });

        const savedShop = await shop.save();
        const user = await User.findById(owner);
        user.role = "owner";
        user.isActive = false;
        user.isAdminVerified = "pending";
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
            storeType,
            businessType,
            addharNumber,
            lng,
            lat
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
            ? req.files["logo"][0].path
            : shop.logo;

        const banner = req.files && req.files["banner"]
            ? req.files["banner"][0].path
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
        if (storeType !== undefined) shop.storeType = storeType;
        if (businessType !== undefined) shop.businessType = businessType;
        if (addharNumber !== undefined) shop.addharNumber = addharNumber;

        if (category !== undefined) {
            if (Array.isArray(category)) {
                shop.category = category;
            } else if (typeof category === 'string') {
                try {
                    let parsed = JSON.parse(category);
                    shop.category = Array.isArray(parsed) ? parsed : [parsed];
                } catch(e) {
                    shop.category = category.split(',').map(c => c.trim()).filter(Boolean);
                }
            }
        }

        if (lng !== undefined && lat !== undefined) {
            shop.location = {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
        }

        shop.logo = logo;
        shop.banner = banner;
        if (shop.adminVerificationStatus === "rejected") {
            shop.adminVerificationStatus = "reuploaded";
            shop.isActive = false;
        }
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

exports.getAllStores = async (req, res) => {
    try {
        const { search, filter, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const pipeline = [
            // Join with owner
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetail"
                }
            },
            { $unwind: { path: "$ownerDetail", preserveNullAndEmptyArrays: true } },

            // Join with categories
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },

            // Join with documents
            {
                $lookup: {
                    from: "storedocuments",
                    localField: "_id",
                    foreignField: "store",
                    as: "docs"
                }
            },

            // Calculate derived status
            {
                $addFields: {
                    ownerVerified: { $eq: ["$ownerDetail.isAdminVerified", "verified"] },
                    storeVerified: { $eq: ["$adminVerificationStatus", "verified"] },
                    docsVerified: {
                        $and: [
                            // At least one verified document of required type (gst or shop_license)
                            {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: "$docs",
                                                as: "d",
                                                cond: {
                                                    $and: [
                                                        { $eq: ["$$d.verificationStatus", "verified"] },
                                                        { $in: ["$$d.documentType", ["gst", "shop_license"]] }
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    0
                                ]
                            },
                            // AND no documents are in pending/rejected/reuploaded state (all uploaded documents must be verified)
                            {
                                $eq: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: "$docs",
                                                as: "d",
                                                cond: { $ne: ["$$d.verificationStatus", "verified"] }
                                            }
                                        }
                                    },
                                    0
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $addFields: {
                    status: {
                        $cond: {
                            if: { $and: ["$ownerVerified", "$storeVerified", "$docsVerified"] },
                            then: "verified",
                            else: "unverified"
                        }
                    }
                }
            }
        ];

        // Search Match
        if (search) {
            const searchRegex = new RegExp(search, "i");
            pipeline.push({
                $match: {
                    $or: [
                        { name: searchRegex },
                        { "ownerDetail.name": searchRegex }
                    ]
                }
            });
        }

        // Filter Match
        if (filter) {
            pipeline.push({
                $match: {
                    status: filter // "verified" or "unverified"
                }
            });
        }

        // Final Projection and Pagination
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limitNum },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            ownerName: "$ownerDetail.name",
                            registeredDate: "$createdAt",
                            status: 1,
                            categories: "$categoryDetails.name"
                        }
                    }
                ]
            }
        });

        const result = await Shop.aggregate(pipeline);
        const stores = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

        res.status(200).json({
            success: true,
            message: "Stores fetched successfully",
            total,
            page: pageNum,
            limit: limitNum,
            count: stores.length,
            data: stores,
        });
    } catch (error) {
        console.error("Error fetching stores:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

exports.verifyStore = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { status, reason } = req.body;

        const validStatuses = ["pending", "verified", "rejected", "reuploaded"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const store = await Shop.findById(storeId);
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Store not found",
            });
        }

        store.adminVerificationStatus = status;
        if (status === "rejected" && reason) {
            store.adminVerificationReason = reason;
        } else if (status !== "rejected") {
            store.adminVerificationReason = undefined;
        }

        const updatedStore = await store.save();

        await AnalyticsEvent.create({
            event: "store_verification_updated",
            properties: {
                shopId: updatedStore._id,
                ownerId: updatedStore.owner,
                status,
                reason: status === "rejected" ? reason : undefined
            },
            source: "admin"
        });

        res.status(200).json({
            success: true,
            message: `Store verification status updated to ${status}`,
            data: updatedStore,
        });
    } catch (error) {
        console.error("Error verifying store:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// Get all top-level (parent) categories for shop creation selection
exports.getParentCategories = async (req, res) => {
    try {
        const categories = await Category.find({ parent: null, isActive: true }, "name slug image");

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error("Error fetching parent categories:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Get subcategories for the selected parent category IDs from shop's own category field
exports.getSubcategoriesByParent = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findById(shopId, "category");
        if (!shop) {
            return res.status(404).json({ success: false, message: "Shop not found" });
        }

        if (!shop.category || shop.category.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Fetch the actual category documents to check if they are top-level or subcategories
        const shopCategories = await Category.find(
            { _id: { $in: shop.category } },
            "name slug parent"
        );

        // Collect the true parent IDs:
        // - If a stored category has a parent → use that parent (it's already a subcategory)
        // - If a stored category has no parent → use its own _id (it's a top-level category)
        const parentIds = [...new Set(
            shopCategories.map(c => (c.parent ? c.parent.toString() : c._id.toString()))
        )].map(id => new mongoose.Types.ObjectId(id));

        // Fetch all sibling subcategories under those parent IDs
        const subcategories = await Category.find(
            { parent: { $in: parentIds }, isActive: true },
            "name slug image parent"
        ).populate("parent", "name slug");

        res.status(200).json({
            success: true,
            data: subcategories
        });
    } catch (error) {
        console.error("Error fetching subcategories:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

exports.getStoreDetailsById = async (req, res) => {
    try {
        const { storeId } = req.params;

        const store = await Shop.findById(storeId)
            .populate("owner", "-otp -otpExpiry -otpAttempts")
            .populate("category", "name slug");

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Store not found"
            });
        }

        const documents = await StoreDocument.find({ store: storeId });

        res.status(200).json({
            success: true,
            data: {
                owner: store.owner,
                store,
                documents
            }
        });
    } catch (error) {
        console.error("Error fetching store details:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
