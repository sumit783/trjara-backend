const mongoose = require("mongoose");
const Cart = require("../../models/cart/Cart");
const CartItem = require("../../models/cart/CartItem");
const Inventory = require("../../models/shops/Inventory");
const Charge = require("../../models/charges/Charge");
const CODRule = require("../../models/charges/COD");
const Address = require("../../models/users/Address");
const Store = require("../../models/shops/Store");

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coords1 [longitude, latitude]
 * @param {Array} coords2 [longitude, latitude]
 * @returns {number} distance in km
 */
const calculateDistance = (coords1, coords2) => {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Find shortest path covering all stores and ending at user using Nearest Neighbor (Greedy)
 * @param {Object} userCoords [longitude, latitude]
 * @param {Array} stores Array of { id, coords }
 * @returns {Object} { path, totalDistance }
 */
const findShortestPath = (userCoords, stores) => {
    if (stores.length === 0) return { path: [], totalDistance: 0 };

    let unvisited = [...stores];
    let currentCoords = unvisited[0].coords; // Start at the first store's location
    let path = [unvisited.shift()];
    let totalDistance = 0;

    while (unvisited.length > 0) {
        let closestIndex = 0;
        let minDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            const dist = calculateDistance(currentCoords, unvisited[i].coords);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }

        totalDistance += minDistance;
        currentCoords = unvisited[closestIndex].coords;
        path.push(unvisited[closestIndex]);
        unvisited.splice(closestIndex, 1);
    }

    // Add distance from last store to user
    const distanceToUser = calculateDistance(currentCoords, userCoords);
    totalDistance += distanceToUser;
    return { path, totalDistance };
};

