const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const userAuthRoutes = require("./routes/auth/userAuthRoutes");
const adminAuthRoutes = require("./routes/auth/adminAuthRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
// const documentRoutes = require("./routes/documentRouter/documentRoutes");
const shopsRoutes = require("./routes/shops/Shop.js");
const productsRoutes = require("./routes/shops/productRoutes.js");
// const addressRoutes = require("./routes/users/addressRoutes.js");
const categoriesRoutes = require("./routes/shops/categoriesRoutes.js");
const customerRoutes = require("./routes/users/customerRoutes");
const riderRoutes = require("./routes/auth/delivery/riderRoutes.js");
const errorHandler = require("./middlewares/errorHandler");
const authMiddleware = require("./middlewares/authMiddleware.js");
const path = require("path");
const cors = require("cors");

const http = require("http");
const { Server } = require("socket.io");
const { scheduleLocationUpdate } = require("./utils/socketHandler");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "*";

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect Database
connectDB();

// Store io in app for use in controllers
app.set("io", io);

// Initialize Socket Handler
scheduleLocationUpdate(io);

// Middleware
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running...");
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth/user", userAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
// app.use("/api/documents", authMiddleware, documentRoutes);
app.use("/api/shops", shopsRoutes);
app.use("/api/products", productsRoutes);
// app.use("/api/addresses", addressRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/rider", riderRoutes);
// app.use('/api/users', userLists)

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

