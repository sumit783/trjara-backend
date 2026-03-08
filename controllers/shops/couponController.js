const Coupon = require("../../models/content/Coupon");
const Shop = require("../../models/shops/Store");
const AnalyticsEvent = require("../../models/logs/AnalyticsEvent");

exports.createCoupon = async (req, res) => {
    try {
        const { shopId } = req.params;
        const userId = req.user._id;

        const {
            code,
            title,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            usageLimit,
            perUserLimit,
            startAt,
            endAt
        } = req.body;

        // Verify shop ownership
        const shop = await Shop.findOne({ _id: shopId, owner: userId });
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found or you are not the owner."
            });
        }

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists. Please use a unique code."
            });
        }

        const coupon = new Coupon({
            code,
            shopId,
            title,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            usageLimit,
            perUserLimit,
            startAt,
            endAt
        });

        const savedCoupon = await coupon.save();

        await AnalyticsEvent.create({
            event: "coupon_created",
            properties: { couponId: savedCoupon._id, shopId, userId },
            source: req.headers["x-source"] || "web"
        });

        res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            data: savedCoupon
        });
    } catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.getShopCoupons = async (req, res) => {
    try {
        const { shopId } = req.params;
        const userId = req.user._id;

        // Verify shop ownership
        const shop = await Shop.findOne({ _id: shopId, owner: userId });
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found or you are not the owner."
            });
        }

        const coupons = await Coupon.find({ shopId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: coupons
        });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.deleteCoupon = async (req, res) => {
    try {
        const { shopId, couponId } = req.params;
        const userId = req.user._id;

        // Verify shop ownership
        const shop = await Shop.findOne({ _id: shopId, owner: userId });
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found or you are not the owner."
            });
        }

        const coupon = await Coupon.findOneAndDelete({ _id: couponId, shopId });
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        await AnalyticsEvent.create({
            event: "coupon_deleted",
            properties: { couponId, shopId, userId },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
