const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("./models/admin"); // تأكد من المسار الصحيح للملف
require("dotenv").config();

const createAdmin = async () => {
  try {
    // 1. الاتصال بقاعدة البيانات
    // استبدل الرابط أدناه برابط قاعدة بياناتك إذا لم يكن موجوداً في الـ .env
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/carno"; 
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB...");

    // 2. بيانات الأدمن (قم بتغييرها كما تحب)
    const adminData = {
      username: "SuperAdmin",
      email: "admin@carnoapp.com",
      phone: "0500000000", // مهم جداً لأنه unique
      password: "AdminPassword123"
    };

    // 3. التحقق من وجوده مسبقاً (عن طريق الهاتف أو الإيميل)
    const existingAdmin = await Admin.findOne({ 
      $or: [{ phone: adminData.phone }, { email: adminData.email }] 
    });

    if (existingAdmin) {
      console.log("⚠️ Admin with this phone or email already exists!");
      process.exit();
    }

    // 4. تشفير كلمة السر
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // 5. حفظ الأدمن الجديد
    const newAdmin = new Admin({
      ...adminData,
      password: hashedPassword
    });

    await newAdmin.save();
    
    console.log("-----------------------------------------");
    console.log("🚀 Admin Created Successfully!");
    console.log(`User: ${adminData.username}`);
    console.log(`Phone: ${adminData.phone}`);
    console.log(`Pass: ${adminData.password}`);
    console.log("-----------------------------------------");

    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

createAdmin();