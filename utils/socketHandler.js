const { Server } = require("socket.io");
const RiderLocation = require("../models/rider/RiderLocation");
const Rider = require("../models/rider/Rider");
const jwt = require("jsonwebtoken");
const config = require("../config/serverConfig");

const scheduleLocationUpdate = (io) => {
    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        // Authentication middleware for socket
        socket.on("authenticate", async (token) => {
            try {
                const decoded = jwt.verify(token, config.jwtSecret);

                socket.userId = decoded.id;
                socket.role = decoded.role;

                if (socket.role === "rider") {
                    const rider = await Rider.findOne({ user: socket.userId });
                    if (rider) {
                        socket.riderId = rider._id;
                        socket.join(`rider-${rider._id}`);
                        console.log(`Rider authenticated: ${rider._id}`);
                    }
                }
            } catch (err) {
                console.error("Socket authentication error:", err.message);
                socket.disconnect();
            }
        });

        // Handle location update from rider
        socket.on("updateLocation", async (data) => {
            try {
                if (!socket.riderId) return;

                const { latitude, longitude, heading, speed } = data;

                // Update or create rider location
                await RiderLocation.findOneAndUpdate(
                    { rider: socket.riderId },
                    {
                        location: {
                            type: "Point",
                            coordinates: [longitude, latitude],
                        },
                        heading,
                        speed,
                    },
                    { upsert: true, new: true }
                );

                // Optionally broadcast to relevant parties (e.g., customers tracking their order)
                // io.emit("riderLocationChange", { riderId: socket.riderId, latitude, longitude });

            } catch (err) {
                console.error("Error updating rider location via socket:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
};

module.exports = { scheduleLocationUpdate };
