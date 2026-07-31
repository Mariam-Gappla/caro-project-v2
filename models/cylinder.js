const mongoose=require("mongoose");
const cylinderSchema = new mongoose.Schema({
nameAr: { type: String, required: true },
  nameEn: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Cylinder", cylinderSchema);
