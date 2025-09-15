// ==========================
// User Models
// ==========================
const User = require("./users/User.js");
const Address = require("./users/Address.js");
const Session = require("./users/Session.js");

// ==========================
// Shop Models
// ==========================
const Shop = require("./shops/Shop.js");
const Staff = require("./shops/Staff.js");
const Role = require("./shops/Role.js");
const Category = require("./shops/Category.js");
const Product = require("./shops/Product.js");
const VariantOption = require("./shops/VariantOption.js");
const Inventory = require("./shops/Inventory.js");
const InventoryVariant = require("./shops/InventoryVariant.js");
const Barcode = require("./shops/Barcode.js");
const QRCode = require("./shops/QRCode.js");
const Charge = require("./charges/Charge.js");

// ==========================
// Order & Delivery Models
// ==========================
const Order = require("./orders/Order.js");
const OrderItem = require("./orders/OrderItem.js");
const Delivery = require("./orders/Delivery.js");
const DeliveryPickup = require("./orders/DeliveryPickup.js");

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
const Vehicle = require("./rider/Vehicle.js");

// ==========================
// Export all models
// ==========================
module.exports = {
  // User
  User,
  Address,
  Session,

  // Shops
  Shop,
  Staff,
  Role,
  Category,
  Product,
  VariantOption,
  Inventory,
  InventoryVariant,
  Barcode,
  QRCode,
  Charge,

  // Orders
  Order,
  OrderItem,
  Delivery,
  DeliveryPickup,

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
};
