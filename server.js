const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const app = require("./app");
const { scheduleLocationUpdate } = require("./utils/socketHandler");

dotenv.config();

const server = http.createServer(app);

// Configure Allowed Origins for Socket.io
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "*";

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Store io in app for use in controllers
app.set("io", io);

// Initialize Socket Handler
scheduleLocationUpdate(io);

// Connect Database
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