/**
 * Add products to cart
 * @route POST /api/cart/add
 * @access Private
 */
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body; // Array of { inventoryId, quantity }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Products array is required" });
        }

        // 1. Find or create cart for user
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId });
            await cart.save();
        }

        // 2. Process each item
        for (const item of items) {
            const { inventoryId, quantity } = item;

            if (!inventoryId || quantity === undefined) {
                return res.status(400).json({ success: false, message: "Inventory ID and quantity are required" });
            }

            // Fetch inventory details
            const inventory = await Inventory.findById(inventoryId);
            if (!inventory) {
                return res.status(404).json({ success: false, message: "Inventory not found" });
            }

            const productId = inventory.product; // Save the ID before population
            await inventory.populate("product");

            // Check if item already in cart
            let cartItem = await CartItem.findOne({ cartId: cart._id, inventoryId });

            if (cartItem) {
                // Update existing item
                cartItem.quantity += quantity;
                if (cartItem.quantity <= 0) {
                    await CartItem.findByIdAndDelete(cartItem._id);
                    continue;
                }
                cartItem.totalPrice = cartItem.quantity * inventory.price;
                await cartItem.save();
            } else if (quantity > 0) {
                // Create new item
                cartItem = new CartItem({
                    cartId: cart._id,
                    shopId: inventory.store,
                    productId: productId,
                    inventoryId: inventory._id,
                    name: inventory.productName || (inventory.product && inventory.product.name),
                    imageUrl: inventory.productImages && inventory.productImages[0],
                    price: inventory.price,
                    mrp: inventory.mrp,
                    quantity: quantity,
                    totalPrice: quantity * inventory.price
                });
                await cartItem.save();
            }
        }

        // 3. Recalculate cart totals
        const allItems = await CartItem.find({ cartId: cart._id });
        let itemsTotal = 0;
        allItems.forEach(item => {
            itemsTotal += item.totalPrice;
        });

        cart.itemsTotal = itemsTotal;
        cart.totalAmount = itemsTotal + cart.deliveryCharge + cart.platformCharge + cart.smallCartCharge - cart.discountAmount;

        await cart.save();

        // Populate items with variant details before sending response
        const populatedItems = await CartItem.populate(allItems, [
            { path: "productId" },
            {
                path: "inventoryId",
                populate: { path: "variant" }
            }
        ]);

        // Return cart with items
        res.status(200).json({
            success: true,
            message: "Cart updated successfully",
            data: {
                cart,
                items: populatedItems
            }
        });

    } catch (error) {
        console.error("Error in addToCart:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};/**
 * Get cart details with calculated charges
 * @route GET /api/cart
 * @access Private
 */
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Fetch cart and items
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(200).json({
                success: true,
                message: "Cart is empty",
                data: { cart: null, items: [] }
            });
        }

        const items = await CartItem.find({ cartId: cart._id });
        if (items.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Cart is empty",
                data: { cart, items: [] }
            });
        }

        // 2. Calculate Distance and Path
        // 2.1 Get User's default address
        const userAddress = await Address.findOne({ userId, isDefault: true });
        let distanceInfo = { totalDistance: 0, path: [], deliveryTime: 0, message: "" };

        if (userAddress && userAddress.location && userAddress.location.coordinates) {
            // 2.2 Get unique shop addresses
            const shopIds = [...new Set(items.filter(i => i.shopId).map(item => item.shopId.toString()))];
            const stores = await Store.find({ _id: { $in: shopIds } });

            const storeLocations = stores
                .filter(s => s.location && s.location.coordinates && Array.isArray(s.location.coordinates) && s.location.coordinates.length === 2)
                .map(s => ({
                    id: s._id,
                    name: s.name,
                    coords: s.location.coordinates
                }));

            if (storeLocations.length > 0) {
                distanceInfo = findShortestPath(userAddress.location.coordinates, storeLocations);
                
                // Calculate delivery time: max averagePackingTime + totalDistance * 2
                const maxPackingTime = Math.max(...stores.map(s => typeof s.averagePackingTime === 'number' ? s.averagePackingTime : 5));
                distanceInfo.deliveryTime = Math.round(maxPackingTime + (distanceInfo.totalDistance * 2));
            } else {
                distanceInfo.message = "No store locations found";
            }
        } else {
            distanceInfo.message = "User default address not found";
        }

        // 3. Identify context for charges
        // Use the first item's shop, product, and inventory as context for resolving charges
        const primaryItem = items[0];
        const shopId = primaryItem.shopId;
        const productId = primaryItem.productId;
        const inventoryId = primaryItem.inventoryId;

        // 3. Resolve charges based on priority and scope
        // Hierarchy: Inventory > Product > Store > Global
        const charges = await Charge.find({
            $or: [
                { scope: "Global" },
                { scope: "Store", scopeId: shopId },
                { scope: "Product", scopeId: productId },
                { scope: "Inventory", scopeId: inventoryId }
            ]
        }).sort({ priority: -1, createdAt: -1 });

        // Select the "best" charge document
        // We prioritize by scope specificity if priority is equal, but the sort handles general priority.
        const scopeWeight = { "Inventory": 4, "Product": 3, "Store": 2, "Global": 1 };

        let bestCharge = charges.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return scopeWeight[b.scope] - scopeWeight[a.scope];
        })[0];

        // If no charge found, use robust default values
        const activeCharge = bestCharge;

        // 4. Calculate Totals
        let itemsTotal = 0;
        items.forEach(item => {
            itemsTotal += item.totalPrice;
        });

        // Small Cart Charge
        let smallCartCharge = 0;
        if (activeCharge.smallCartThreshold && itemsTotal < activeCharge.smallCartThreshold) {
            smallCartCharge = activeCharge.smallCartCharge || 0;
        }

        // Platform Charge
        let platformCharge = 0;
        if (activeCharge.platformCharge) {
            if (activeCharge.platformChargeType === "percentage") {
                platformCharge = (itemsTotal * activeCharge.platformCharge) / 100;
            } else {
                platformCharge = activeCharge.platformCharge;
            }
        }

        // Delivery Charge
        let deliveryCharge = activeCharge.deliveryCharge || 0;

        // If distance exceeds base distance, add per-km charge
        if (distanceInfo.totalDistance > (activeCharge.baseDeliveryDistance || 0)) {
            const extraDistance = distanceInfo.totalDistance - (activeCharge.baseDeliveryDistance || 0);
            deliveryCharge += extraDistance * (activeCharge.perKmCharge || 0);
        }

        // Surge Charges
        let badWeatherCharge = activeCharge.badWeatherCharge || 0;

        // Final Total
        const totalAmount = itemsTotal + smallCartCharge + platformCharge + deliveryCharge + badWeatherCharge - (cart.discountAmount || 0);

        // 5. Update Cart Document
        cart.itemsTotal = itemsTotal;
        cart.smallCartCharge = smallCartCharge;
        cart.platformCharge = platformCharge;
        cart.deliveryCharge = deliveryCharge;
        cart.totalAmount = totalAmount;

        await cart.save();

        // COD Resolution
        let isCodAvailable = true;
        let codCharge = 0;
        let codDisableReason = "";
        let bestCodRule = null;

        if (items.length > 0) {
            const codRules = await CODRule.find({
                $or: [
                    { scope: "Global" },
                    { scope: "Store", scopeId: shopId },
                    { scope: "Product", scopeId: productId },
                    { scope: "Inventory", scopeId: inventoryId }
                ]
            }).sort({ priority: -1, createdAt: -1 });

            bestCodRule = codRules.sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return scopeWeight[b.scope] - scopeWeight[a.scope];
            })[0] || {
                scope: "Global",
                codEnabled: true,
                codCharge: 0,
                codChargeType: "flat",
                minCodAmount: 0,
                maxCodAmount: null,
                allowedPincodes: [],
                blockedPincodes: []
            };

            if (!bestCodRule.codEnabled) {
                isCodAvailable = false;
                codDisableReason = "COD is disabled for this store/product selection.";
            } else {
                if (itemsTotal < (bestCodRule.minCodAmount || 0)) {
                    isCodAvailable = false;
                    codDisableReason = `Minimum order amount for COD is Rs. ${bestCodRule.minCodAmount}.`;
                } else if (bestCodRule.maxCodAmount !== null && bestCodRule.maxCodAmount !== undefined && itemsTotal > bestCodRule.maxCodAmount) {
                    isCodAvailable = false;
                    codDisableReason = `Maximum order amount for COD is Rs. ${bestCodRule.maxCodAmount}.`;
                }

                if (isCodAvailable && userAddress && userAddress.pincode) {
                    const pin = userAddress.pincode.toString().trim();
                    if (bestCodRule.allowedPincodes && bestCodRule.allowedPincodes.length > 0) {
                        const isAllowed = bestCodRule.allowedPincodes.some(p => p.toString().trim() === pin);
                        if (!isAllowed) {
                            isCodAvailable = false;
                            codDisableReason = "COD is not available in your location pincode.";
                        }
                    }
                    if (isCodAvailable && bestCodRule.blockedPincodes && bestCodRule.blockedPincodes.length > 0) {
                        const isBlocked = bestCodRule.blockedPincodes.some(p => p.toString().trim() === pin);
                        if (isBlocked) {
                            isCodAvailable = false;
                            codDisableReason = "COD is blocked for your location pincode.";
                        }
                    }
                }
            }

            if (isCodAvailable && bestCodRule.codCharge) {
                if (bestCodRule.codChargeType === "percentage") {
                    codCharge = (itemsTotal * bestCodRule.codCharge) / 100;
                } else {
                    codCharge = bestCodRule.codCharge;
                }
            }
        }

        // Populate items with variant details before sending response
        const populatedItems = await CartItem.populate(items, [
            { path: "productId" },
            {
                path: "inventoryId",
                populate: { path: "variant" }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                cart,
                items: populatedItems,
                appliedCharges: {
                    scope: activeCharge.scope,
                    priority: activeCharge.priority,
                    details: activeCharge
                },
                codInfo: {
                    isCodAvailable,
                    codCharge,
                    codDisableReason
                },
                distanceInfo
            }
        });

    } catch (error) {
        console.error("Error in getCart:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Update quantity of a cart item
 * @route PUT /api/cart/update-quantity
 * @access Private
 */
exports.updateCartItemQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cartItemId, inventoryId, quantity } = req.body;

        if (quantity === undefined || typeof quantity !== "number") {
            return res.status(400).json({ success: false, message: "Valid quantity is required" });
        }

        // 1. Find user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // 2. Find cart item
        let cartItem;
        if (cartItemId) {
            cartItem = await CartItem.findOne({ _id: cartItemId, cartId: cart._id });
        } else if (inventoryId) {
            cartItem = await CartItem.findOne({ inventoryId, cartId: cart._id });
        }

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        // 3. Update quantity or delete if <= 0
        if (quantity <= 0) {
            await CartItem.findByIdAndDelete(cartItem._id);
        } else {
            // Verify stock first
            const inventory = await Inventory.findById(cartItem.inventoryId);
            if (!inventory) {
                return res.status(404).json({ success: false, message: "Product inventory not found" });
            }

            if (inventory.stock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${inventory.stock} items available in stock`
                });
            }

            cartItem.quantity = quantity;
            cartItem.totalPrice = quantity * cartItem.price;
            await cartItem.save();
        }

        // 4. Recalculate cart totals
        const allItems = await CartItem.find({ cartId: cart._id });
        let itemsTotal = 0;
        allItems.forEach(item => {
            itemsTotal += item.totalPrice;
        });

        cart.itemsTotal = itemsTotal;

        // Fetch user default address to get distance and recalculate charges
        const userAddress = await Address.findOne({ userId, isDefault: true });
        let distanceInfo = { totalDistance: 0, path: [], message: "" };

        if (userAddress && userAddress.location && userAddress.location.coordinates && allItems.length > 0) {
            const shopIds = [...new Set(allItems.filter(i => i.shopId).map(item => item.shopId.toString()))];
            const stores = await Store.find({ _id: { $in: shopIds } });

            const storeLocations = stores
                .filter(s => s.location && s.location.coordinates && Array.isArray(s.location.coordinates) && s.location.coordinates.length === 2)
                .map(s => ({
                    id: s._id,
                    name: s.name,
                    coords: s.location.coordinates
                }));

            if (storeLocations.length > 0) {
                distanceInfo = findShortestPath(userAddress.location.coordinates, storeLocations);
            }
        }

        let smallCartCharge = 0;
        let platformCharge = 0;
        let deliveryCharge = 0;
        let badWeatherCharge = 0;
        let activeCharge = null;

        if (allItems.length > 0) {
            const primaryItem = allItems[0];
            const shopId = primaryItem.shopId;
            const productId = primaryItem.productId;
            const inventoryId = primaryItem.inventoryId;

            const charges = await Charge.find({
                $or: [
                    { scope: "Global" },
                    { scope: "Store", scopeId: shopId },
                    { scope: "Product", scopeId: productId },
                    { scope: "Inventory", scopeId: inventoryId }
                ]
            }).sort({ priority: -1, createdAt: -1 });

            const scopeWeight = { "Inventory": 4, "Product": 3, "Store": 2, "Global": 1 };

            const bestCharge = charges.sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return scopeWeight[b.scope] - scopeWeight[a.scope];
            })[0];

            activeCharge = bestCharge || {
                scope: "Global",
                deliveryCharge: 30,
                baseDeliveryDistance: 3,
                perKmCharge: 10,
                platformCharge: 2,
                platformChargeType: "flat",
                smallCartThreshold: 100,
                smallCartCharge: 15
            };

            if (activeCharge.smallCartThreshold && itemsTotal < activeCharge.smallCartThreshold) {
                smallCartCharge = activeCharge.smallCartCharge || 0;
            }

            if (activeCharge.platformCharge) {
                if (activeCharge.platformChargeType === "percentage") {
                    platformCharge = (itemsTotal * activeCharge.platformCharge) / 100;
                } else {
                    platformCharge = activeCharge.platformCharge;
                }
            }

            deliveryCharge = activeCharge.deliveryCharge || 0;
            if (distanceInfo.totalDistance > (activeCharge.baseDeliveryDistance || 0)) {
                const extraDistance = distanceInfo.totalDistance - (activeCharge.baseDeliveryDistance || 0);
                deliveryCharge += extraDistance * (activeCharge.perKmCharge || 0);
            }

            badWeatherCharge = activeCharge.badWeatherCharge || 0;
        }

        const totalAmount = itemsTotal + smallCartCharge + platformCharge + deliveryCharge + badWeatherCharge - (cart.discountAmount || 0);

        cart.smallCartCharge = smallCartCharge;
        cart.platformCharge = platformCharge;
        cart.deliveryCharge = deliveryCharge;
        cart.totalAmount = totalAmount;

        await cart.save();

        // COD Resolution
        let isCodAvailable = true;
        let codCharge = 0;
        let codDisableReason = "";
        let bestCodRule = null;

        if (allItems.length > 0) {
            const primaryItem = allItems[0];
            const shopId = primaryItem.shopId;
            const productId = primaryItem.productId;
            const inventoryId = primaryItem.inventoryId;
            const scopeWeight = { "Inventory": 4, "Product": 3, "Store": 2, "Global": 1 };

            const codRules = await CODRule.find({
                $or: [
                    { scope: "Global" },
                    { scope: "Store", scopeId: shopId },
                    { scope: "Product", scopeId: productId },
                    { scope: "Inventory", scopeId: inventoryId }
                ]
            }).sort({ priority: -1, createdAt: -1 });

            bestCodRule = codRules.sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return scopeWeight[b.scope] - scopeWeight[a.scope];
            })[0] || {
                scope: "Global",
                codEnabled: true,
                codCharge: 0,
                codChargeType: "flat",
                minCodAmount: 0,
                maxCodAmount: null,
                allowedPincodes: [],
                blockedPincodes: []
            };

            if (!bestCodRule.codEnabled) {
                isCodAvailable = false;
                codDisableReason = "COD is disabled for this store/product selection.";
            } else {
                if (itemsTotal < (bestCodRule.minCodAmount || 0)) {
                    isCodAvailable = false;
                    codDisableReason = `Minimum order amount for COD is Rs. ${bestCodRule.minCodAmount}.`;
                } else if (bestCodRule.maxCodAmount !== null && bestCodRule.maxCodAmount !== undefined && itemsTotal > bestCodRule.maxCodAmount) {
                    isCodAvailable = false;
                    codDisableReason = `Maximum order amount for COD is Rs. ${bestCodRule.maxCodAmount}.`;
                }

                if (isCodAvailable && userAddress && userAddress.pincode) {
                    const pin = userAddress.pincode.toString().trim();
                    if (bestCodRule.allowedPincodes && bestCodRule.allowedPincodes.length > 0) {
                        const isAllowed = bestCodRule.allowedPincodes.some(p => p.toString().trim() === pin);
                        if (!isAllowed) {
                            isCodAvailable = false;
                            codDisableReason = "COD is not available in your location pincode.";
                        }
                    }
                    if (isCodAvailable && bestCodRule.blockedPincodes && bestCodRule.blockedPincodes.length > 0) {
                        const isBlocked = bestCodRule.blockedPincodes.some(p => p.toString().trim() === pin);
                        if (isBlocked) {
                            isCodAvailable = false;
                            codDisableReason = "COD is blocked for your location pincode.";
                        }
                    }
                }
            }

            if (isCodAvailable && bestCodRule.codCharge) {
                if (bestCodRule.codChargeType === "percentage") {
                    codCharge = (itemsTotal * bestCodRule.codCharge) / 100;
                } else {
                    codCharge = bestCodRule.codCharge;
                }
            }
        }

        // Populate items with variant details before sending response
        const populatedItems = await CartItem.populate(allItems, [
            { path: "productId" },
            {
                path: "inventoryId",
                populate: { path: "variant" }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Cart quantity updated successfully",
            data: {
                cart,
                items: populatedItems,
                appliedCharges: activeCharge ? {
                    scope: activeCharge.scope,
                    priority: activeCharge.priority,
                    details: activeCharge
                } : { details: {} },
                codInfo: {
                    isCodAvailable,
                    codCharge,
                    codDisableReason,
                    appliedRule: bestCodRule
                },
                distanceInfo
            }
        });

    } catch (error) {
        console.error("Error in updateCartItemQuantity:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Remove an item from the cart completely
 * @route DELETE /api/cart/item/:cartItemId
 * @access Private
 */
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cartItemId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
            return res.status(400).json({ success: false, message: "Invalid cart item ID" });
        }

        // 1. Find user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // 2. Find and delete cart item
        const deletedItem = await CartItem.findOneAndDelete({ _id: cartItemId, cartId: cart._id });
        if (!deletedItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        // 3. Recalculate cart totals
        const allItems = await CartItem.find({ cartId: cart._id });
        let itemsTotal = 0;
        allItems.forEach(item => {
            itemsTotal += item.totalPrice;
        });

        cart.itemsTotal = itemsTotal;

        // Fetch user default address to get distance and recalculate charges
        const userAddress = await Address.findOne({ userId, isDefault: true });
        let distanceInfo = { totalDistance: 0, path: [], message: "" };

        if (userAddress && userAddress.location && userAddress.location.coordinates && allItems.length > 0) {
            const shopIds = [...new Set(allItems.filter(i => i.shopId).map(item => item.shopId.toString()))];
            const stores = await Store.find({ _id: { $in: shopIds } });

            const storeLocations = stores
                .filter(s => s.location && s.location.coordinates && Array.isArray(s.location.coordinates) && s.location.coordinates.length === 2)
                .map(s => ({
                    id: s._id,
                    name: s.name,
                    coords: s.location.coordinates
                }));

            if (storeLocations.length > 0) {
                distanceInfo = findShortestPath(userAddress.location.coordinates, storeLocations);
            }
        }

        let smallCartCharge = 0;
        let platformCharge = 0;
        let deliveryCharge = 0;
        let badWeatherCharge = 0;
        let activeCharge = null;

        // COD calculations
        let isCodAvailable = true;
        let codCharge = 0;
        let codDisableReason = "";
        let bestCodRule = null;

        if (allItems.length > 0) {
            const primaryItem = allItems[0];
            const shopId = primaryItem.shopId;
            const productId = primaryItem.productId;
            const inventoryId = primaryItem.inventoryId;
            const scopeWeight = { "Inventory": 4, "Product": 3, "Store": 2, "Global": 1 };

            const charges = await Charge.find({
                $or: [
                    { scope: "Global" },
                    { scope: "Store", scopeId: shopId },
                    { scope: "Product", scopeId: productId },
                    { scope: "Inventory", scopeId: inventoryId }
                ]
            }).sort({ priority: -1, createdAt: -1 });

            const bestCharge = charges.sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return scopeWeight[b.scope] - scopeWeight[a.scope];
            })[0];

            activeCharge = bestCharge || {
                scope: "Global",
                deliveryCharge: 30,
                baseDeliveryDistance: 3,
                perKmCharge: 10,
                platformCharge: 2,
                platformChargeType: "flat",
                smallCartThreshold: 100,
                smallCartCharge: 15
            };

            if (activeCharge.smallCartThreshold && itemsTotal < activeCharge.smallCartThreshold) {
                smallCartCharge = activeCharge.smallCartCharge || 0;
            }

            if (activeCharge.platformCharge) {
                if (activeCharge.platformChargeType === "percentage") {
                    platformCharge = (itemsTotal * activeCharge.platformCharge) / 100;
                } else {
                    platformCharge = activeCharge.platformCharge;
                }
            }

            deliveryCharge = activeCharge.deliveryCharge || 0;
            if (distanceInfo.totalDistance > (activeCharge.baseDeliveryDistance || 0)) {
                const extraDistance = distanceInfo.totalDistance - (activeCharge.baseDeliveryDistance || 0);
                deliveryCharge += extraDistance * (activeCharge.perKmCharge || 0);
            }

            badWeatherCharge = activeCharge.badWeatherCharge || 0;

            // COD Resolution
            const codRules = await CODRule.find({
                $or: [
                    { scope: "Global" },
                    { scope: "Store", scopeId: shopId },
                    { scope: "Product", scopeId: productId },
                    { scope: "Inventory", scopeId: inventoryId }
                ]
            }).sort({ priority: -1, createdAt: -1 });

            bestCodRule = codRules.sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return scopeWeight[b.scope] - scopeWeight[a.scope];
            })[0] || {
                scope: "Global",
                codEnabled: true,
                codCharge: 0,
                codChargeType: "flat",
                minCodAmount: 0,
                maxCodAmount: null,
                allowedPincodes: [],
                blockedPincodes: []
            };

            if (!bestCodRule.codEnabled) {
                isCodAvailable = false;
                codDisableReason = "COD is disabled for this store/product selection.";
            } else {
                if (itemsTotal < (bestCodRule.minCodAmount || 0)) {
                    isCodAvailable = false;
                    codDisableReason = `Minimum order amount for COD is Rs. ${bestCodRule.minCodAmount}.`;
                } else if (bestCodRule.maxCodAmount !== null && bestCodRule.maxCodAmount !== undefined && itemsTotal > bestCodRule.maxCodAmount) {
                    isCodAvailable = false;
                    codDisableReason = `Maximum order amount for COD is Rs. ${bestCodRule.maxCodAmount}.`;
                }

                if (isCodAvailable && userAddress && userAddress.pincode) {
                    const pin = userAddress.pincode.toString().trim();
                    if (bestCodRule.allowedPincodes && bestCodRule.allowedPincodes.length > 0) {
                        const isAllowed = bestCodRule.allowedPincodes.some(p => p.toString().trim() === pin);
                        if (!isAllowed) {
                            isCodAvailable = false;
                            codDisableReason = "COD is not available in your location pincode.";
                        }
                    }
                    if (isCodAvailable && bestCodRule.blockedPincodes && bestCodRule.blockedPincodes.length > 0) {
                        const isBlocked = bestCodRule.blockedPincodes.some(p => p.toString().trim() === pin);
                        if (isBlocked) {
                            isCodAvailable = false;
                            codDisableReason = "COD is blocked for your location pincode.";
                        }
                    }
                }
            }

            if (isCodAvailable && bestCodRule.codCharge) {
                if (bestCodRule.codChargeType === "percentage") {
                    codCharge = (itemsTotal * bestCodRule.codCharge) / 100;
                } else {
                    codCharge = bestCodRule.codCharge;
                }
            }
        }

        const totalAmount = itemsTotal + smallCartCharge + platformCharge + deliveryCharge + badWeatherCharge - (cart.discountAmount || 0);

        cart.smallCartCharge = smallCartCharge;
        cart.platformCharge = platformCharge;
        cart.deliveryCharge = deliveryCharge;
        cart.totalAmount = totalAmount;

        await cart.save();

        // Populate items with variant details before sending response
        const populatedItems = await CartItem.populate(allItems, [
            { path: "productId" },
            {
                path: "inventoryId",
                populate: { path: "variant" }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Item removed from cart successfully",
            data: {
                cart,
                items: populatedItems,
                appliedCharges: activeCharge ? {
                    scope: activeCharge.scope,
                    priority: activeCharge.priority,
                    details: activeCharge
                } : { details: {} },
                codInfo: {
                    isCodAvailable,
                    codCharge,
                    codDisableReason,
                    appliedRule: bestCodRule
                },
                distanceInfo
            }
        });

    } catch (error) {
        console.error("Error in removeFromCart:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

