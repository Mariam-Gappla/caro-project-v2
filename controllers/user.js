const User = require("../models/user");
const StoreVisitor = require("../models/StoreVisitor");
const { ACCOUNT_CATEGORIES } = require('../utils/serviceConstants');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Otp = require("../models/otp");
const { registerSchema, loginSchema, registerProviderSchema } = require("../validation/registerAndLoginSchema");
const userAsAutoSalvageSchema = require("../validation/userAsAutoSalvagesValidition");
const Admin = require("../models/admin.js");
const CenterCategory = require("../models/mainCategoryCenter.js");
const changePasswordSchema = require("../validation/changePasswordValidition");
const workSession = require("../models/workingSession");
const rentalOffice = require("../models/rentalOffice");
const getMessages = require("../configration/getmessages");
const CenterFollower = require("../models/followerCenter");
const Favorite = require("../models/favorite");
const serviceProvider = require("../models/serviceProvider");
const RatingCenter = require("../models/ratingCenter");
const CenterService = require("../models/centerServices")
const userAsProviderSchema = require("../validation/userAsProviderValidition");
const Winsh = require("../models/winsh");
const MainCategoryCenter = require("../models/mainCategoryCenter");
const centerFollower = require("../models/followerCenter");
const Tire = require("../models/tire");
const path = require("path");
const fs = require("fs");
const Wallet = require("../models/wallet");
const { sendNotification, sendNotificationToMany } = require("../configration/firebase.js");
const { saveImage } = require("../configration/saveImage");
const mongoose = require("mongoose");
const register = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const messages = getMessages(lang);
    const { password, phone, role, serviceType } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // دالة مساعدة لاستخراج مسارات الصور المرفوعة بناءً على الـ Keys الخاصة بك
    const getImagesPaths = (files) => {
      const paths = {};
      const keys = ['profileImage', 'nationalIdImage', 'licenseImage', 'carRegistrationImage', 'carImage'];
      if (files) {
        keys.forEach(key => {
          if (files[key]) {
            paths[key] = files[key][0].path; 
          }
        });
      }
      return paths;
    };

    // ----------------------
    // 1️⃣ حالة المستخدم (User)
    // ----------------------
    if (role === "user") {
      const { error } = registerSchema(lang).validate(req.body);
      if (error) return res.status(400).send({ status: false, code: 400, message: error.details[0].message });

      const existUser = await User.findOne({ phone });
      if (existUser) return res.status(400).send({ status: false, code: 400, message: messages.register.emailExists.user });

      const user = await User.create({ ...req.body, password: hashedPassword });
      await Wallet.create({ userId: user._id });
      return res.status(200).send({ status: true, code: 200, message: messages.register.createdSuccessfully });
    }

    // ------------------------------
    // 2️⃣ حالة مكتب التأجير (Rental Office)
    // ------------------------------
    else if (role === "rentalOffice") {
      const existRental = await rentalOffice.findOne({ phone });
      if (existRental) return res.status(400).send({ status: false, code: 400, message: lang == "ar" ? "المكتب مسجل مسبقاً" : "Already registered" });

      const images = getImagesPaths(req.files);
      await rentalOffice.create({
        ...req.body,
        password: hashedPassword,
        image: images['profileImage'] || "", // استخدام الـ Key الصحيح
        status: "pending"
      });
      return res.status(200).send({ status: true, code: 200, message: lang == "ar" ? "تم إرسال طلب المكتب" : "Request sent" });
    }

// 3️⃣ حالة مقدم الخدمة (ServiceProvider)
else if (role === "serviceProvider") {
      const images = getImagesPaths(req.files);
      const { fullName, username, email, phone, serviceType } = req.body;
      
      let schemaServiceType = "1"; 
      if (serviceType === "winch") schemaServiceType = "1";
      else if (serviceType === "tirefilling" || serviceType === "tire Filling") schemaServiceType = "2";
      else if (serviceType === "battery" || serviceType === "battery Jumpstart") schemaServiceType = "3";

      let provider = await serviceProvider.findOneAndUpdate(
        { phone },
        { 
          ...req.body,
          username: username || fullName, 
          password: hashedPassword, 
          status: "pending",
          serviceType: schemaServiceType,
          profileImage: images.profileImage || "",
          nationalIdImage: images.nationalIdImage || "",
          licenseImage: images.licenseImage || "",
          carRegistrationImage: images.carRegistrationImage || "",
          carImage: images.carImage || ""
        },
        { upsert: true, new: true }
      );

      const verificationData = { providerId: provider._id, ...req.body, username: username || fullName, ...images, status: 'pending' };
      if (serviceType === "winch") {
        await Winsh.create({ ...verificationData, serviceType: 'winch' });
      } else {
        await TireVerification.create({ ...verificationData, serviceType: serviceType.includes("tire") ? "tire Filling" : "battery Jumpstart" });
      }
      return res.status(200).send({ status: true, code: 200, message: "تم التقديم بنجاح" });
    }
  } catch (err) { next(err); }
};
const addLocationForProvider = async (req, res, next) => {
  try {

    const lang = req.headers['accept-language'] || 'en';
    const providerId = req.user.id;
    const role = req.user.role;
    if (role == 'serviceProvider') {
      const { location } = req.body;
      console.log(typeof location.long);
      if (!location || typeof location !== 'object' || location.lat === undefined || location.long === undefined) {
        return res.status(400).json({
          status: false,
          code: 400,
          message: lang === 'ar'
            ? 'يجب إرسال إحداثيات الموقع (lat, long)'
            : 'Location with lat and long is required',
        });
      }



      console.log(req.body.location);
      await serviceProvider.findOneAndUpdate({ _id: providerId }, { location: req.body.location }, { new: true });
      return res.status(200).send({
        status: true,
        code: 200,
        message: lang === "en" ? "Location updated successfully" : "تم تحديث الموقع بنجاح"
      });


    }



  }
  catch (error) {
    next(error)
  }
}

