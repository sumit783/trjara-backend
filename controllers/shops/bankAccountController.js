const BankAccount = require("../../models/finance/BankAccount");
const AnalyticsEvent = require("../../models/logs/AnalyticsEvent");

exports.addBankAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            upiId,
            isDefault
        } = req.body;

        // Validation: Either Bank details OR UPI ID must be provided
        const hasBankDetails = accountHolderName && bankName && accountNumber && ifscCode;
        if (!hasBankDetails && !upiId) {
            return res.status(400).json({
                success: false,
                message: "Please provide either full bank details (Account Holder Name, Bank Name, Account Number, IFSC Code) or a UPI ID."
            });
        }

        // Check if this is the first account for the user or if it's marked as default
        const existingAccountsFlag = await BankAccount.exists({ userId });

        // If it's the first account, it must be default. 
        // If it's explicitly marked as default, we must unset others.
        const shouldBeDefault = !existingAccountsFlag || isDefault === true;

        if (shouldBeDefault) {
            // Unset other default accounts for this user
            await BankAccount.updateMany({ userId }, { isDefault: false });
        }

        // Create shop
        const bankAccount = new BankAccount({
            userId,
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            upiId,
            isDefault: shouldBeDefault,
            adminVerficationStatus: "pending"
        });

        const savedAccount = await bankAccount.save();

        await AnalyticsEvent.create({
            event: "bank_account_added",
            properties: { bankAccountId: savedAccount._id, userId, isDefault: shouldBeDefault },
            source: req.headers["x-source"] || "web"
        });

        res.status(201).json({
            success: true,
            message: "Bank details added successfully. Pending admin verification.",
            data: savedAccount
        });
    } catch (error) {
        console.error("Error adding bank account:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.getVendorBankAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const bankAccounts = await BankAccount.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: bankAccounts
        });
    } catch (error) {
        console.error("Error fetching bank account:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.verifyBankAccount = async (req, res) => {
    try {
        const { accountId } = req.params;
        const { status } = req.body;

        if (!["verified", "rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be 'verified' or 'rejected'."
            });
        }

        const bankAccount = await BankAccount.findById(accountId);
        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found"
            });
        }

        bankAccount.adminVerficationStatus = status;
        if (status === "verified") {
            bankAccount.isVerified = true;
        } else {
            bankAccount.isVerified = false;
        }

        await bankAccount.save();

        await AnalyticsEvent.create({
            event: "bank_account_verified",
            properties: { bankAccountId: accountId, status },
            source: "admin"
        });

        res.status(200).json({
            success: true,
            message: `Bank account ${status} successfully`,
            data: bankAccount
        });
    } catch (error) {
        console.error("Error verifying bank account:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.setDefaultBankAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const { accountId } = req.params;

        const bankAccount = await BankAccount.findOne({ _id: accountId, userId });
        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found"
            });
        }

        // Unset all as default and set the current one
        await BankAccount.updateMany({ userId }, { isDefault: false });

        bankAccount.isDefault = true;
        await bankAccount.save();

        await AnalyticsEvent.create({
            event: "bank_account_default_updated",
            properties: { bankAccountId: accountId, userId },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "Default bank account updated successfully",
            data: bankAccount
        });
    } catch (error) {
        console.error("Error setting default bank account:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
