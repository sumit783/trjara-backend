const express = require("express");
const {
    createAddress,
    updateAddress,
    deleteAddress,
    getAddresses,
} = require("../../controllers/users/addressController");

const router = express.Router();

router.post("/", createAddress);                  // Create
router.put("/:addressId", updateAddress);         // Update
router.delete("/:addressId", deleteAddress);      // Delete
router.get("/", getAddresses);                    // Get all by owner

module.exports = router;