const login = async (req, res, next) => {
  try {

    
    const lang = req.headers['accept-language'] || 'en';
    const messages = getMessages(lang);

    const { error } = loginSchema(lang).validate(req.body);
    if (error) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: error.details[0].message
      });
    }

    const { phone, password, role, fcmToken } = req.body;

    // ----------------------
    // الحالة: Rental Office
    // ----------------------
    if (role === "rentalOffice") {
      console.log(phone)
      let existRentalOffice = await rentalOffice.findOne({ phone:phone, isDeleted: false  });
      console.log(existRentalOffice)
      if (!existRentalOffice) {
        return res.status(400).send({
          code: 400,
          status: false,
          message: lang === "en" ? "This rental office does not exist" : "هذا المكتب غير موجود"

        })
      }
      if (existRentalOffice.status === "refused") {
        return res.status(200).send({
          status: true,
          code: 200,
          message: lang === "en" ? "Your request has been rejected" : "تم رفض الطلب"
        });
      }
      if (existRentalOffice.status === "pending") {
        return res.status(400).send({
          status: false,
          code: 400,
          message: lang === "en" ? "Your request is under review" : "جارى مراجعه الطلب"
        });
      }

      // تحقق من الباسورد
      const match = await bcrypt.compare(password, existRentalOffice.password);
      if (!match) {
        return res.status(400).send({
          code: 400,
          status: false,
          message: messages.login.incorrectData
        });
      }
      await rentalOffice.findOneAndUpdate({ phone: phone }, { fcmToken: fcmToken })
      const token = jwt.sign({ id: existRentalOffice._id, role: "rentalOffice" }, process.env.JWT_SECRET);
      return res.status(200).send({
        code: 200,
        status: true,
        message: messages.login.success,
        data: {
          user: {
            _id: existRentalOffice._id,
            username: existRentalOffice.username,
            image: existRentalOffice.image,
            phone: existRentalOffice.phone,
            email: existRentalOffice.email,
            password: existRentalOffice.password,
            likedBy: existRentalOffice.likedBy,
            createdAt: existRentalOffice.createdAt,
            __v: 0,

          },
          token
        }
      });

    }
