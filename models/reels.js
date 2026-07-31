const mongoose = require("mongoose");

const reelsSchema = new mongoose.Schema(
  {
    video: { type: String, required: true },
    discription: { type: String, required: true },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    shareCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    // ربط الريل بالمدينة والموقع (كما هو موضح في صورة الداتابيز)
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    orderId: { type: String, required: true }
  },
  { timestamps: true } // الآن هذا السطر في مكانه الصحيح داخل قوس السكيما
);

// تفعيل البحث الجغرافي
reelsSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Reel", reelsSchema);