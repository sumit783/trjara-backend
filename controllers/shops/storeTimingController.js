const StoreTiming = require("../../models/shops/storeTiming");
const Store = require("../../models/shops/Store");

// Get store timings
exports.getStoreTiming = async (req, res) => {
    try {
        const { shopId } = req.params;
        const timings = await StoreTiming.find({ store: shopId });

        res.status(200).json({
            success: true,
            data: timings
        });
    } catch (error) {
        console.error("Error fetching store timing:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Save or update store timings
exports.saveStoreTiming = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { timings } = req.body; // Expected format: [{ day, openTime, closeTime, isClosed }, ...]

        if (!timings || !Array.isArray(timings)) {
            return res.status(400).json({ success: false, message: "timings array is required" });
        }

        const savedTimings = [];

        for (const timing of timings) {
            const { day, openTime, closeTime, isClosed } = timing;

            // Upsert: Find and update or create new
            const updatedTiming = await StoreTiming.findOneAndUpdate(
                { store: shopId, day: day.toLowerCase() },
                {
                    openTime,
                    closeTime,
                    isClosed: !!isClosed
                },
                { new: true, upsert: true }
            );
            savedTimings.push(updatedTiming);
        }

        res.status(200).json({
            success: true,
            message: "Store timings saved successfully",
            data: savedTimings
        });
    } catch (error) {
        console.error("Error saving store timing:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
