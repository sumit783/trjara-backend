const Charge = require("../../models/charges/Charge");
const Store = require("../../models/shops/Store");
const Product = require("../../models/shops/Product");
const mongoose = require("mongoose");

/**
 * @desc    Create a new charge (Global, Shop, Product, or Inventory)
 * @route   POST /api/admin/charges
 * @access  Private (Admin only)
 */
exports.createCharge = async (req, res) => {
    try {
        const { scope, scopeId } = req.body;

        const chargeData = {
            ...req.body,
            scope: scope || "Global",
            scopeId: scopeId || null
        };

        const charge = new Charge(chargeData);
        await charge.save();

        res.status(201).json({
            success: true,
            message: `${charge.scope} charge created successfully`,
            data: charge
        });
    } catch (error) {
        console.error("Error in createCharge:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create charge",
            error: error.message
        });
    }
};

/**
 * @desc    Get charges (filtered by scope and scopeId)
 * @route   GET /api/admin/charges
 * @access  Private (Admin only)
 */
/**
 * @desc    Get charges (filtered by scope and scopeId)
 * @route   GET /api/admin/charges
 * @access  Private (Admin only)
 */
exports.getCharges = async (req, res) => {
    try {
        let { scope, scopeId, includeGlobal } = req.query;
        let filter = {};

        // 1. Normalize and Build Filter
        if (scope) {
            const scopeMap = {
                'store': 'Store',
                'shop': 'Store',
                'global': 'Global',
                'product': 'Product',
                'inventory': 'Inventory'
            };

            const rawScopes = scope.split(",").map(s => s.trim().toLowerCase());
            const normalizedScopes = [...new Set(rawScopes.map(s => scopeMap[s] || s.charAt(0).toUpperCase() + s.slice(1)))];
            
            // Handle legacy 'Shop' data if 'Store' is requested
            if (normalizedScopes.includes('Store') && !normalizedScopes.includes('Shop')) {
                normalizedScopes.push('Shop');
            }

            if (includeGlobal === "true" && !normalizedScopes.includes("Global")) {
                normalizedScopes.push("Global");
            }
            filter.scope = { $in: normalizedScopes };
        } else if (includeGlobal === "true") {
            filter.scope = "Global";
        }

        if (scopeId) {
            const ids = scopeId.split(",").map(id => id.trim()).filter(Boolean);
            if (includeGlobal === "true") {
                filter.$or = [
                    { scopeId: { $in: ids } },
                    { scopeId: null },
                    { scope: "Global" }
                ];
                // If we have a scope filter, we need to make sure it's respected in the OR
                // or just remove it if the OR covers everything we need.
                // If 'scope' was 'Store', we want (Store AND ID) OR (Global).
                if (filter.scope) {
                    const currentScopes = filter.scope.$in;
                    filter.$or = [
                        { scope: { $in: currentScopes }, scopeId: { $in: ids } },
                        { scope: "Global" }
                    ];
                    delete filter.scope;
                }
            } else {
                filter.scopeId = { $in: ids };
            }
        } else if (scope === "Global") {
            filter.scopeId = null;
        }

        // 2. Fetch Charges
        const charges = await Charge.find(filter).sort({ createdAt: -1 }).lean();

        // 3. Selective Population
        // We only want to populate scopeId if scope is NOT 'Global'
        // And only populate 'owner' if scope is 'Store'
        const populatedData = await Promise.all(charges.map(async (charge) => {
            if (!charge.scopeId || charge.scope === "Global") {
                return charge;
            }

            try {
                // Define population options based on scope
                const populateOptions = {
                    path: 'scopeId'
                };

                // If scope is 'Shop', it should actually use the 'Store' model for population
                if (charge.scope === 'Shop') {
                    populateOptions.model = 'Store';
                }

                if (charge.scope === 'Store' || charge.scope === 'Shop') {
                    populateOptions.select = 'name owner';
                    populateOptions.populate = {
                        path: 'owner',
                        select: 'name'
                    };
                } else if (charge.scope === 'Product') {
                    // Populate the shop (Store) inside the Product
                    populateOptions.select = 'name shop';
                    populateOptions.populate = {
                        path: 'shop',
                        select: 'name'
                    };
                } else if (charge.scope === 'Inventory') {
                    // Populate both store and product inside the Inventory
                    populateOptions.select = 'store product';
                    populateOptions.populate = [
                        { path: 'store', select: 'name' },
                        { path: 'product', select: 'name' }
                    ];
                }

                return await Charge.populate(charge, populateOptions);
            } catch (popError) {
                console.error(`Population failed for charge ${charge._id}:`, popError.message);
                return charge; // Return unpopulated if it fails
            }
        }));

        res.json({
            success: true,
            count: populatedData.length,
            data: populatedData
        });
    } catch (error) {
        console.error("Error in getCharges:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve charges",
            error: error.message
        });
    }
};

/**
 * @desc    Update a charge
 * @route   PUT /api/admin/charges/:id
 * @access  Private (Admin only)
 */
exports.updateCharge = async (req, res) => {
    try {
        const { id } = req.params;
        const charge = await Charge.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

        if (!charge) {
            return res.status(404).json({
                success: false,
                message: "Charge not found"
            });
        }

        res.json({
            success: true,
            message: "Charge updated successfully",
            data: charge
        });
    } catch (error) {
        console.error("Error in updateCharge:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update charge",
            error: error.message
        });
    }
};

/**
 * @desc    Delete a charge
 * @route   DELETE /api/admin/charges/:id
 * @access  Private (Admin only)
 */
exports.deleteCharge = async (req, res) => {
    try {
        const { id } = req.params;
        const charge = await Charge.findByIdAndDelete(id);

        if (!charge) {
            return res.status(404).json({
                success: false,
                message: "Charge not found"
            });
        }

        res.json({
            success: true,
            message: "Charge deleted successfully"
        });
    } catch (error) {
        console.error("Error in deleteCharge:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete charge",
            error: error.message
        });
    }
};

/**
 * @desc    Get all stores with their specific charges
 * @route   GET /api/admin/charges/stores
 * @access  Private (Admin only)
 */
exports.getStoresWithCharges = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let match = {};
        if (search) {
            match.name = { $regex: search, $options: 'i' };
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: "charges",
                    localField: "_id",
                    foreignField: "scopeId",
                    pipeline: [
                        { $match: { scope: "Store" } }
                    ],
                    as: "charges"
                }
            },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $sort: { name: 1 } },
                        { $skip: skip },
                        { $limit: parseInt(limit) }
                    ]
                }
            }
        ];

        const result = await Store.aggregate(pipeline);
        const stores = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

        res.json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            count: stores.length,
            data: stores
        });
    } catch (error) {
        console.error("Error in getStoresWithCharges:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve stores with charges",
            error: error.message
        });
    }
};

/**
 * @desc    Get all products with their specific charges
 * @route   GET /api/admin/charges/products
 * @access  Private (Admin only)
 */
exports.getProductsWithCharges = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let match = {};
        if (search) {
            match.name = { $regex: search, $options: 'i' };
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: "charges",
                    localField: "_id",
                    foreignField: "scopeId",
                    pipeline: [
                        { $match: { scope: "Product" } }
                    ],
                    as: "charges"
                }
            },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $sort: { name: 1 } },
                        { $skip: skip },
                        { $limit: parseInt(limit) }
                    ]
                }
            }
        ];

        const result = await Product.aggregate(pipeline);
        const products = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

        res.json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error("Error in getProductsWithCharges:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve products with charges",
            error: error.message
        });
    }
};
