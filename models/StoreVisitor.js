const mongoose = require('mongoose');

const storeVisitorSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// هذا السطر هو الذي يمنع تكرار الزيارة
storeVisitorSchema.index({ storeId: 1, visitorId: 1 }, { unique: true });

module.exports = mongoose.model("StoreVisitor", storeVisitorSchema);