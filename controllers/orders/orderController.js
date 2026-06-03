const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../../models/orders/Order");
const OrderItem = require("../../models/orders/OrderItem");
const Payment = require("../../models/finance/Payment");
const Cart = require("../../models/cart/Cart");
const CartItem = require("../../models/cart/CartItem");
const Inventory = require("../../models/shops/Inventory");
const Store = require("../../models/shops/Store");
const Address = require("../../models/users/Address");
const Charge = require("../../models/charges/Charge");
const CODRule = require("../../models/charges/COD");
const generateCustomId = require("../../utils/idGenerator");

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
 * Checkout Cart and Initiate Payment (Razorpay Order creation or COD Order creation)
 * @route POST /api/orders/checkout
 * @access Private
 */
exports.checkoutOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentMethod, addressId } = req.body;

        if (!paymentMethod || !["COD", "ONLINE"].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: "Valid paymentMethod ('COD' or 'ONLINE') is required" });
        }

        // 1. Fetch Cart and Cart Items
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

                const items = await CartItem.find({ cartId: cart._id }).populate({
            path: "inventoryId",
            populate: { path: "variant" }
        });
        if (items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        // 2. Fetch shipping address
        const targetAddressId = addressId || cart.addressId || req.user.defaultAddressId;
        if (!targetAddressId) {
            return res.status(400).json({ success: false, message: "Shipping address is required. Please set or provide an address." });
        }

        const userAddress = await Address.findById(targetAddressId);
        if (!userAddress) {
            return res.status(404).json({ success: false, message: "Shipping address not found" });
        }

        // 3. Real-time Stock Verification
        for (const item of items) {
            const inventory = item.inventoryId;
            if (!inventory) {
                return res.status(404).json({ success: false, message: `Product inventory not found for: ${item.name}` });
            }
            if (inventory.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Stock unavailable for ${item.name}. Only ${inventory.stock} units available in stock.`
                });
            }
        }

        // 4. Recalculate Distance & Path
        const shopIds = [...new Set(items.filter(i => i.shopId).map(item => item.shopId.toString()))];
        const stores = await Store.find({ _id: { $in: shopIds } });

        const storeLocations = stores
            .filter(s => s.location && s.location.coordinates && Array.isArray(s.location.coordinates) && s.location.coordinates.length === 2)
            .map(s => ({
                id: s._id,
                name: s.name,
                coords: s.location.coordinates
            }));

        let distanceInfo = { totalDistance: 0, path: [], message: "" };
        let deliveryTime = 0;
        if (userAddress.location && userAddress.location.coordinates && storeLocations.length > 0) {
            distanceInfo = findShortestPath(userAddress.location.coordinates, storeLocations);

            // Calculate delivery time: max averagePackingTime + totalDistance * 2
            const maxPackingTime = Math.max(...stores.map(s => typeof s.averagePackingTime === 'number' ? s.averagePackingTime : 5));
            deliveryTime = Math.round(maxPackingTime + (distanceInfo.totalDistance * 2));
        } else {
            distanceInfo.message = "Could not resolve store/user coordinates for distance calculation";
        }

        // 5. Resolve Charges (Confirm prices on backend)
        const primaryItem = items[0];
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
        const activeCharge = charges.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return scopeWeight[b.scope] - scopeWeight[a.scope];
        })[0] || {
            scope: "Global",
            deliveryCharge: 30,
            baseDeliveryDistance: 3,
            perKmCharge: 10,
            platformCharge: 2,
            platformChargeType: "flat",
            smallCartThreshold: 100,
            smallCartCharge: 15
        };

        // Recalculate Totals
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
        if (distanceInfo.totalDistance > (activeCharge.baseDeliveryDistance || 0)) {
            const extraDistance = distanceInfo.totalDistance - (activeCharge.baseDeliveryDistance || 0);
            deliveryCharge += extraDistance * (activeCharge.perKmCharge || 0);
        }

        // Surge Charges
        const badWeatherCharge = activeCharge.badWeatherCharge || 0;

        // Final Total
        let totalAmount = itemsTotal + smallCartCharge + platformCharge + deliveryCharge + badWeatherCharge - (cart.discountAmount || 0);

        // Map Items to OrderItem schema format
        const orderItems = items.map(item => {
            const inv = item.inventoryId;
            let color = "";
            let size = "";
            let weight = "";

            if (inv) {
                // Try from inventory's variantOptions map
                if (inv.variantOptions) {
                    const opts = inv.variantOptions instanceof Map ? inv.variantOptions : new Map(Object.entries(inv.variantOptions));
                    color = opts.get ? (opts.get("color") || opts.get("Color")) : (opts.color || opts.Color || "");
                    size = opts.get ? (opts.get("size") || opts.get("Size")) : (opts.size || opts.Size || "");
                }

                // Fallback to populated ProductVariant options
                if ((!color || !size) && inv.variant && inv.variant.options) {
                    const opts = inv.variant.options instanceof Map ? inv.variant.options : new Map(Object.entries(inv.variant.options));
                    if (!color) color = opts.get ? (opts.get("color") || opts.get("Color")) : (opts.color || opts.Color || "");
                    if (!size) size = opts.get ? (opts.get("size") || opts.get("Size")) : (opts.size || opts.Size || "");
                }

                // Set weight
                if (inv.weight) {
                    weight = `${inv.weight} ${inv.weightUnit || ""}`.trim();
                }
            }

            // Fallback for color if still empty
            if (!color) {
                color = item.variantName || "";
            }

            return {
                productId: item.productId,
                inventoryId: inv._id || inv,
                name: item.name,
                image: item.imageUrl,
                variant: {
                    color,
                    size,
                    weight
                },
                price: item.price,
                quantity: item.quantity,
                total: item.totalPrice
            };
        });

        // Generate Order Number
        const orderNumber = generateCustomId("ORD");

        // COD PAYMENT FLOW
        if (paymentMethod === "COD") {
            // Verify COD Availability
            const codRules = await CODRule.find({
                $or: [
                    { scope: "Global" },
                    { scope: "Store", scopeId: shopId },
                    { scope: "Product", scopeId: productId },
                    { scope: "Inventory", scopeId: inventoryId }
                ]
            }).sort({ priority: -1, createdAt: -1 });

            const bestCodRule = codRules.sort((a, b) => {
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

            let isCodAvailable = true;
            let codDisableReason = "";
            let codCharge = 0;

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

                if (isCodAvailable && userAddress.pincode) {
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

            if (!isCodAvailable) {
                return res.status(400).json({ success: false, message: codDisableReason || "COD is not available." });
            }

            if (bestCodRule.codCharge) {
                if (bestCodRule.codChargeType === "percentage") {
                    codCharge = (itemsTotal * bestCodRule.codCharge) / 100;
                } else {
                    codCharge = bestCodRule.codCharge;
                }
            }

            // Adjust total amount with COD charge
            totalAmount += codCharge;

            // Create Order
            const newOrder = new Order({
                orderNumber,
                customerId: userId,
                shopIds: shopIds,
                items: orderItems,
                pricing: {
                    subtotal: itemsTotal,
                    deliveryFee: deliveryCharge + platformCharge + smallCartCharge + badWeatherCharge + codCharge,
                    discount: cart.discountAmount || 0,
                    total: totalAmount
                },
                payment: {
                    method: "COD",
                    status: "pending"
                },
                status: "order_placed",
                addressId: targetAddressId,
                deliveryTime,
                placedAt: new Date()
            });

            await newOrder.save();

            // Create Payment Record
            const paymentRecord = new Payment({
                orderId: newOrder._id,
                userId: userId,
                amount: totalAmount,
                paymentMethod: "cod",
                paymentGateway: "cod",
                status: "pending"
            });
            await paymentRecord.save();

            // Deduct Stock immediately for COD
            for (const item of items) {
                await Inventory.findByIdAndUpdate(item.inventoryId, {
                    $inc: { stock: -item.quantity }
                });
            }

            // Clear Cart items
            await CartItem.deleteMany({ cartId: cart._id });
            cart.itemsTotal = 0;
            cart.smallCartCharge = 0;
            cart.platformCharge = 0;
            cart.deliveryCharge = 0;
            cart.totalAmount = 0;
            cart.discountAmount = 0;
            cart.couponId = undefined;
            await cart.save();

            return res.status(201).json({
                success: true,
                message: "Order placed successfully (Cash on Delivery)",
                order: newOrder
            });
        }

        // ONLINE PAYMENT FLOW (Razorpay)
        if (paymentMethod === "ONLINE") {
            const key_id = process.env.RAZORPAY_KEY_ID;
            const key_secret = process.env.RAZORPAY_KEY_SECRET;

            if (!key_id || !key_secret) {
                return res.status(500).json({ success: false, message: "Razorpay credentials are not configured on the server." });
            }

            const razorpay = new Razorpay({ key_id, key_secret });

            // Create Razorpay Order
            const rzpOrderOptions = {
                amount: Math.round(totalAmount * 100), // paise
                currency: "INR",
                receipt: orderNumber
            };

            const rzpOrder = await razorpay.orders.create(rzpOrderOptions);

            // Create Pending Order on backend
            const pendingOrder = new Order({
                orderNumber,
                customerId: userId,
                shopId: shopId,
                shopIds: shopIds,
                items: orderItems,
                pricing: {
                    subtotal: itemsTotal,
                    deliveryFee: deliveryCharge + platformCharge + smallCartCharge + badWeatherCharge,
                    discount: cart.discountAmount || 0,
                    total: totalAmount
                },
                payment: {
                    method: "ONLINE",
                    status: "pending",
                    razorpayOrderId: rzpOrder.id
                },
                status: "order_placed",
                addressId: targetAddressId,
                deliveryTime,
                placedAt: new Date()
            });

            await pendingOrder.save();

            // Create Pending Payment Record
            const paymentRecord = new Payment({
                orderId: pendingOrder._id,
                userId: userId,
                amount: totalAmount,
                paymentGateway: "razorpay",
                gatewayTransactionId: rzpOrder.id,
                status: "pending"
            });
            await paymentRecord.save();

            // Note: For ONLINE payments, we do NOT deduct stock or clear cart yet.
            // Stock deduction and cart clearing happens upon successful payment signature verification.

            return res.status(201).json({
                success: true,
                message: "Razorpay order initiated successfully. Proceed to payment verification.",
                razorpayOrder: {
                    id: rzpOrder.id,
                    amount: rzpOrder.amount,
                    currency: rzpOrder.currency,
                    receipt: rzpOrder.receipt
                },
                order: {
                    _id: pendingOrder._id,
                    orderNumber: pendingOrder.orderNumber,
                    total: pendingOrder.pricing.total
                }
            });
        }

    } catch (error) {
        console.error("Error in checkoutOrder:", error);
        res.status(500).json({ success: false, message: "Checkout failed", error: error.message });
    }
};

/**
 * Verify Razorpay Payment Signature, Complete Order and Update Inventory
 * @route POST /api/orders/verify
 * @access Private
 */
exports.verifyPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: "orderId, razorpayOrderId, razorpayPaymentId, and razorpaySignature are required"
            });
        }

        // 1. Verify Payment Signature
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        if (!key_secret) {
            return res.status(500).json({ success: false, message: "Razorpay credentials are not configured on the server." });
        }

        const generated_signature = crypto
            .createHmac("sha256", key_secret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        if (generated_signature !== razorpaySignature) {
            // Mark Payment as failed
            await Payment.findOneAndUpdate(
                { gatewayTransactionId: razorpayOrderId },
                { status: "failed" }
            );
            await Order.findByIdAndUpdate(orderId, {
                "payment.status": "failed",
                "payment.razorpayPaymentId": razorpayPaymentId,
                "payment.razorpaySignature": razorpaySignature
            });

            return res.status(400).json({ success: false, message: "Payment signature verification failed. Fraudulent transaction detected." });
        }

        // 2. Fetch the Pending Order
        const order = await Order.findOne({ _id: orderId, customerId: userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.payment.status === "paid") {
            return res.status(400).json({ success: false, message: "Order has already been paid for and processed." });
        }

        // 3. Final Stock Check before capturing (to handle edge cases during payment window)
        for (const item of order.items) {
            const inventory = await Inventory.findById(item.inventoryId);
            if (!inventory) {
                return res.status(404).json({ success: false, message: `Product inventory not found for: ${item.name}` });
            }
            if (inventory.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `During payment processing, stock became unavailable for ${item.name}. Please contact support for a refund.`
                });
            }
        }

        // 4. Update Order details
        order.payment.status = "paid";
        order.payment.razorpayPaymentId = razorpayPaymentId;
        order.payment.razorpaySignature = razorpaySignature;
        await order.save();

        // 5. Update Payment details
        await Payment.findOneAndUpdate(
            { gatewayTransactionId: razorpayOrderId },
            {
                status: "success",
                gatewayTransactionId: razorpayPaymentId,
                paymentMethod: "online"
            }
        );

        // 6. Deduct Stock from Inventory
        for (const item of order.items) {
            await Inventory.findByIdAndUpdate(item.inventoryId, {
                $inc: { stock: -item.quantity }
            });
        }

        // 7. Clear User's Cart
        const cart = await Cart.findOne({ userId });
        if (cart) {
            await CartItem.deleteMany({ cartId: cart._id });
            cart.itemsTotal = 0;
            cart.smallCartCharge = 0;
            cart.platformCharge = 0;
            cart.deliveryCharge = 0;
            cart.totalAmount = 0;
            cart.discountAmount = 0;
            cart.couponId = undefined;
            await cart.save();
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified and order placed successfully",
            order
        });

    } catch (error) {
        console.error("Error in verifyPayment:", error);
        res.status(500).json({ success: false, message: "Payment verification failed", error: error.message });
    }
};

/**
 * Get all orders for the authenticated customer
 * @route GET /api/orders
 * @access Private
 */
exports.getCustomerOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch all orders for the customer sorted by newest first
        const orders = await Order.find({ customerId: userId })
            .sort({ createdAt: -1 })
            .populate("shopId", "name logo phone address city") // populate store details
            .populate({
                path: "items.inventoryId",
                select: "-variantOptions -productVariant",
                populate: {
                    path: "variant" // Include full variant (options and images)
                }
            })
            .populate("items.productId", "-description");

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error("Error in getCustomerOrders:", error);
        res.status(500).json({ success: false, message: "Server error while fetching orders", error: error.message });
    }
};

/**
 * Get details of a single order by ID for the authenticated customer
 * @route GET /api/orders/:orderId
 * @access Private
 */
exports.getOrderDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID format" });
        }

        const order = await Order.findOne({ _id: orderId, customerId: userId })
            .populate("shopId", "name logo phone banner address city state pincode location")
            .populate("addressId")
            .populate("riderId", "name phone profileImageUrl")
            .populate({
                path: "items.inventoryId",
                select: "-variantOptions -productVariant",
                populate: {
                    path: "variant" // Include full variant (options and images)
                }
            })
            .populate("items.productId", "-description");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error("Error in getOrderDetails:", error);
        res.status(500).json({ success: false, message: "Server error while fetching order details", error: error.message });
    }
};

/**
 * Initiate repayment for a failed or pending online payment order
 * @route POST /api/orders/:orderId/repay
 * @access Private
 */
exports.repayFailedOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID format" });
        }

        // 1. Fetch the Order
        const order = await Order.findOne({ _id: orderId, customerId: userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // 2. Validate Order eligibility for repayment
        if (order.payment.status === "paid") {
            return res.status(400).json({ success: false, message: "This order has already been paid successfully." });
        }

        if (order.status === "order_cancelled") {
            return res.status(400).json({ success: false, message: "Cannot pay for a cancelled order." });
        }

        // Make sure the payment method is ONLINE
        if (order.payment.method !== "ONLINE") {
            return res.status(400).json({ success: false, message: "Repayment is only applicable for ONLINE payment orders." });
        }

        // 3. Check real-time stock availability
        // Since the previous payment failed, the items were not checked out (stock was not deducted)
        // We must verify stock is still available before initiating repayment
        for (const item of order.items) {
            const inventory = await Inventory.findById(item.inventoryId);
            if (!inventory) {
                return res.status(404).json({ success: false, message: `Product inventory not found for: ${item.name}` });
            }
            if (inventory.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Stock is no longer available for ${item.name}. Only ${inventory.stock} units available in stock.`
                });
            }
        }

        // 4. Create new Razorpay order
        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (!key_id || !key_secret) {
            return res.status(500).json({ success: false, message: "Razorpay credentials are not configured on the server." });
        }

        const razorpay = new Razorpay({ key_id, key_secret });

        const rzpOrderOptions = {
            amount: Math.round(order.pricing.total * 100), // paise
            currency: "INR",
            receipt: order.orderNumber
        };

        const rzpOrder = await razorpay.orders.create(rzpOrderOptions);

        // 5. Update Order with new Razorpay Order ID and reset status to pending
        order.payment.razorpayOrderId = rzpOrder.id;
        order.payment.status = "pending";
        await order.save();

        // 6. Create a new Pending Payment Record
        const paymentRecord = new Payment({
            orderId: order._id,
            userId: userId,
            amount: order.pricing.total,
            paymentGateway: "razorpay",
            gatewayTransactionId: rzpOrder.id,
            status: "pending"
        });
        await paymentRecord.save();

        return res.status(200).json({
            success: true,
            message: "Repayment initiated successfully. Proceed to payment verification.",
            razorpayOrder: {
                id: rzpOrder.id,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
                receipt: rzpOrder.receipt
            },
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                total: order.pricing.total
            }
        });

    } catch (error) {
        console.error("Error in repayFailedOrder:", error);
        res.status(500).json({ success: false, message: "Failed to initiate repayment", error: error.message });
    }
};