// ----------------------
// الحالة: Service Provider
// ----------------------
if (role === "serviceProvider") {
    const cleanPhone = phone.trim();
    const existServiceProvider = await serviceProvider.findOne({ phone: cleanPhone, isDeleted: false });

    // ✅ حالة 1: الحساب موجود (تسجيل دخول)
    if (existServiceProvider) {
      console.log("3. تم العثور على موفر الخدمة. حالته حالياً:", existServiceProvider.status);
      const match = await bcrypt.compare(password, existServiceProvider.password);
      console.log("4. نتيجة مطابقة الباسورد:", match);
      if (!match) {
          console.log("❌ خطأ: كلمة المرور غير مطابقة");
            return res.status(400).send({
                code: 400,
                status: false,
                message: messages.login.incorrectData
            });
        }

        // جلب بيانات التوثيق
        const [winchData, tireData] = await Promise.all([
            mongoose.model('winshVerification').findOne({ providerId: existServiceProvider._id }),
          mongoose.model('TireVerification').findOne({ providerId: existServiceProvider._id }),
          serviceProvider.findById(existServiceProvider._id)
        ]);
        const additionalInfo = winchData || tireData;
        // التحقق من الحالة (مقبول، مرفوض، معلق)
      if (existServiceProvider.status === "refused") {
          console.log("❌ خطأ: الحساب مرفوض (refused)");
            return res.status(200).send({ status: true, code: 200, message: lang === "en" ? "Refused" : "تم رفض الطلب" });
        }
      if (existServiceProvider.status !== "accepted") {
          console.log("❌ خطأ: الحساب ليس accepted. حالته:", existServiceProvider.status);
            return res.status(400).send({ status: false, code: 400, message: lang === "en" ? "Under review" : "جارى مراجعه الطلب" });
        }

      // إنشاء التوكن وتحديث الـ FCM
      console.log("✅ كل الشروط تمام.. جاري إصدار التوكن والدخول");
        const token = jwt.sign({ id: existServiceProvider._id, identifier: existServiceProvider.phone, role: "serviceProvider" }, process.env.JWT_SECRET);
        await serviceProvider.findOneAndUpdate({ phone: cleanPhone }, { fcmToken: fcmToken });

        return res.status(200).send({
            code: 200,
            status: true,
            message: messages.login.success,
            data: {
              user: {
                    _id: existServiceProvider._id,
                    username: (winchData || tireData)?.fullName || existServiceProvider.username,
                    phone: existServiceProvider.phone,
                serviceType: existServiceProvider.serviceType,
                image: existServiceProvider.profileImage,
                    nationalIdImage: additionalInfo?.nationalIdImage || "",
            licenseImage: additionalInfo?.licenseImage || "",
            carRegistrationImage: additionalInfo?.carRegistrationImage || "",
            carImage: additionalInfo?.carImage || "",
                email: existServiceProvider.email,
                status: existServiceProvider.status,
                    
                },
                token
            }
        });

    } 
    // 🆕 حالة 2: الحساب غير موجود (إنشاء تلقائي للـ OTP)
    else {
      console.log("⚠️ الحساب غير موجود.. جاري البدء في الإنشاء التلقائي");
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // تحديد النوع عشان ما ينزل "ونش" بالغلط
        let finalType = "1"; 
        if (req.body.serviceType === "tire Filling" || req.body.serviceType === "tirefilling") finalType = "2";
        else if (req.body.serviceType === "battery Jumpstart" || req.body.serviceType === "battery") finalType = "3";

      const newProvider = await serviceProvider.create({
          username: req.body.username || "Provider", 
          email: req.body.email || "",
          password: hashedPassword,
          phone: cleanPhone,
          status: "pending",
          serviceType: finalType,
      });

      const otp = 1111;
      await Otp.create({ phone: cleanPhone, otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

      return res.status(200).send({ 
          status: true, 
          code: 200,
          data: {
              _id: newProvider._id  // ← هنا
          },
          message: lang === "ar" ? "تم إنشاء الحساب، يرجى تفعيل الرمز" : "Account created, please verify OTP" 
      });
    }
}

    // ----------------------
    // الحالة: User
    // ----------------------
    if (role === "user") {
      // const existUser = await User.findOne({ phone, isDeleted: false });//.populate("categoryCenterId");
     
     
      const existUser = await User.findOne({ phone, $or: [{ isDeleted: false },{ isDeleted: { $exists: false } } ]  }).populate("categoryCenterId");
     

      if (!existUser) {
        return res.status(400).send({
          status: false,
          code: 400,
          message: messages.login.emailExists.user
        });
      }
      const userAsRentalOffice = await rentalOffice.findOne({ phone })
   

      const match = await bcrypt.compare(password, existUser.password);
      if (!match) {
        return res.status(400).send({
          code: 400,
          status: false,
          message: messages.login.incorrectData
        });
      }

      const token = jwt.sign({ id: existUser._id, role: "user" }, process.env.JWT_SECRET);
      const haveService = await CenterService.findOne({ centerId: existUser._id });
      const following = await CenterFollower.find({ userId: existUser._id });
      const followers = await CenterFollower.find({ centerId: existUser._id });
      const favorite = await Favorite.find({ userId: existUser._id, entityType: "User" });
      let ratings;
      ratings = await RatingCenter.find({ centerId: existUser._id });
      const allRatings = ratings.map(r => r.rating);
      const avgRating =
        allRatings.length > 0
          ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
          : 0;
      await User.findOneAndUpdate({ phone: phone }, { fcmToken: fcmToken });
      return res.status(200).send({
        
        code: 200,
        status: true,
        message: messages.login.success,
        data: {
          user: {
            _id: existUser._id,
            username: existUser.username,
            image: existUser.image,
            phone: existUser.phone,
            email: existUser.email,
            password: existUser.password,
            likedBy: existUser.likedBy,
            avgRating: avgRating,
            favorite: favorite.length,
            followers: followers.length,
            following: following.length,
            createdAt: existUser.createdAt,
            subscribeAsRntalOffice: userAsRentalOffice ? true : false,
            categoryId: existUser.categoryCenterId?._id || "user",
            category: existUser.categoryCenterId?.name.en || "user",
            haveService: haveService ? true : false,
            role: existUser.isProvider ? "provider" : "user",
            createdAt: existUser.createdAt,
            updatedAt: existUser.updatedAt,
            __v: 0,
            centerStatus: existUser.centerStatus || "none",
            pendingData: existUser.pendingData || null,
          },
          token
        }
      });
    }

    // ----------------------
    // الحالة: دور غير معروف
    // ----------------------
    return res.status(400).send({
      code: 400,
      status: false,
      message: lang === "en" ? "Invalid role" : "الدور غير صالح"
    });

  } catch (err) {
    next(err);
  }
};
const requestResetPassword = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const { phone, role } = req.body;
    let Model;

    switch (role) {
      case 'user':
        Model = User;
        break;
      case 'serviceProvider':
        Model = serviceProvider;
        break;
      case 'rentalOffice':
        Model = rentalOffice;
        break;
      default:
        return res.status(400).send({
          status: false,
          code: 400,
          message: lang == "ar" ? "هذا الدور غير موجود" : "role must be serviceProvider or User or rentalOffice"
        });
    }

    const user = await Model.findOne({ phone });
    if (!user) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: lang == "ar" ? "هذا الرقم غير موجود" : "this phone does not exist"
      });
    }

    const otp = 1111 /*Math.floor(100000 + Math.random() * 900000)*/;
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    res.send({
      code: 200,
      status: true,
      message: lang == "ar" ? "تم ارسال الكود بنجاح" : "Code sent successfully"
    });
  } catch (err) {
    next(err);
  }
};
const verifyCode = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const { phone, otp } = req.body;

    // تحديد الموديل بناءً على الـ role
    let Model;
    switch (role) {
      case 'user':
        Model = User;
        break;
      case 'serviceProvider':
        Model = serviceProvider;
        break;
      case 'rentalOffice':
        Model = rentalOffice;
        break;
      default:
        return res.status(400).send({
          code: 400,
          status: false,
          message: lang == "en" ? "Invalid role" : "هذا الدور غير موجود"
        });
    }

    const user = await Model.findOne({ phone });

    if (
      !user ||
      user.resetOtp != otp || // تطابق الكود
      !user.resetOtpExpires ||
      user.resetOtpExpires < new Date() // تحقق من انتهاء صلاحية الكود
    ) {
      return res.status(400).send({
        status: false,
        message: lang == "en" ? "Invalid or expired OTP" : "الكود غير صحيح أو انتهت صلاحيته"
      });
    }
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;

    await user.save();

    res.status(200).send({
      code: 200,
      status: true,
      message: lang == "en" ? "Password reset successfully" : "تم تحديث الباسورد بنجاح"
    });
  } catch (err) {
    next(err);
  }
}
const resetPassword = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const { phone, newPassword, role } = req.body;

    // تحديد الموديل بناءً على الـ role
    let Model;
    switch (role) {
      case 'user':
        Model = User;
        break;
      case 'serviceProvider':
        Model = serviceProvider;
        break;
      case 'rentalOffice':
        Model = rentalOffice;
        break;
      default:
        return res.status(400).send({
          code: 400,
          status: false,
          message: lang == "en" ? "Invalid role" : "هذا الدور غير موجود"
        });
    }

    const user = await Model.findOne({ phone });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).send({
      code: 200,
      status: true,
      message: lang == "en" ? "Password reset successfully" : "تم تحديث الباسورد بنجاح"
    });
  } catch (err) {
    next(err);
  }
};
const changePassword = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const role = req.user.role;
    console.log("role from token:", req.user.role);
    const { error } = changePasswordSchema(lang).validate(req.body);
    if (error) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: error.details[0].message
      });
    }
    const { oldPassword, newPassword } = req.body;
    const id = req.user.id;
    let Model;
    switch (role) {
      case 'admin':
        Model = Admin;
        break;
      case 'user':
        Model = User;
        break;
      case 'serviceProvider':
        Model = serviceProvider;
        break;
      case 'rentalOffice':
        Model = rentalOffice;
        break;
      default:
        return res.status(400).send({
          status: false,
          code: 400,
          message: lang == "ar" ? "هذا الدور غير موجود" : "role must be serviceProvider or User or rentalOffice"
        });
    }
    const exist = await Model.findOne({ _id: id });
    const match = await bcrypt.compare(oldPassword, exist.password);
    if (!match) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: lang == "en" ? "old password incorrect try again!" : "الباسورد القديمه غير صحيحه حاول مره اخرى"
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    exist.password = hashedPassword;
    await exist.save();
    return res.status(200).send({
      code: 200,
      status: true,
      message: lang == "en" ? "Password changed successfully" : "تم تحديث الباسورد بنجاح"
    })



  }
  catch (error) {
    next(error)
  }
}
const changePasswordV2 = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const { error } = changePasswordSchema(lang).validate(req.body);
    if (error) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: error.details[0].message
      });
    }

    const { oldPassword, newPassword, role, id } = req.body; // ← role من البودي

    const modelsMap = { admin: Admin, user: User, serviceProvider, rentalOffice };

    if (!role || !modelsMap[role]) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "الرول غير صحيح" : "Invalid role"
      });
    }

    const exist = await modelsMap[role].findById(id);

    if (!exist) {
      return res.status(404).send({
        status: false,
        code: 404,
        message: lang === 'ar' ? "المستخدم غير موجود" : "User not found"
      });
    }

    const match = await bcrypt.compare(oldPassword, exist.password);
    if (!match) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: lang === 'ar' ? "الباسورد القديمه غير صحيحه حاول مره اخرى" : "old password incorrect try again!"
      });
    }

    exist.password = await bcrypt.hash(newPassword, 10);
    await exist.save();

    return res.status(200).send({
      code: 200,
      status: true,
      message: lang === 'ar' ? "تم تحديث الباسورد بنجاح" : "Password changed successfully"
    });

  } catch (error) {
    next(error);
  }
};
const getProfileData = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const role = req.user.role;
    const id = req.user.id;
    let Model;

    switch (role) {
      case 'user': Model = User; break;
      case 'serviceProvider': Model = serviceProvider; break;
      case 'rentalOffice': Model = rentalOffice; break;
      default:
        return res.status(400).send({
          status: false,
          code: 400,
          message: lang == "ar" ? "هذا الدور غير موجود" : "Role must be serviceProvider, User, or rentalOffice"
        });
    }

    const exist = await Model.findOne({ _id: id }).lean();
    if (!exist) return res.status(404).send({ status: false, message: "Not Found" });

    let formatedData = { ...exist };

    if (role == "serviceProvider") {
      // 1. محاولة جلب بيانات الونش
      let verification = await Winsh.findOne({ providerId: exist._id });
      let accountType = lang == "en" ? "Service Provider" : "مقدم خدمة"; // افتراضي

      if (verification) {
        accountType = lang == "en" ? "Winch" : "ونش";
      } else {
        // 2. إذا لم يوجد ونش، نبحث في الكفرات
        verification = await Tire.findOne({ providerId: exist._id });
        if (verification) {
          const sType = verification.serviceType;
          if (lang == "ar") {
            if (sType === 'tire Filling') accountType = "تعبئة كفر";
            else if (sType === 'battery Jumpstart') accountType = "اشتراك بطارية";
            else accountType = "تعبئة كفر واشتراك بطارية";
          } else {
            accountType = sType;
          }
        }
      }

      // 3. تجميع البيانات (مع التأكد من وجود verification لتجنب خطأ الـ nationalId)
      formatedData = {
        ...exist,
        nationalId: verification ? verification.nationalId : null,
        accountType: accountType 
      };
    }

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang == "en" ? "Data retrieved successfully" : "تم جلب البيانات بنجاح",
      data: formatedData
    });

  } catch (error) {
    next(error);
  }
};
const editProfile = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const id = req.user.id;
    const role = req.user.role;
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    let Model;

    switch (role) {
      case 'admin':
        Model = Admin;
        break;
      case 'user':
        Model = User;
        break;
      case 'rentalOffice':
        Model = rentalOffice;
        break;
      case 'serviceProvider':
        Model = serviceProvider;
        break;
      default:
        return res.status(400).send({
          status: false,
          code: 400,
          message: lang === "ar"
            ? "هذا الدور غير موجود"
            : "Role must be serviceProvider or User or rentalOffice"
        });
    }

    let updateData = {};

    // ✅ لو فيه يوزرنيم جديد
    if (req.body.username) updateData.username = req.body.username;

    // ✅ لو فيه إيميل جديد
    if (req.body.email) {
      updateData.email = req.body.email;
    }

    // ✅ لو فيه صورة جديدة
    if (req.file) {
      const file = req.file;
      const exist = await Model.findById(id);
      if (exist && exist.image) {
        try {
          // شيل الـ BASE_URL + /images/ من بداية المسار
          const imageName = exist.image.replace(`${BASE_URL}/images/`, "");
          const oldPath = path.join("/var/www/images", imageName);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (err) {
          console.error("⚠️ Failed to delete old image:", err.message);
        }
      }
      const url = saveImage(file);
      updateData.image = `${BASE_URL}${url}`;
    }

    // ✅ لو مفيش حاجة للتحديث
    if (Object.keys(updateData).length === 0) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "en"
          ? "No data provided to update"
          : "لم يتم إدخال أي بيانات للتحديث"
      });
    }

    // ✅ تحديث البيانات باستخدام الـ Model المناسب
    await Model.findByIdAndUpdate(id, updateData, { new: true });

    return res.send({
      status: true,
      code: 200,
      message: lang === "en"
        ? "Profile updated successfully"
        : "تم تحديث الملف الشخصي بنجاح"
    });

  } catch (error) {
    next(error);
  }
};
const logout = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Logged out successfully" : "تم تسجيل الخروج بنجاح"
    });
  } catch (err) {
    next(err);
  }
};
  const userAsProvider = async (req, res, next) => {
    try {
      const lang = req.headers['accept-language'] || 'en';
      const id = req.user.id;

      const existUser = await User.findOne({ _id: id });
      if (!existUser) {
        return res.status(400).send({
          status: false,
          code: 400,
          message: lang == "ar" ? "هذا المستخدم غير موجود" : "This user does not exist"
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).send({
          status: false,
          code: 400,
          message: lang == "ar" ? "الصورة مطلوبة" : "Image is required"
        });
      }

      // ✅ استخرج lat,long من البودي
      const { lat, long } = req.body;

      if (!lat || !long) {
        return res.status(400).send({
          status: false,
          code: 400,
          message: lang == "ar" ? "الموقع (lat, long) مطلوب" : "Location (lat, long) is required"
        });
      }

      // ✅ جهز location object
      req.body.location = {
        type: "Point",
        coordinates: [parseFloat(long), parseFloat(lat)] // [longitude, latitude]
      };

      // ❌ امسح الـ lat,long علشان مش محتاجينهم في الموديل
      delete req.body.lat;
      delete req.body.long;

      // ✅ Validation بعد ما ضفت location
      const { error } = userAsProviderSchema(lang).validate(req.body);
      if (error) {
        return res.status(400).send({
          status: false,
          code: 400,
          message: error.details[0].message
        });
      }

      // ✅ حفظ الصورة
      let imageUrl = saveImage(file);
      imageUrl = `${process.env.BASE_URL}${imageUrl}`;

      await User.findByIdAndUpdate(id, {
        categoryCenterId: req.body.categoryCenterId,
        centerStatus: "pending",
        pendingData:{
          image: imageUrl,
          username: req.body.username,
          whatsAppNumber: req.body.whatsAppNumber,
          email: req.body.email,
          cityId: req.body.cityId,
          areaId: req.body.areaId,
          details: req.body.details,
          subCategoryCenterId: req.body.subCategoryCenterId,
          tradeRegisterNumber: req.body.tradeRegisterNumber,
          nationalId: req.body.nationalId,
          location: req.body.location
        }
      });


      return res.status(200).send({
        status: true,
        code: 200,
        message: lang == "ar" ? "تم التقديم بنجاح" : "Submitted successfully"
      });

    } catch (err) {
      next(err);
    }
  };
const acceptUserAsProvider = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const userId = req.params.userId;
    const status = req.body.status; // accepted or refused

    const existUser = await serviceProvider.findOne({ _id: userId });
    if (!existUser) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "ar" ? "هذا المستخدم غير موجود" : "this user does not exist"
      });
    }

    if (status === "refused") {
      await sendNotification({
        target: existUser._id,
        targetType: "serviceProvider",
        titleAr: "تم رفض طلبك",
        titleEn: "Your account has been refused",
        messageAr: "للأسف تم رفض طلبك كمقدم خدمة. يرجى مراجعة المعلومات المقدمة والمحاولة مرة أخرى",
        messageEn: "Unfortunately, your request to become a service provider has been refused. Please review the provided information and try again.",
        lang: lang,
        actionType: "provider",
      });
      return res.status(200).send({
        status: true,
        code: 200,
        message: lang == "ar" ? "تم رفض الطلب" : "request refused"
      });

    }


    else if (status === "accepted") {
      await serviceProvider.findByIdAndUpdate(userId, { isProvider: true });
      await sendNotification({
        target: existUser._id,
        targetType: "serviceProvider",
        titleAr: "تمت الموافقة على حسابك ",
        titleEn: "Your account has been approved",
        messageAr: "تهانينا! تم قبولك كمقدم خدمة ويمكنك الآن استخدام التطبيق",
        messageEn: "Congratulations! Your account has been approved and is now active.",
        lang: lang,
        actionType: "provider",
      });

      return res.status(200).send({
        status: true,
        code: 200,
        message: lang == "ar" ? "تم القبول بنجاح" : "accepted successfully"
      });
    }
  }
  catch (err) {
    next(err)
  }
}
const getCenters = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const mainCategoryCenterId = req.params.id;
    const userId = req.user.id;

    // 🟢 pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 🟢 lat/long
    const lat = parseFloat(req.query.lat);
    const long = parseFloat(req.query.long);

    // 🟢 filters
    const { cityId, search, nameId, typeId, modelId } = req.query;

    // 🟢 base match query
    const matchQuery = {
      categoryCenterId: new mongoose.Types.ObjectId(mainCategoryCenterId),
      centerStatus: "accepted",
      ...(cityId ? { cityId: new mongoose.Types.ObjectId(cityId) } : {}),
      ...(search ? { username: { $regex: search, $options: "i" } } : {}),
      ...(nameId ? { brand: new mongoose.Types.ObjectId(nameId) } : {}),
      ...(typeId ? { typeIds: new mongoose.Types.ObjectId(typeId) } : {}),
      ...(modelId ? { modelIds: new mongoose.Types.ObjectId(modelId) } : {}),
    };

    // 🟢 aggregation pipeline
    const pipeline = [];

    if (!isNaN(lat) && !isNaN(long)) {
      // لو فيه lat/long
      pipeline.push({
        $geoNear: {
          near: { type: "Point", coordinates: [long, lat] },
          distanceField: "distance",
          maxDistance: 50000, // 5 km
          spherical: true,
          query: matchQuery,
        },
      });
    } else {
      // لو مفيش lat/long
      pipeline.push({ $match: matchQuery });
    }
    
