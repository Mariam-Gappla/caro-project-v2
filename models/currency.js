const mongoose=require("mongoose");
const currencySchema = new mongoose.Schema({
 num:{
    type:Number
 },
 price:{
    type:Number
 },
 title:{
    type:String,
 }
}, { timestamps: true });

module.exports = mongoose.model("Currency", currencySchema);