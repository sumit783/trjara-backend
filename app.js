const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config/serverConfig");
const userAuthRoutes = require("./routes/auth/userAuthRoutes");
const adminAuthRoutes = require("./routes/auth/adminAuthRoutes");

const adminRoutes = require("./routes/admin/adminRoutes");
const shopsRoutes = require("./routes/shops/Shop.js");
const productsRoutes = require("./routes/shops/productRoutes.js");
const categoriesRoutes = require("./routes/shops/categoriesRoutes.js");
const customerRoutes = require("./routes/users/customerRoutes");
const riderRoutes = require("./routes/auth/delivery/riderRoutes.js");
const ownerRoutes = require("./routes/shops/ownerRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Configure CORS
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

// Middleware
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Routes
app.use("/api/auth/user", userAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/shops", shopsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/rider", riderRoutes);
app.use("/api/owner", ownerRoutes);

// Error Handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

module.exports = app;