// 1. إضافة الـ Lookup لربط المستخدم بجدول الخدمات
    pipeline.push(
      {
        $lookup: {
          from: CenterService.collection.name, // سيجلب "centerservices" تلقائياً
          let: { userId: { $toString: "$_id" } }, // تحويل ObjectId إلى String للمطابقة
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$centerId", "$$userId"] }
              }
            }
          ],
          as: "servicesData",
        },
      },
      // 2. الفلترة: استبعاد أي مركز ليس لديه خدمات مضافة
      {
        $match: {
          "servicesData.0": { $exists: true } 
        }
      }
    );

    pipeline.push(
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "subcategorycenters",
          localField: "subCategoryCenterId",
          foreignField: "_id",
          as: "subCategoryCenterId",
        },
      },
      {
        $lookup: {
          from: "cities",
          localField: "cityId",
          foreignField: "_id",
          as: "cityId",
        },
      },
      {
        $project: {
          username: 1,
          image: 1,
          details: 1,
          location: 1,
          storeVisitorsCount: 1,
          subCategoryCenterId: { $arrayElemAt: ["$subCategoryCenterId", 0] },
          cityId: { $arrayElemAt: ["$cityId", 0] },
          distance: 1,
          firstService: { $arrayElemAt: ["$servicesData", 0] }
        },
      }
    );

    const centers = await User.aggregate(pipeline);

    // 🟢 collect centerIds
    const centerIds = centers.map((c) => c._id.toString());

    const ratings = await RatingCenter.aggregate([
      {
        $addFields: {
          centerIdStr: { $toString: "$centerId" }
        }
      },
      {
        $match: { centerIdStr: { $in: centerIds } }
      },
      {
        $group: {
          _id: "$centerIdStr",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("✅ Ratings found:", ratings);

    // 🟢 rating map
    const ratingMap = {};
    ratings.forEach((r) => {
      ratingMap[r._id.toString()] = {
        avgRating: r.avgRating,
        count: r.count,
      };
    });

    // 🟢 format response with favorites
    const formattedCenters = await Promise.all(
      centers.map(async (center) => {
        const r = ratingMap[center._id.toString()] || { avgRating: 0, count: 0 };

        if (userId && userId !== center._id.toString()) {
      try {
        await StoreVisitor.create({
          storeId: center._id,
          visitorId: userId
        });

        await User.updateOne(
          { _id: center._id },
          { $inc: { storeVisitorsCount: 1 } }
        );

        center.storeVisitorsCount += 1; // تحديث الرقم في النسخة الحالية المعروضة
      } catch (err) {
        // إذا كان Duplicate (زار مسبقاً) لا نفعل شيئاً
      }
        }
        
        const existFavorite = await Favorite.findOne({
          userId: userId,
          entityId: center._id,
          entityType: "User",
        });

        return {
          id: center._id,
          username: center.username,
          image: center.image,
          details: center.details,
          city: center.cityId?.name?.[lang] || "",
          category: center.subCategoryCenterId?.name?.[lang] || "",
          rating: r.avgRating ? parseFloat(r.avgRating.toFixed(2)) : 0.0,
          isFavorite: !!existFavorite,
          visitorsCount: center.storeVisitorsCount || 0
        };
      })
    );

    return res.status(200).send({
      status: true,
      code: 200,
      message:
        lang === "ar" ? "تم جلب البيانات بنجاح" : "Data retrieved successfully",
      data: {
        centers: formattedCenters,
        pagination: {
          page,
          totalPages: Math.ceil(centerIds.length / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
const getProfileDataForCenters = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const centerId = req.params.id;
    const center = await User.findById(centerId).select('username image details location whatsAppNumber phone').populate("cityId").lean();
    const isFollowed = await centerFollower.findOne({ userId: req.user.id, centerId: centerId });
    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en"
        ? "center profile data retrieved successfully"
        : "تم استرجاع بيانات ملف المركز بنجاح",
      data: {
        ...center,
        location: {
          long: center.location.coordinates[0],
          lat: center.location.coordinates[1],
        },
        cityId: undefined,
        city: center.cityId?.name?.[lang] || "",
        isFollowed: !!isFollowed
      }
    })

  }
  catch (error) {
    next(error)
  }
}
const userAsAutoSalvage = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const id = req.user.id;

    const existUser = await User.findOne({ _id: id });
    if (!existUser) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "ar" ? "هذا المستخدم غير موجود" : "This user does not exist"
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "ar" ? "الصورة مطلوبة" : "Image is required"
      });
    }
    if (!Array.isArray(req.body.brand)) {
      req.body.brand = [req.body.brand];
    }
    const { error } = userAsAutoSalvageSchema(lang).validate(req.body);
    if (error) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: error.details[0].message
      });
    }

    // ✅ حفظ الصورة
    let imageUrl = saveImage(file);
    imageUrl = `${process.env.BASE_URL}${imageUrl}`;
    const centercategory = await MainCategoryCenter.find({})
    const existcategory = centercategory.find((cat) => cat.name.en == "Auto Salvage");
    await User.findByIdAndUpdate(id, {
      image: imageUrl,
      username: req.body.username,
      categoryCenterId: existcategory._id,
      brand: req.body.brand,
      service: req.body.service,
      cityId: req.body.cityId
    });
    /*
    const admin = await Admin.find({});
    await sendNotificationToMany({
      target: admin,
      targetType: "admin",
      titleAr: "طلب تسجيل مقدم خدمة تشليح جديد",
      titleEn: "New Scrap Service Provider Registration",
      messageAr: `المستخدم ${existUser.username} قدّم طلب تسجيل كمقدم خدمة تشليح`,
      messageEn: `User ${existUser.username} has submitted a request to become a scrap service provider`,
      lang: lang,
      actionType: "scrap_provider_request",
    });
    */
    return res.status(200).send({
      status: true,
      code: 200,
      message: lang == "ar" ? "تم التقديم بنجاح" : "Submitted successfully"
    });

  }
  catch (err) {
    next(err)
  }
}
const getUserData = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const userId = req.user.id; // المعرف المستخرج من التوكن

    // 1. البحث الشامل في الجداول (Users, RentalOffice, ServiceProvider)
    let existUser = await User.findById(userId).populate("categoryCenterId");
    let userTable = 'users';

    if (!existUser) {
      existUser = await rentalOffice.findById(userId);
      if (existUser) userTable = 'rentalOffice';
    }

    if (!existUser) {
      existUser = await serviceProvider.findById(userId);
      if (existUser) userTable = 'serviceProvider';
    }

    // إذا لم يعثر على المستخدم نهائياً (حل مشكلة الـ 400)
    if (!existUser) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "المستخدم غير موجود" : "User does not exist"
      });
    }

    // 2. البحث في جداول التوثيق (Verification) لتحديد نوع الخدمة بدقة
    let accountType = "";
    const isProvider = (userTable === 'serviceProvider');

    if (isProvider) {
      // البحث في جداول التوثيق الخاصة بالونش والكفرات والبطارية
      const [winchData, tireData] = await Promise.all([
        mongoose.model('winshVerification').findOne({ providerId: userId }),
        mongoose.model('TireVerification').findOne({ providerId: userId })
      ]);

      if (winchData) {
        accountType = lang === 'ar' ? "ونش وسطحة" : "Winch Service";
      } else if (tireData) {
        // فحص نوع الخدمة المختار في جدول الكفرات والبطارية
        const sType = tireData.serviceType;
        if (lang === 'ar') {
          if (sType === 'tire Filling') accountType = "تعبئة كفر";
          else if (sType === 'battery Jumpstart') accountType = "اشتراك بطارية";
          else if (sType === 'tire Filling and battery Jumpstart') accountType = "تعبئة كفر واشتراك بطارية";
        } else {
          accountType = sType;
        }
      } else {
        accountType = lang === 'ar' ? "مقدم خدمة" : "Service Provider";
      }
    } else if (userTable === 'rentalOffice') {
      accountType = lang === 'ar' ? "مكتب تأجير" : "Rental Office";
    } else if (existUser.categoryCenterId) {
      // إذا كان مركزاً، نسحب الاسم من جدول الأقسام
      accountType = existUser.categoryCenterId.name[lang] || existUser.categoryCenterId.name.ar;
    } else {
      accountType = lang === 'ar' ? "عميل موثق" : "Verified Client";
    }

    // 3. تطبيق منطق "تجريبي" إذا كانت الحالة pending
    if (existUser.status === "pending" || existUser.status === "unverified") {
      accountType = lang === 'ar' ? "تجريبي" : "Trial";
    }

