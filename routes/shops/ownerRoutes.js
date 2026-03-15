const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const { getOwnerProfile } = require("../../controllers/shops/ownerController");

const router = express.Router();

// All routes here are protected and intended for owners
router.use(authMiddleware);

router.get("/profile", getOwnerProfile);

module.exports = router;
