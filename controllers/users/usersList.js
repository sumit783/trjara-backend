const User = require("../../models/users/User");

exports.OwnersList = async (req, res) => {
    try {
        const { status, isActive, ownerId, start_date, end_date, search, page = 1, limit = 10 } = req.query;

        const query = { role: "owner" }

        if (typeof isActive !== "undefined") {
            query.isActive = isActive === "true" || isActive === true;
        }

        if (status && ["pending", "verified", "rejected"].includes(status)) {
            query.isAdminVerified = status;
        }

        if (ownerId) {
            query._id = ownerId;
        }

        if (start_date || end_date) {
            query.createdAt = {};
            if (start_date) query.createdAt.$gte = new Date(start_date);
            if (end_date) query.createdAt.$lte = new Date(end_date);
        }

        if (search) {
            query.$or = [
                { name: new RegExp(search, "i") },
                { email: new RegExp(search, "i") },
                { phone: new RegExp(search, "i") },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await User.countDocuments(query);

        const owners = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            count: owners.length,
            data: owners,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
}  