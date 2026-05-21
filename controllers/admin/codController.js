const CODRule = require("../../models/charges/COD");
const Store = require("../../models/shops/Store");
const Product = require("../../models/shops/Product");
const Inventory = require("../../models/shops/Inventory");

/**
 * @desc    Create a new COD rule (Global, Store, Product, or Inventory)
 * @route   POST /api/admin/cod-rules
 * @access  Private (Admin only)
 */
exports.createCODRule = async (req, res) => {
    try {
        const { scope, scopeId } = req.body;

        const ruleData = {
            ...req.body,
            scope: scope || "Global",
            scopeId: scopeId || null
        };

        const codRule = new CODRule(ruleData);
        await codRule.save();

        res.status(201).json({
            success: true,
            message: `${codRule.scope} COD rule created successfully`,
            data: codRule
        });
    } catch (error) {
        console.error("Error in createCODRule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create COD rule",
            error: error.message
        });
    }
};

/**
 * @desc    Get COD rules (filtered by scope, scopeId, etc.)
 * @route   GET /api/admin/cod-rules
 * @access  Private (Admin only)
 */
exports.getCODRules = async (req, res) => {
    try {
        let { scope, scopeId, includeGlobal, codEnabled } = req.query;
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

        if (codEnabled !== undefined) {
            filter.codEnabled = codEnabled === "true";
        }

        // 2. Fetch COD Rules
        const codRules = await CODRule.find(filter).sort({ createdAt: -1 }).lean();

        // 3. Selective Population
        const populatedData = await Promise.all(codRules.map(async (rule) => {
            if (!rule.scopeId || rule.scope === "Global") {
                return rule;
            }

            try {
                const populateOptions = {
                    path: 'scopeId'
                };

                if (rule.scope === 'Shop') {
                    populateOptions.model = 'Store';
                }

                if (rule.scope === 'Store' || rule.scope === 'Shop') {
                    populateOptions.select = 'name owner';
                    populateOptions.populate = {
                        path: 'owner',
                        select: 'name'
                    };
                } else if (rule.scope === 'Product') {
                    populateOptions.select = 'name shop';
                    populateOptions.populate = {
                        path: 'shop',
                        select: 'name'
                    };
                } else if (rule.scope === 'Inventory') {
                    populateOptions.select = 'store product';
                    populateOptions.populate = [
                        { path: 'store', select: 'name' },
                        { path: 'product', select: 'name' }
                    ];
                }

                return await CODRule.populate(rule, populateOptions);
            } catch (popError) {
                console.error(`Population failed for COD rule ${rule._id}:`, popError.message);
                return rule;
            }
        }));

        res.json({
            success: true,
            count: populatedData.length,
            data: populatedData
        });
    } catch (error) {
        console.error("Error in getCODRules:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve COD rules",
            error: error.message
        });
    }
};

/**
 * @desc    Get a single COD rule by ID with full population
 * @route   GET /api/admin/cod-rules/:id
 * @access  Private (Admin only)
 */
exports.getCODRuleById = async (req, res) => {
    try {
        const { id } = req.params;
        const codRule = await CODRule.findById(id).lean();

        if (!codRule) {
            return res.status(404).json({
                success: false,
                message: "COD rule not found"
            });
        }

        let populatedRule = codRule;
        if (codRule.scopeId && codRule.scope !== "Global") {
            const populateOptions = {
                path: 'scopeId'
            };

            if (codRule.scope === 'Shop') {
                populateOptions.model = 'Store';
            }

            if (codRule.scope === 'Store' || codRule.scope === 'Shop') {
                populateOptions.populate = {
                    path: 'owner'
                };
            } else if (codRule.scope === 'Product') {
                populateOptions.populate = [
                    { path: 'shop' },
                    { path: 'category' }
                ];
            } else if (codRule.scope === 'Inventory') {
                populateOptions.populate = [
                    { path: 'store' },
                    { path: 'product' },
                    { path: 'variant' }
                ];
            }

            populatedRule = await CODRule.populate(codRule, populateOptions);
        }

        res.json({
            success: true,
            data: populatedRule
        });
    } catch (error) {
        console.error("Error in getCODRuleById:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve COD rule details",
            error: error.message
        });
    }
};

/**
 * @desc    Update a COD rule
 * @route   PUT /api/admin/cod-rules/:id
 * @access  Private (Admin only)
 */
exports.updateCODRule = async (req, res) => {
    try {
        const { id } = req.params;
        const codRule = await CODRule.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

        if (!codRule) {
            return res.status(404).json({
                success: false,
                message: "COD rule not found"
            });
        }

        res.json({
            success: true,
            message: "COD rule updated successfully",
            data: codRule
        });
    } catch (error) {
        console.error("Error in updateCODRule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update COD rule",
            error: error.message
        });
    }
};

/**
 * @desc    Delete a COD rule
 * @route   DELETE /api/admin/cod-rules/:id
 * @access  Private (Admin only)
 */
exports.deleteCODRule = async (req, res) => {
    try {
        const { id } = req.params;
        const codRule = await CODRule.findByIdAndDelete(id);

        if (!codRule) {
            return res.status(404).json({
                success: false,
                message: "COD rule not found"
            });
        }

        res.json({
            success: true,
            message: "COD rule deleted successfully"
        });
    } catch (error) {
        console.error("Error in deleteCODRule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete COD rule",
            error: error.message
        });
    }
};

/**
 * @desc    Get all stores with their specific COD rules
 * @route   GET /api/admin/cod-rules/stores
 * @access  Private (Admin only)
 */
exports.getStoresWithCODRules = async (req, res) => {
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
                    from: "codrules",
                    localField: "_id",
                    foreignField: "scopeId",
                    pipeline: [
                        { $match: { scope: "Store" } }
                    ],
                    as: "codRules"
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
        console.error("Error in getStoresWithCODRules:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve stores with COD rules",
            error: error.message
        });
    }
};

/**
 * @desc    Get all products with their specific COD rules
 * @route   GET /api/admin/cod-rules/products
 * @access  Private (Admin only)
 */
exports.getProductsWithCODRules = async (req, res) => {
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
                    from: "codrules",
                    localField: "_id",
                    foreignField: "scopeId",
                    pipeline: [
                        { $match: { scope: "Product" } }
                    ],
                    as: "codRules"
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
        console.error("Error in getProductsWithCODRules:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve products with COD rules",
            error: error.message
        });
    }
};

/**
 * @desc    Get all inventory items with their specific COD rules
 * @route   GET /api/admin/cod-rules/inventories
 * @access  Private (Admin only)
 */
exports.getInventoriesWithCODRules = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let match = {};
        if (search) {
            match.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: "codrules",
                    localField: "_id",
                    foreignField: "scopeId",
                    pipeline: [
                        { $match: { scope: "Inventory" } }
                    ],
                    as: "codRules"
                }
            },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $sort: { productName: 1 } },
                        { $skip: skip },
                        { $limit: parseInt(limit) }
                    ]
                }
            }
        ];

        const result = await Inventory.aggregate(pipeline);
        const inventories = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

        res.json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            count: inventories.length,
            data: inventories
        });
    } catch (error) {
        console.error("Error in getInventoriesWithCODRules:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory items with COD rules",
            error: error.message
        });
    }
};