const targetId = existUser._id;

    // 1. تعريف الموديلات يدوياً للاحتياط
    const ProviderRating = mongoose.models.ProviderRating || mongoose.model('ProviderRating');
    const RatingCenter = mongoose.models.RatingCenter || mongoose.model('RatingCenter');

    // 2. تنفيذ كل الاستعلامات (تأكد من ترتيب المصفوفة)
    const [followers, following, favoriteCount, providerRatings, centerRatings, hasService] = await Promise.all([
      centerFollower.countDocuments({ centerId: targetId }),
      centerFollower.countDocuments({ userId: targetId }),
      Favorite.countDocuments({ entityId: { $in: [targetId, targetId.toString()] } }),
      
      // جلب التقييمات (هنا البحث بـ userId لأنك تبحث لليوزر العادي)
      ProviderRating.find({ userId: targetId }).lean(),
      // جلب تقييمات المراكز (احتياطاً)
      RatingCenter.find({ centerId: targetId }).lean(),
      
      CenterService.findOne({ centerId: targetId })
    ]);

    // 3. حساب متوسط التقييم (دمج النتائج)
    const allRatings = [...(providerRatings || []), ...(centerRatings || [])];
    const avgRating = allRatings.length > 0 
      ? (allRatings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / allRatings.length) 
      : 0;
    // 5. الرد النهائي
    return res.status(200).send({
      code: 200,
      status: true,
      message: lang === "en" ? "Success" : "تم بنجاح",
      data: {
        user: {
          ...existUser.toObject(),
          accountType: accountType,
          role: (userTable !== 'users' || !!existUser.categoryCenterId) ? "provider" : "user",
          subscribeAsRntalOffice: userTable === 'rentalOffice',
          category: existUser.categoryCenterId ? existUser.categoryCenterId.name[lang] || existUser.categoryCenterId.name.ar : null,
          categoryId: existUser.categoryCenterId ? existUser.categoryCenterId._id : null,
          avgRating: parseFloat(avgRating.toFixed(1)),
          followers: followers,
          following: following,
          favoriteCount: favoriteCount,
          haveService: !!hasService
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
const deleteAccount = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const { type, id } = req.body;
    let Model;
    switch (type) {
      case "user":
        Model = User;
        break;
      case "rentaloffice":
        Model = rentalOffice;
        break;
      case "serviceprovider":
        Model = serviceProvider;
        break;
    }
    await Model.findByIdAndUpdate(id, {
      isDeleted: true,
    });

    return res.status(200).send({
      code: 200,
      status: true,
      message:lang=="en"?"Account soft deleted successfully":"تم حذف الحساب بنجاح"
    });

  } catch (err) {
    next(err);
  }
}





module.exports = {
  register,
  login,
  requestResetPassword,
  resetPassword,
  changePassword,
  changePasswordV2,
  addLocationForProvider,
  getProfileData,
  editProfile,
  getCenters,
  acceptUserAsProvider,
  logout,
  userAsProvider,
  getProfileDataForCenters,
  getUserData,
  userAsAutoSalvage,
  verifyCode,
  deleteAccount
}