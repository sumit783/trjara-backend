const express = require("express");
const { OwnersList } = require("../../controllers/users/usersList");

const router = express.Router();

router.get("/owners", OwnersList);

module.exports = router;
