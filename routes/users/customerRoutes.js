const express = require("express");
const upload = require("../../middlewares/upload");
const authMiddleware = require("../../middlewares/authMiddleware");
const otpRateLimiter = require("../../middlewares/otpRateLimiter");
const { 
    getProfile, 
    updateProfile, 
    sendPhoneOTP, 
    verifyPhoneOTP, 
    getTopStoreLogos, 
    getHomeSections,
    getTopPicks,
    getFreshHealthy,
    getWeeklyDeals,
    getBestSellers,
    getNewArrivals,
    getPrimaryCategories,
    getProductsByCategory,
    getProductDetails
} = require("../../controllers/users/customerController");
const addressRoutes = require("./addressRoutes");

const router = express.Router();

// All routes here are protected
// router.use(authMiddleware);
router.use("/address",authMiddleware, addressRoutes);

router.get("/home-sections", getHomeSections);
router.get("/sections/top-picks", getTopPicks);
router.get("/sections/fresh-healthy", getFreshHealthy);
router.get("/sections/weekly-deals", getWeeklyDeals);
router.get("/sections/best-sellers", getBestSellers);
router.get("/sections/new-arrivals", getNewArrivals);
router.get("/top-store-logos", getTopStoreLogos);
router.get("/primary-categories", getPrimaryCategories);
router.get("/category/:categoryId/products", getProductsByCategory);
router.get("/products/:id", getProductDetails);
router.get("/profile",authMiddleware, getProfile);
router.put("/profile",upload.single("profileImage"),authMiddleware, updateProfile);
router.post("/send-otp", otpRateLimiter, sendPhoneOTP);
router.post("/verify-otp", verifyPhoneOTP);



module.exports = router;
