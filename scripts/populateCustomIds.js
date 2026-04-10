const mongoose = require("mongoose");
require("dotenv").config();
const generateCustomId = require("../utils/idGenerator");

// Models
const User = require("../models/users/User");
const Store = require("../models/shops/Store");
const Category = require("../models/shops/Category");
const Product = require("../models/shops/Product");
const Inventory = require("../models/shops/Inventory");

const populateModel = async (Model, prefix, name) => {
    console.log(`Processing ${name}...`);
    const docs = await Model.find({ customId: { $exists: false } });
    console.log(`Found ${docs.length} ${name} records without customId.`);

    for (const doc of docs) {
        let id;
        let exists = true;
        while (exists) {
            id = generateCustomId(prefix);
            const found = await Model.findOne({ customId: id });
            if (!found) exists = false;
        }
        doc.customId = id;
        await doc.save();
    }
    console.log(`Finished processing ${name}.`);
};

const runMigration = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        await populateModel(User, "USR", "Users");
        await populateModel(Store, "STR", "Stores");
        await populateModel(Category, "CAT", "Categories");
        await populateModel(Product, "PRD", "Products");
        await populateModel(Inventory, "INV", "Inventory Items");

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

runMigration();
