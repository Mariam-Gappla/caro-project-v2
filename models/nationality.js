const mongoose = require("mongoose");

const nationalitySchema = new mongoose.Schema({
  name: {
    en: { 
      type: String, 
      required: true, 
      trim: true 
    },
    ar: { 
      type: String, 
      required: true, 
      trim: true 
    }
  }
}, { timestamps: true });

module.exports = mongoose.model("Nationality", nationalitySchema);