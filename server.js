const http = require("http");
const { Server } = require("socket.io");
const config = require("./config/serverConfig");
const connectDB = require("./config/db.js");
const app = require("./app");
const { scheduleLocationUpdate } = require("./utils/socketHandler");

const server = http.createServer(app);

// Configure Allowed Origins for Socket.io
const io = new Server(server, {
  cors: {
    origin: config.allowedOrigins,
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
const PORT = config.port;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


