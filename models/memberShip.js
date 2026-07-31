const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    title: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    price: { 
      type: Number, 
      required: true 
    },
    duration: {
      en: { type: String, required: true }, // مثل: "1 Month"
      ar: { type: String, required: true }, // مثل: "شهر واحد"
    },
    benefits: {
      en: [{ type: String, required: true }],
      ar: [{ type: String, required: true }],
    },
    terms: {
      en: [{ type: String, required: true }],
      ar: [{ type: String, required: true }],
    },
  },
  { timestamps: true }
);

const Membership = mongoose.model("Membership", membershipSchema);
module.exports = Membership;