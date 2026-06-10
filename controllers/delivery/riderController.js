const mongoose = require("mongoose");
const Rider = require("../../models/rider/Rider");
const User = require("../../models/users/User");
const RiderDocument = require("../../models/rider/RiderDocument");
const VehicleType = require("../../models/rider/VehicleType");
const Order = require("../../models/orders/Order");
const PickupVerification = require("../../models/orders/PickupVerification");
const DeliveryVerification = require("../../models/orders/DeliveryVerification");
const Wallet = require("../../models/finance/Wallet");
const Transaction = require("../../models/finance/Transaction");
const Store = require("../../models/shops/Store");

// @desc    Create rider profile
// @route   POST /api/rider/profile
// @access  Private (Rider only)
exports.createProfile = async (req, res) => {
    try {
        const { vehicleType } = req.body;
        const vehicleTypeById = await VehicleType.findOne({ _id: vehicleType });
        if (!vehicleTypeById) {
            return res.status(400).json({ error: "Vehicle type not found" });
        }
        // Check if user is allowed to create a rider profile
        // If they are a customer, we will upgrade them to a rider
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        if (user.role === "customer") {
            user.role = "rider";
            await user.save();
        }

        // Check if rider profile already exists
        let rider = await Rider.findOne({ user: req.user.id });

        if (rider) {
            return res.status(400).json({ error: "Rider profile already exists" });
        }

        // Create new rider profile
        rider = new Rider({
            user: req.user.id,
            vehicleType: vehicleTypeById._id,
        });

        await rider.save();

        res.status(201).json({
            success: true,
            message: "Rider profile created successfully",
            data: rider
        });
    } catch (err) {
        console.error("Error in createProfile:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Get rider profile
// @route   GET /api/rider/profile
// @access  Private (Rider only)
exports.getProfile = async (req, res) => {
    try {
        const rider = await Rider.findOne({ user: req.user.id })
            .populate("user", "name email phone profileImageUrl")
            .populate("vehicleType");

        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        res.json({
            success: true,
            data: rider
        });
    } catch (err) {
        console.error("Error in getProfile:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Upload rider document
// @route   POST /api/rider/documents
// @access  Private (Rider only)
exports.uploadDocument = async (req, res) => {
    try {
        const { documentType } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "Document file is required" });
        }

        if (!documentType) {
            return res.status(400).json({ error: "Document type is required" });
        }

        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found. Please create a profile first." });
        }

        // Check if document of this type already exists for this rider
        let riderDoc = await RiderDocument.findOne({ rider: rider._id, documentType });

        if (riderDoc && riderDoc.verificationStatus === "rejected") {
            // Update existing document
            riderDoc.documentImage = req.file.path;
            riderDoc.verificationStatus = "reuploaded";
            await riderDoc.save();
        }
        else if (riderDoc && riderDoc.verificationStatus !== "rejected") {
            riderDoc.documentImage = req.file.path;
            riderDoc.verificationStatus = "pending";
            await riderDoc.save();
        }
        else {
            // Create new document record
            riderDoc = new RiderDocument({
                rider: rider._id,
                documentType,
                documentImage: req.file.path,
            });
            await riderDoc.save();
        }

        // Update rider's verification status to pending if it was rejected or reuploaded
        if (rider.verificationStatus !== "verified") {
            rider.verificationStatus = "pending";
            await rider.save();
        }

        res.status(req.file ? 201 : 200).json({
            success: true,
            message: "Document uploaded successfully",
            data: riderDoc
        });
    } catch (err) {
        console.error("Error in uploadDocument:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Get rider documents
// @route   GET /api/rider/documents
// @access  Private (Rider only)
exports.getDocuments = async (req, res) => {
    try {
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        const documents = await RiderDocument.find({ rider: rider._id });

        res.json({
            success: true,
            data: documents
        });
    } catch (err) {
        console.error("Error in getDocuments:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Update rider status (online/available)
// @route   PATCH /api/rider/status
// @access  Private (Rider only)
exports.updateStatus = async (req, res) => {
    try {
        const { isOnline, isAvailable } = req.body;

        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        // Check if rider is verified
        if (!rider.isVerified) {
            return res.status(403).json({ error: "Access denied. Your account is not verified yet." });
        }

        if (isOnline !== undefined) {
            rider.isOnline = isOnline;
            // If rider goes offline, disconnect their socket
            if (isOnline === false) {
                const io = req.app.get("io");
                if (io) {
                    io.in(`rider-${rider._id}`).disconnectSockets(true);
                }
            }
        }
        if (isAvailable !== undefined) rider.isAvailable = isAvailable;

        await rider.save();

        res.json({
            success: true,
            message: "Status updated successfully",
            data: {
                isOnline: rider.isOnline,
                isAvailable: rider.isAvailable
            }
        });
    } catch (err) {
        console.error("Error in updateStatus:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Get rider verification status in sequence
// @route   GET /api/rider/verification-status
// @access  Private (Rider only)
exports.getVerificationStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found. Please create a profile first." });
        }

        // Fetch all documents for this rider
        const documents = await RiderDocument.find({ rider: rider._id });

        // 1. User details step
        let userDetailsStatus = "pending";
        if (user.isAdminVerified === "verified") {
            userDetailsStatus = "approved";
        } else if (user.isAdminVerified === "rejected") {
            userDetailsStatus = "rejected";
        } else if (user.isAdminVerified === "reuploaded") {
            userDetailsStatus = "reuploaded";
        }

        const userDetailsStep = {
            step: "user_details",
            label: "User Details",
            status: userDetailsStatus,
            remark: user.adminNote || "",
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        };

        // Helper to find document and format its step
        const getDocStep = (type, label) => {
            const doc = documents.find(d => d.documentType === type);
            if (!doc) {
                return {
                    step: type,
                    label,
                    status: "not_uploaded",
                    remark: "",
                    documentImage: "",
                    verifiedAt: null
                };
            }
            return {
                step: type,
                label,
                status: doc.verificationStatus === "approved" ? "approved" : doc.verificationStatus,
                remark: doc.remark || "",
                documentImage: doc.documentImage || "",
                verifiedAt: doc.verifiedAt || null
            };
        };

        const profilePhotoStep = getDocStep("profile_photo", "Profile Photo");

        // 2. Aadhar step (combines aadhar_front and aadhar_back)
        const aadharFrontDoc = documents.find(d => d.documentType === "aadhar_front");
        const aadharBackDoc = documents.find(d => d.documentType === "aadhar_back");

        let aadharStatus = "not_uploaded";
        let aadharRemark = "";
        let aadharImage = "";
        let aadharVerifiedAt = null;

        if (aadharFrontDoc && aadharBackDoc) {
            const statuses = [aadharFrontDoc.verificationStatus, aadharBackDoc.verificationStatus];
            if (statuses.every(s => s === "approved")) {
                aadharStatus = "approved";
                aadharVerifiedAt = aadharFrontDoc.verifiedAt || aadharBackDoc.verifiedAt;
            } else if (statuses.includes("rejected")) {
                aadharStatus = "rejected";
                aadharRemark = [aadharFrontDoc.remark, aadharBackDoc.remark].filter(Boolean).join(" | ");
            } else if (statuses.includes("reuploaded")) {
                aadharStatus = "reuploaded";
            } else {
                aadharStatus = "pending";
            }
            aadharImage = aadharFrontDoc.documentImage || aadharBackDoc.documentImage || "";
        } else {
            const uploadedDoc = aadharFrontDoc || aadharBackDoc;
            if (uploadedDoc && uploadedDoc.verificationStatus === "rejected") {
                aadharStatus = "rejected";
                aadharRemark = uploadedDoc.remark || "";
                aadharImage = uploadedDoc.documentImage || "";
            } else {
                aadharStatus = "not_uploaded";
            }
        }

        const aadharStep = {
            step: "aadhar",
            label: "Aadhar Card",
            status: aadharStatus,
            remark: aadharRemark,
            documentImage: aadharImage,
            verifiedAt: aadharVerifiedAt
        };

        const panStep = getDocStep("pan", "PAN Card");
        const drivingLicenseStep = getDocStep("driving_license", "Driving License");

        const steps = [
            userDetailsStep,
            profilePhotoStep,
            aadharStep,
            panStep,
            drivingLicenseStep
        ];

        // Determine current step in the sequence
        let currentStep = "completed";
        for (const stepObj of steps) {
            if (stepObj.status !== "approved") {
                currentStep = stepObj.step;
                break;
            }
        }

        res.json({
            success: true,
            data: {
                isVerified: rider.isVerified,
                verificationStatus: rider.verificationStatus,
                currentStep,
                steps
            }
        });
    } catch (err) {
        console.error("Error in getVerificationStatus:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Get active vehicle types for riders
// @route   GET /api/rider/vehicle-types
// @access  Private (Rider only)
exports.getVehicleTypes = async (req, res) => {
    try {
        const vehicleTypes = await VehicleType.find({ isActive: true });
        res.json({
            success: true,
            data: vehicleTypes
        });
    } catch (err) {
        console.error("Error in getVehicleTypes:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Select / update vehicle type for rider
// @route   PUT /api/rider/select-vehicle
// @access  Private (Rider only)
exports.selectVehicle = async (req, res) => {
    try {
        const { vehicleType } = req.body;
        if (!vehicleType) {
            return res.status(400).json({ error: "Vehicle type ID is required" });
        }

        const vehicleTypeById = await VehicleType.findOne({ _id: vehicleType, isActive: true });
        if (!vehicleTypeById) {
            return res.status(404).json({ error: "Active vehicle type not found" });
        }

        let rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            let user = await User.findById(req.user.id);
            if (!user) {
                return res.status(400).json({ error: "User not found" });
            }
            if (user.role === "customer") {
                user.role = "rider";
                await user.save();
            }
            rider = new Rider({
                user: req.user.id,
                vehicleType: vehicleTypeById._id,
            });
        } else {
            rider.vehicleType = vehicleTypeById._id;
        }

        await rider.save();

        res.json({
            success: true,
            message: "Vehicle selected successfully",
            data: rider
        });
    } catch (err) {
        console.error("Error in selectVehicle:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Reupload rider document
// @route   POST /api/rider/documents/reupload
// @access  Private (Rider only)
exports.reuploadDocument = async (req, res) => {
    try {
        const { documentType } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "Document file is required" });
        }

        if (!documentType) {
            return res.status(400).json({ error: "Document type is required" });
        }

        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found. Please create a profile first." });
        }

        // Check if document of this type already exists for this rider
        let riderDoc = await RiderDocument.findOne({ rider: rider._id, documentType });

        if (riderDoc) {
            riderDoc.verificationStatus = "reuploaded";
            riderDoc.documentImage = req.file.path;
            riderDoc.remark = ""; // clear rejection remark
            await riderDoc.save();
        } else {
            // Create new document record if it does not exist
            riderDoc = new RiderDocument({
                rider: rider._id,
                documentType,
                documentImage: req.file.path,
                verificationStatus: "reuploaded"
            });
            await riderDoc.save();
        }

        // Update rider's verification status to reuploaded if not verified
        if (rider.verificationStatus !== "verified") {
            rider.verificationStatus = "reuploaded";
            await rider.save();
        }

        // Update user's isAdminVerified status to reuploaded if not verified
        const user = await User.findById(req.user.id);
        if (user && user.isAdminVerified !== "verified") {
            user.isAdminVerified = "reuploaded";
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: "Document reuploaded successfully",
            data: riderDoc
        });
    } catch (err) {
        console.error("Error in reuploadDocument:", err);
        res.status(500).json({ error: "Server error" });
    }
};

const parseWeightToKg = (weightStr) => {
    if (!weightStr || typeof weightStr !== "string") return 0;
    
    const cleanStr = weightStr.trim().toLowerCase();
    
    // Match numeric part and optional unit part
    const match = cleanStr.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    if (isNaN(value)) return 0;
    
    const unit = match[2] || "kg";
    
    if (unit === "g" || unit === "gram" || unit === "grams" || unit === "gm") {
        return value / 1000;
    }
    if (unit === "kg" || unit === "kilogram" || unit === "kilograms") {
        return value;
    }
    if (unit === "ml" || unit === "milliliter" || unit === "milliliters") {
        return value / 1000;
    }
    if (unit === "l" || unit === "litre" || unit === "litres" || unit === "liter" || unit === "liters") {
        return value;
    }
    return value; // Default fallback to kg
};

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

const calculateOrderRouteDistance = (riderCoords, storeCoordsList, customerCoords) => {
    let totalDistance = 0;
    let currentCoords = riderCoords || (storeCoordsList.length > 0 ? storeCoordsList[0] : null);
    
    if (!currentCoords) return 0;
    
    let unvisited = [...storeCoordsList];
    
    // If rider coords were used as start, we don't remove the first store
    if (!riderCoords && unvisited.length > 0) {
        unvisited.shift();
    }
    
    while (unvisited.length > 0) {
        let closestIndex = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < unvisited.length; i++) {
            const dist = calculateDistance(currentCoords, unvisited[i]);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }
        
        totalDistance += minDistance;
        currentCoords = unvisited[closestIndex];
        unvisited.splice(closestIndex, 1);
    }
    
    if (currentCoords && customerCoords) {
        totalDistance += calculateDistance(currentCoords, customerCoords);
    }
    
    return parseFloat(totalDistance.toFixed(2));
};

// @desc    Get all available orders matching rider vehicle weight capacity and online status
// @route   GET /api/rider/orders/available
// @access  Private (Rider only)
exports.getAvailableOrders = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        let riderCoords = null;
        if (lat && lng) {
            riderCoords = [parseFloat(lng), parseFloat(lat)];
        }

        const rider = await Rider.findOne({ user: req.user.id }).populate("vehicleType");
        if (!rider) {
            return res.status(404).json({ success: false, error: "Rider profile not found." });
        }

        // Check online status
        if (!rider.isOnline) {
            return res.status(400).json({
                success: false,
                isOnline: false,
                message: "Rider is offline. Please go online to view and accept bookings."
            });
        }

        // Get rider's vehicle max load capacity
        const maxLoadKg = rider.vehicleType?.maxLoadKg || Infinity;

        // Query available orders (no rider assigned yet, only orders fully ready for pickup)
        const query = {
            riderId: null,
            status: "order_ready_for_pickup"
        };

        const orders = await Order.find(query)
            .populate("shopIds", "name logo phone address location city")
            .populate("addressId")
            .populate("customerId", "name phone");

        // Map and calculate total weight of each order
        const ordersWithWeight = orders.map(order => {
            let totalWeight = 0;
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    const weightStr = item.variant?.weight || "";
                    const quantity = item.quantity || 1;
                    totalWeight += parseWeightToKg(weightStr) * quantity;
                });
            }
            return {
                order,
                totalWeight: parseFloat(totalWeight.toFixed(3))
            };
        });

        // Filter orders based on vehicle maximum weight capacity
        const filteredOrders = ordersWithWeight.filter(item => item.totalWeight <= maxLoadKg);

        // Format orders for the rider card display
        const formattedOrders = filteredOrders.map(item => {
            const order = item.order;
            
            // Extract store coordinates
            const storeCoordsList = order.shopIds
                .filter(shop => shop.location && Array.isArray(shop.location.coordinates) && shop.location.coordinates.length === 2)
                .map(shop => shop.location.coordinates);
                
            // Extract customer coordinates
            const customerCoords = order.addressId?.location?.coordinates;
            
            // Calculate total distance
            const totalDistance = calculateOrderRouteDistance(riderCoords, storeCoordsList, customerCoords);

            return {
                orderId: order._id,
                orderNumber: order.orderNumber,
                shops: order.shopIds.map(shop => ({
                    id: shop._id,
                    name: shop.name,
                    logo: shop.logo,
                    address: shop.address,
                    city: shop.city,
                    coordinates: shop.location?.coordinates
                })),
                customerAddress: order.addressId ? {
                    addressLine: `${order.addressId.houseNo || ""}, ${order.addressId.landmark || ""}, ${order.addressId.addressLine || ""}`.trim().replace(/^,\s*|,\s*$/g, ""),
                    city: order.addressId.city,
                    pincode: order.addressId.pincode,
                    coordinates: order.addressId.location?.coordinates
                } : null,
                totalItems: order.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0),
                totalWeight: item.totalWeight,
                totalDistance: totalDistance, // in km
                earnings: order.pricing?.deliveryFee || 0, // Rs. earnings for rider
                status: order.status,
                placedAt: order.placedAt || order.createdAt
            };
        });

        res.json({
            success: true,
            isOnline: true,
            count: formattedOrders.length,
            maxWeightCapacity: maxLoadKg === Infinity ? "Unlimited" : maxLoadKg,
            data: formattedOrders
        });
    } catch (err) {
        console.error("Error in getAvailableOrders:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Get rider status (online/available)
// @route   GET /api/rider/status
// @access  Private (Rider only)
exports.getStatus = async (req, res) => {
    try {
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ success: false, error: "Rider profile not found." });
        }

        res.json({
            success: true,
            data: {
                isOnline: rider.isOnline,
                isAvailable: rider.isAvailable,
                isVerified: rider.isVerified,
                verificationStatus: rider.verificationStatus
            }
        });
    } catch (err) {
        console.error("Error in getStatus:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Accept an order
// @route   PUT /api/rider/orders/:orderId/accept
// @access  Private (Rider only)
exports.acceptOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID format." });
        }

        // Find the rider profile
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider profile not found." });
        }

        // Check if rider is verified
        if (!rider.isVerified) {
            return res.status(403).json({ success: false, message: "Access denied. Your account is not verified yet." });
        }

        // Check if rider is online
        if (!rider.isOnline) {
            return res.status(400).json({ success: false, message: "Please go online to accept bookings." });
        }

        // Check if rider already has an active order (rider can accept one order at a time)
        if (rider.currentOrder) {
            return res.status(400).json({ 
                success: false, 
                message: "You already have an active order. Please complete or cancel it first." 
            });
        }

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Check if order is already assigned or cancelled/delivered
        if (order.riderId || ["rider_assigned", "order_out_for_delivery", "order_delivered", "order_cancelled"].includes(order.status)) {
            return res.status(400).json({ success: false, message: "Order is not available for acceptance. It may have been accepted by another rider or cancelled." });
        }

        // Assign order to rider
        order.riderId = rider._id;
        order.status = "rider_assigned";
        await order.save();

        // Update rider profile
        rider.currentOrder = order._id;
        rider.isAvailable = false; // Busy
        await rider.save();

        // Fetch populated order details
        const populatedOrder = await Order.findById(order._id)
            .populate("shopIds", "name logo phone banner address city state pincode location")
            .populate("items.shopId", "name logo phone banner address city state pincode location")
            .populate("addressId")
            .populate("riderId", "name phone profileImageUrl")
            .populate({
                path: "items.inventoryId",
                select: "-variantOptions -productVariant",
                populate: {
                    path: "variant"
                }
            })
            .populate("items.productId", "-description")
            .populate("customerId", "name phone email");

        res.json({
            success: true,
            message: "Order accepted successfully.",
            data: populatedOrder
        });
    } catch (err) {
        console.error("Error in acceptOrder:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Get current active order details for rider
// @route   GET /api/rider/orders/current
// @access  Private (Rider only)
exports.getCurrentOrder = async (req, res) => {
    try {
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider profile not found." });
        }

        if (!rider.currentOrder) {
            return res.json({
                success: true,
                message: "No active order found for this rider.",
                data: null
            });
        }

        const order = await Order.findById(rider.currentOrder)
            .populate("shopIds", "name logo phone banner address city state pincode location")
            .populate("items.shopId", "name logo phone banner address city state pincode location")
            .populate("addressId")
            .populate("riderId", "name phone profileImageUrl")
            .populate({
                path: "items.inventoryId",
                select: "-variantOptions -productVariant",
                populate: {
                    path: "variant"
                }
            })
            .populate("items.productId", "-description")
            .populate("customerId", "name phone email");

        if (!order) {
            // Out of sync: Rider points to an order that doesn't exist
            rider.currentOrder = undefined;
            rider.isAvailable = true;
            await rider.save();

            return res.json({
                success: true,
                message: "Active order details not found. Cleaned up profile.",
                data: null
            });
        }

        // Fetch pickup verifications for this order
        const pickupVerifications = await PickupVerification.find({ orderId: order._id });

        // Create a lookup map of product verification status
        const itemVerificationMap = {};
        pickupVerifications.forEach(pv => {
            pv.items.forEach(item => {
                if (item.productId) {
                    itemVerificationMap[item.productId.toString()] = {
                        pickedQty: item.pickedQty,
                        expectedQty: item.expectedQty,
                        verified: item.verified,
                        verificationStatus: pv.verificationStatus
                    };
                }
            });
        });

        // Decorate order items with verification info
        const orderObj = order.toObject();
        orderObj.items = orderObj.items.map(item => {
            const prodId = item.productId && item.productId._id ? item.productId._id.toString() : (item.productId ? item.productId.toString() : null);
            const verification = prodId ? (itemVerificationMap[prodId] || null) : null;
            return {
                ...item,
                verification: verification || {
                    pickedQty: 0,
                    expectedQty: item.quantity,
                    verified: false,
                    verificationStatus: "pending"
                }
            };
        });

        // Build a clean customer address object for easy frontend consumption
        const customerAddress = orderObj.addressId ? {
            label: orderObj.addressId.label,
            addressLine1: orderObj.addressId.addressLine1,
            addressLine2: orderObj.addressId.addressLine2 || "",
            landmark: orderObj.addressId.landmark || "",
            city: orderObj.addressId.city,
            state: orderObj.addressId.state,
            pincode: orderObj.addressId.pincode,
            fullAddress: [
                orderObj.addressId.addressLine1,
                orderObj.addressId.addressLine2,
                orderObj.addressId.landmark,
                orderObj.addressId.city,
                orderObj.addressId.state,
                orderObj.addressId.pincode
            ].filter(Boolean).join(", "),
            coordinates: orderObj.addressId.location?.coordinates || null
        } : null;

        res.json({
            success: true,
            data: {
                ...orderObj,
                customerAddress,
                pickupVerifications
            }
        });
    } catch (err) {
        console.error("Error in getCurrentOrder:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Verify product pickup at store (submits picked items array)
// @route   POST /api/rider/orders/:orderId/pickup-verify
// @access  Private (Rider only)
exports.verifyPickup = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { shopId, items } = req.body; // items: [ { productId, pickedQty, verified } ]

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(shopId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID or shop ID format." });
        }

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: "Items array is required." });
        }

        // Find rider profile
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider profile not found." });
        }

        // Check if this order is assigned to the rider
        if (!rider.currentOrder || rider.currentOrder.toString() !== orderId) {
            return res.status(400).json({ success: false, message: "This order is not currently active for you." });
        }

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        if (["order_delivered", "order_cancelled"].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Cannot verify pickup for an order that is ${order.status.replace("order_", "")}.` });
        }

        // Filter items in order belonging to this shop
        const orderShopItems = order.items.filter(item => {
            const itemShopId = item.shopId ? item.shopId.toString() : null;
            return itemShopId === shopId;
        });

        if (orderShopItems.length === 0) {
            return res.status(400).json({ success: false, message: "No items found for this shop in this order." });
        }

        // Compare and build verification items list
        const verificationItems = [];
        let hasIssue = false;

        for (const orderItem of orderShopItems) {
            const submittedItem = items.find(i => i.productId && i.productId.toString() === orderItem.productId.toString());
            
            const pickedQty = submittedItem ? parseInt(submittedItem.pickedQty, 10) : 0;
            const verified = submittedItem ? !!submittedItem.verified : false;

            if (isNaN(pickedQty) || pickedQty !== orderItem.quantity || !verified) {
                hasIssue = true;
            }

            verificationItems.push({
                productId: orderItem.productId,
                name: orderItem.name,
                expectedQty: orderItem.quantity,
                pickedQty: isNaN(pickedQty) ? 0 : pickedQty,
                verified
            });
        }

        // Check if already verified to prevent duplicate deliveryTime reductions
        const wasAlreadyVerified = await PickupVerification.findOne({
            orderId,
            shopId,
            verificationStatus: "verified"
        });

        const verificationStatus = hasIssue ? "issue" : "verified";

        // Save or update PickupVerification
        let verification = await PickupVerification.findOne({ orderId, shopId });
        if (verification) {
            verification.riderId = rider._id;
            verification.items = verificationItems;
            verification.verificationStatus = verificationStatus;
            verification.verifiedAt = new Date();
            await verification.save();
        } else {
            verification = new PickupVerification({
                orderId,
                riderId: rider._id,
                shopId,
                items: verificationItems,
                verificationStatus,
                verifiedAt: new Date()
            });
            await verification.save();
        }

        // Reduce order deliveryTime and credit store owner's wallet if newly verified
        if (verificationStatus === "verified" && !wasAlreadyVerified) {
            const store = await Store.findById(shopId);

            // Reduce delivery ETA by packing time of this shop
            const packingTime = store && typeof store.averagePackingTime === 'number' ? store.averagePackingTime : 5;
            order.deliveryTime = Math.max(5, (order.deliveryTime || 0) - packingTime);

            // Credit store owner wallet with the subtotal for items from this shop
            if (store && store.owner) {
                // Calculate this shop's item subtotal
                const shopSubtotal = order.items
                    .filter(item => item.shopId && item.shopId.toString() === shopId)
                    .reduce((sum, item) => sum + (item.total || (item.price * item.quantity) || 0), 0);

                if (shopSubtotal > 0) {
                    let ownerWallet = await Wallet.findOne({ userId: store.owner });
                    if (!ownerWallet) {
                        ownerWallet = new Wallet({
                            userId: store.owner,
                            balance: 0,
                            totalEarning: 0
                        });
                    }
                    ownerWallet.balance += shopSubtotal;
                    ownerWallet.totalEarning += shopSubtotal;
                    await ownerWallet.save();

                    await new Transaction({
                        userId: store.owner,
                        walletId: ownerWallet._id,
                        orderId: order._id,
                        amount: shopSubtotal,
                        type: "store_earning",
                        status: "success",
                        description: `Product sale earnings for order ${order.orderNumber} from ${store.name}`
                    }).save();
                }
            }
        }

        // Check if all shops in the order are verified to update order status
        const allVerifications = await PickupVerification.find({ orderId });
        const verifiedShopIds = allVerifications
            .filter(v => v.verificationStatus === "verified")
            .map(v => v.shopId.toString());

        const allShopsVerified = order.shopIds.every(id => verifiedShopIds.includes(id.toString()));

        if (allShopsVerified) {
            order.status = "order_out_for_delivery";
        }
        
        // Save order changes (either deliveryTime reduction, status update, or both)
        await order.save();

        res.json({
            success: true,
            message: "Pickup verification submitted successfully.",
            data: {
                verification,
                orderStatus: order.status,
                deliveryTime: order.deliveryTime,
                allShopsVerified
            }
        });
    } catch (err) {
        console.error("Error in verifyPickup:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Verify product delivery to client
// @route   POST /api/rider/orders/:orderId/delivery-verify
// @access  Private (Rider only)
exports.deliveryVerify = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { items } = req.body; // items: [ { productId, deliveredQty, confirmed } ]

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID format." });
        }

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: "Items array is required." });
        }

        // Find rider profile
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider profile not found." });
        }

        // Check if this order is assigned to the rider
        if (!rider.currentOrder || rider.currentOrder.toString() !== orderId) {
            return res.status(400).json({ success: false, message: "This order is not currently active for you." });
        }

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Must be out for delivery to verify delivery
        if (order.status !== "order_out_for_delivery") {
            return res.status(400).json({ success: false, message: "Order status must be 'order_out_for_delivery' to verify delivery." });
        }

        // Compare and build verification items list
        const verificationItems = [];
        for (const orderItem of order.items) {
            const submittedItem = items.find(i => i.productId && i.productId.toString() === orderItem.productId.toString());
            
            const deliveredQty = submittedItem ? parseInt(submittedItem.deliveredQty, 10) : 0;
            const confirmed = submittedItem ? !!submittedItem.confirmed : false;

            verificationItems.push({
                productId: orderItem.productId,
                name: orderItem.name,
                deliveredQty: isNaN(deliveredQty) ? 0 : deliveredQty,
                confirmed
            });
        }

        // Save or update DeliveryVerification
        let deliveryVerification = await DeliveryVerification.findOne({ orderId });
        if (deliveryVerification) {
            deliveryVerification.riderId = rider._id;
            deliveryVerification.items = verificationItems;
            deliveryVerification.deliveredAt = new Date();
            await deliveryVerification.save();
        } else {
            deliveryVerification = new DeliveryVerification({
                orderId,
                riderId: rider._id,
                items: verificationItems,
                deliveredAt: new Date()
            });
            await deliveryVerification.save();
        }

        res.json({
            success: true,
            message: "Delivery verification submitted successfully.",
            data: {
                deliveryVerification
            }
        });
    } catch (err) {
        console.error("Error in deliveryVerify:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Get order bill/invoice details for the rider
// @route   GET /api/rider/orders/:orderId/bill
// @access  Private (Rider only)
exports.getOrderBill = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID format." });
        }

        // Find rider profile
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider profile not found." });
        }

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Verify order is assigned to this rider
        if (order.riderId && order.riderId.toString() !== rider._id.toString()) {
            return res.status(403).json({ success: false, message: "Access denied. This order is not assigned to you." });
        }

        // Find delivery verification if exists
        const deliveryVerification = await DeliveryVerification.findOne({ orderId });

        // Build items list decorated with delivery verification details
        const itemsWithDeliveryInfo = order.items.map(orderItem => {
            const verifiedItem = deliveryVerification
                ? deliveryVerification.items.find(i => i.productId && i.productId.toString() === orderItem.productId.toString())
                : null;

            return {
                productId: orderItem.productId,
                name: orderItem.name,
                price: orderItem.price,
                quantity: orderItem.quantity,
                total: orderItem.total,
                deliveredQty: verifiedItem ? verifiedItem.deliveredQty : 0,
                confirmed: verifiedItem ? verifiedItem.confirmed : false
            };
        });

        // Calculate amount to collect
        let amountToCollect = 0;
        if (order.payment && order.payment.method === "COD") {
            if (order.payment.status !== "paid") {
                amountToCollect = order.pricing.total;
            }
        }

        res.json({
            success: true,
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                pricing: order.pricing,
                payment: order.payment,
                amountToCollect,
                items: itemsWithDeliveryInfo
            }
        });
    } catch (err) {
        console.error("Error in getOrderBill:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Get today's stats for the rider dashboard
// @route   GET /api/rider/stats/today
// @access  Private (Rider only)
exports.getTodayStats = async (req, res) => {
    try {
        // Find rider profile
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider profile not found." });
        }

        // Define today's date range in UTC (midnight-to-midnight)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // 1. Today's earnings — sum rider_earning transactions created today for this user
        const earningAgg = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(req.user.id),
                    type: "rider_earning",
                    status: "success",
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                }
            },
            {
                $group: {
                    _id: null,
                    totalEarning: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const todayEarning   = earningAgg.length > 0 ? earningAgg[0].totalEarning : 0;
        const earningTxCount = earningAgg.length > 0 ? earningAgg[0].count : 0;

        // 2. Orders done today — delivered orders assigned to this rider, deliveredAt today
        const ordersDoneToday = await Order.countDocuments({
            riderId: rider._id,
            status: "order_delivered",
            deliveredAt: { $gte: startOfDay, $lte: endOfDay }
        });

        // 3. Average per-order earning today
        const avgPerOrder = ordersDoneToday > 0
            ? parseFloat((todayEarning / ordersDoneToday).toFixed(2))
            : 0;

        // 4. Live orders — orders currently active/in-progress for this rider
        const liveStatuses = [
            "rider_assigned",
            "order_out_for_delivery",
            "order_packing",
            "order_ready_for_pickup"
        ];
        const liveOrdersCount = await Order.countDocuments({
            riderId: rider._id,
            status: { $in: liveStatuses }
        });

        res.json({
            success: true,
            data: {
                todayEarning,        // Total earnings today (₹)
                ordersDone: ordersDoneToday,  // Completed deliveries today
                avgPerOrder,         // Average earning per order today (₹)
                liveOrders: liveOrdersCount   // Currently active orders
            }
        });
    } catch (err) {
        console.error("Error in getTodayStats:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Mark order delivery as complete
// @route   PUT /api/rider/orders/:orderId/complete
// @access  Private (Rider only)
exports.completeOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID format." });
        }

        // Find rider profile
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider profile not found." });
        }

        // Check if this order is assigned to the rider
        if (!rider.currentOrder || rider.currentOrder.toString() !== orderId) {
            return res.status(400).json({ success: false, message: "This order is not currently active for you." });
        }

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Must be out for delivery to mark as complete
        if (order.status !== "order_out_for_delivery") {
            return res.status(400).json({ success: false, message: "Order status must be 'order_out_for_delivery' to mark as complete." });
        }

        // Check if delivery verification exists before completing.
        // If not verified, create a default DeliveryVerification where all items are marked as delivered
        let deliveryVerification = await DeliveryVerification.findOne({ orderId });
        if (!deliveryVerification) {
            const verificationItems = order.items.map(item => ({
                productId: item.productId,
                name: item.name,
                deliveredQty: item.quantity,
                confirmed: true
            }));

            deliveryVerification = new DeliveryVerification({
                orderId,
                riderId: rider._id,
                items: verificationItems,
                deliveredAt: new Date()
            });
            await deliveryVerification.save();
        }

        // Update order status and delivered time
        order.status = "order_delivered";
        order.deliveredAt = new Date();

        // If payment method is COD, mark payment as paid since rider collected the money
        if (order.payment && order.payment.method === "COD") {
            order.payment.status = "paid";
        }

        await order.save();

        // Add delivery amount to rider's wallet
        const earningAmount = order.pricing?.deliveryFee || 0;
        let walletInfo = null;
        if (earningAmount > 0) {
            let wallet = await Wallet.findOne({ userId: req.user.id });
            if (!wallet) {
                wallet = new Wallet({
                    userId: req.user.id,
                    balance: 0,
                    totalEarning: 0
                });
            }
            wallet.balance += earningAmount;
            wallet.totalEarning += earningAmount;
            await wallet.save();

            const transaction = new Transaction({
                userId: req.user.id,
                walletId: wallet._id,
                orderId: order._id,
                amount: earningAmount,
                type: "rider_earning",
                status: "success",
                description: `Earnings for delivering order ${order.orderNumber}`
            });
            await transaction.save();

            walletInfo = {
                balance: wallet.balance,
                totalEarning: wallet.totalEarning
            };
        }

        // Release the rider from current order and make them available again
        rider.currentOrder = null;
        rider.isAvailable = true;
        await rider.save();

        res.json({
            success: true,
            message: "Order marked as completed successfully.",
            data: {
                orderStatus: order.status,
                paymentStatus: order.payment ? order.payment.status : null,
                wallet: walletInfo,
                riderStatus: {
                    isAvailable: rider.isAvailable,
                    currentOrder: rider.currentOrder
                }
            }
        });
    } catch (err) {
        console.error("Error in completeOrder:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

// @desc    Get rider wallet and transactions
// @route   GET /api/rider/wallet
// @access  Private (Rider only)
exports.getRiderWallet = async (req, res) => {
    try {
        // Find or create wallet for rider user
        let wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) {
            wallet = new Wallet({
                userId: req.user.id,
                balance: 0,
                totalEarning: 0,
                totalWithdrawn: 0
            });
            await wallet.save();
        }

        // Fetch transactions for this user
        const transactions = await Transaction.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // Get recent 50 transactions

        res.json({
            success: true,
            data: {
                wallet,
                transactions
            }
        });
    } catch (err) {
        console.error("Error in getRiderWallet:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};


