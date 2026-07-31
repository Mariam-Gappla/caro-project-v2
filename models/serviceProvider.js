const mongoose = require("mongoose");
const serviceProviderSchema = new mongoose.Schema({
    username: {
        type: String
    },
    email: {
        type: String,
        match: /^[a-zA-z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,4}$/,
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: "string",
        required: true,
    },
    serviceType: {
        type: String, 
        enum: ["1", "2", "3"], // 1: ونش، 2: كفر، 3: بطارية
        default: "1" 
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "refused"],
        default: "pending"

    },
profileImage: { type: String },
    nationalIdImage: { type: String },
    licenseImage: { type: String },
    carRegistrationImage: { type: String },
    carImage: { type: String },
    location: {
        lat: {
            type: Number
        },
        long: {
            type: Number
        }
    },
    resetOtp: {
        type: Number
    },
    resetOtpExpires: {
        type: Date
    },
    image: {
        type: String,
        default: `${process.env.BASE_URL}/images/rentalOffice.PNG`,
    },
    fcmToken: {
        type: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdAt: { type: Date, default: Date.now },
});
const serviceProvider = mongoose.model("serviceProvider", serviceProviderSchema);
module.exports = serviceProvider;