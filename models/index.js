// ==========================
// User Models
// ==========================
const User = require("./users/User.js");
const Address = require("./users/Address.js");
const Session = require("./users/Session.js");

// ==========================
// Shop Models
// ==========================
const Store = require("./shops/Store.js");
const Staff = require("./shops/Staff.js");
const Role = require("./shops/ShopRole.js");
const Category = require("./shops/Category.js");
const Product = require("./shops/Product.js");
const ProductVariant = require("./shops/ProductVariant.js");
const VariantOption = require("./shops/VariantOption.js");
const Inventory = require("./shops/Inventory.js");
const InventoryLog = require("./shops/InventoryLog.js");
const QRCode = require("./shops/QRCode.js");
const Charge = require("./charges/Charge.js");
const StoreDocument = require("./shops/StoreDocument.js");
const StoreSettings = require("./shops/StoreSettings.js");
const StoreTiming = require("./shops/storeTiming.js");

// ==========================
// Order & Delivery Models
// ==========================
const Order = require("./orders/Order.js");
const OrderItem = require("./orders/OrderItem.js");
const OrderTimeline = require("./orders/OrderTimeline.js");
const PickupVerification = require("./orders/PickupVerification.js");
const DeliveryVerification = require("./orders/DeliveryVerification.js");

// ==========================
// Finance Models
// ==========================
const Payment = require("./finance/Payment.js");
const Wallet = require("./finance/Wallet.js");
const Transaction = require("./finance/Transaction.js");
const BankAccount = require("./finance/BankAccount.js");

// ==========================
// Content Models
// ==========================
const Document = require("./content/Document.js");
const Notification = require("./content/Notification.js");
const Ad = require("./content/Ad.js");
const Coupon = require("./content/Coupon.js");
const CouponRedemption = require("./content/CouponRedemption.js");
const StorePolicy = require("./content/StorePolicy.js");
const Review = require("./content/Review.js");

// ==========================
// Logs Models
// ==========================
const SearchIndexLog = require("./logs/SearchIndexLog.js");
const AnalyticsEvent = require("./logs/AnalyticsEvent.js");
const RateLimit = require("./logs/RateLimit.js");
const SystemLog = require("./logs/SystemLog.js");

// ==========================
// Cart Models
// ==========================
const Cart = require("./cart/Cart.js");
const CartItem = require("./cart/CartItem.js");

// ==========================
// Rider Models
// ==========================
const Rider = require("./rider/Rider.js");
const Vehicle = require("./rider/RiderVehicle.js");
const RiderDocument = require("./rider/RiderDocument.js");
const RiderEarning = require("./rider/RiderEarning.js");
const RiderLocation = require("./rider/RiderLocation.js");

// ==========================
// Export all models
// ==========================
module.exports = {
  // User
  User,
  Address,
  Session,

  // Shops
  Store,
  Staff,
  Role,
  Category,
  Product,
  ProductVariant,
  VariantOption,
  Inventory,
  InventoryLog,
  QRCode,
  Charge,
  StoreDocument,
  StoreSettings,
  StoreTiming,

  // Orders
  Order,
  OrderItem,
  OrderTimeline,
  PickupVerification,
  DeliveryVerification,

  // Finance
  Payment,
  Wallet,
  Transaction,
  BankAccount,

  // Content
  Document,
  Notification,
  Ad,
  Coupon,
  CouponRedemption,
  StorePolicy,
  Review,

  // Logs
  SearchIndexLog,
  AnalyticsEvent,
  RateLimit,
  SystemLog,

  // Cart
  Cart,
  CartItem,

  // Rider
  Rider,
  Vehicle,
  RiderDocument,
  RiderEarning,
  RiderLocation,
};
