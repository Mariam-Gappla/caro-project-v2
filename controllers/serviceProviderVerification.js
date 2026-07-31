const winsh = require("../models/winsh");
const tire = require("../models/tire");
const { winshSchema, winshImagesSchema } = require("../validation/winshValidition");
const { tireSchema, tireImagesSchema } = require("../validation/tireRefilling");
const serviceProvider = require("../models/serviceProvider");
const path = require("path");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const saveImage = (file, folder = 'images') => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const saveDir = path.join(__dirname, '..', folder);
  const filePath = path.join(saveDir, fileName);

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  fs.writeFileSync(filePath, file.buffer);
  return `/images/${fileName}`;
};

const submitWinchVerification = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: lang === "en" ? "Token not provided" : "لم يتم تقديم التوكن"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: lang === "en" ? "Invalid token" : "توكن غير صالح"
      });
    }

    const phone = decoded.identifier;
    const provider = await serviceProvider.findOne({ phone });
    if (!provider) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "en" ? "this provider does not exist" : "موفر الخدمه غير موجود"
      });
    }

    const existing = await winsh.findOne({ providerId: provider._id });
    if (existing) {
      // تحديث البيانات حتى لو كان موجوداً سابقاً كما في كودك الأصلي
      await serviceProvider.findOneAndUpdate(
        { _id: provider._id },
        { username: req.body.fullName, email: req.body.email },
        { new: true }
      );
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "en" ? "You have already submitted a verification request." : "لقد قمت بالفعل بتقديم طلب تحقق.",
      });
    }
    if (req.body.birthDate && req.body.birthDate.includes('-')) {
      const parts = req.body.birthDate.split("-");
      // إذا كان التاريخ جاي (يوم-شهر-سنة) نعكسه لـ (سنة-شهر-يوم)
      if (parts[0].length <= 2 && parts[2].length === 4) {
        req.body.birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const { error } = winshSchema(lang).validate({
      providerId: (provider._id).toString(),
      ...req.body
    });

    if (error) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: error.details[0].message
      });
    }

    // ✅ التعديل: تحديث الاسم والإيميل في جدول الـ serviceProvider الأساسي فور الإرسال
    await serviceProvider.findByIdAndUpdate(provider._id, {
      username: req.body.fullName,
      email: req.body.email
    });

    const verification = await winsh.create({
      providerId: provider._id,
      fullName: req.body.fullName,
      nationality: req.body.nationality,
      nationalId: req.body.nationalId,
      birthDate: req.body.birthDate,
      email: req.body.email,
      iban: req.body.iban,
      bankAccountName: req.body.bankAccountName,
      serviceType: req.body.serviceType,
      winchType: req.body.winchType,
      carPlateNumber: req.body.carPlateNumber,
    });

    res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Verification request submitted successfully." : "تم إرسال طلب التحقق بنجاح",
    });

  } catch (error) {
    next(error);
  }
};

const uploadWinchImages = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    const files = req.files;

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: lang === "en" ? "Token not provided" : "لم يتم تقديم التوكن"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: lang === "en" ? "Invalid token" : "توكن غير صالح"
      });
    }

    const phone = decoded.identifier;
    const provider = await serviceProvider.findOne({ phone });
    if (!provider) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "en" ? "this provider does not exist" : "موفر الخدمه غير موجود"
      });
    }

    const existingWinch = await winsh.findOne({ providerId: provider._id });
    if (!existingWinch) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "en" ? "You must submit your verification details before uploading images." : "يجب إرسال بيانات التحقق أولًا قبل رفع الصور.",
      });
    }

    const getFileUrl = (fieldName) => {
      const file = files?.[fieldName]?.[0];
      if (!file) return "";
      return `${BASE_URL}/images/${file.filename || file.originalname}`;
    };

    const tempUrls = {
      profileImage: getFileUrl('profileImage'),
      nationalIdImage: getFileUrl('nationalIdImage'),
      licenseImage: getFileUrl('licenseImage'),
      carRegistrationImage: getFileUrl('carRegistrationImage'),
      carImage: getFileUrl('carImage'),
    };

    const { error } = winshImagesSchema(lang).validate(tempUrls);
    if (error) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: error.details[0].message,
      });
    }

    await winsh.updateOne({ providerId: provider._id }, { $set: tempUrls });

    if (tempUrls.profileImage) {
      await serviceProvider.updateOne(
        { _id: provider._id },
        { 
          $set: { 
            image: tempUrls.profileImage,
            profileImage: tempUrls.profileImage,
            nationalIdImage: tempUrls.nationalIdImage,
            licenseImage: tempUrls.licenseImage,
            carRegistrationImage: tempUrls.carRegistrationImage,
            carImage: tempUrls.carImage
          } 
        }
      );
    }

    res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Images uploaded successfully" : "تم رفع الصور بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

const uploadTireImages = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    const files = req.files;

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(400).json({ status: false, code: 400, message: lang === "en" ? "Token not provided" : "لم يتم تقديم التوكن" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ status: false, code: 400, message: lang === "en" ? "Invalid token" : "توكن غير صالح" });
    }

    const phone = decoded.identifier;
    const provider = await serviceProvider.findOne({ phone });
    if (!provider) {
      return res.status(400).send({ status: false, code: 400, message: lang == "en" ? "this provider does not exist" : "موفر الخدمه غير موجود" });
    }

    const existing = await tire.findOne({ providerId: provider._id });
    if (!existing) {
      return res.status(400).send({ status: false, code: 400, message: lang === "en" ? "Submit verification data first." : "يجب إرسال بيانات التحقق أولًا." });
    }

    const getUrl = (name) => files?.[name]?.[0] ? `${BASE_URL}/images/${files[name][0].filename}` : "";
    
    const profileImageUrl = getUrl('profileImage');
    const nationalIdImageUrl = getUrl('nationalIdImage');
    const licenseImageUrl = getUrl('licenseImage');

    const { error } = tireImagesSchema(lang).validate({ profileImage: profileImageUrl });
    if (error) {
      return res.status(400).send({ status: false, code: 400, message: error.details[0].message });
    }

    await tire.findOneAndUpdate(
      { providerId: provider._id },
      {
        profileImage: profileImageUrl,
        nationalIdImage: nationalIdImageUrl,
        licenseImage: licenseImageUrl,
        ...(req.body.notes && { notes: req.body.notes }),
      },
      { new: true }
    );

    await serviceProvider.updateOne(
      { _id: provider._id },
      { 
        $set: { 
          image: profileImageUrl,
          profileImage: profileImageUrl,
          nationalIdImage: nationalIdImageUrl,
          licenseImage: licenseImageUrl
        } 
      }
    );

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Image uploaded successfully" : "تم رفع الصورة بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

const submitTireVerification = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        status: false,
        code: 401,
        message: lang === "en" ? "Token not provided" : "لم يتم تقديم التوكن"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: false,
        code: 401,
        message: lang === "en" ? "Invalid token" : "توكن غير صالح"
      });
    }

    const phone = decoded.identifier;
    const provider = await serviceProvider.findOne({ phone });
    if (!provider) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "en" ? "this provider does not exist" : "موفر الخدمه غير موجود"
      });
    }

    const existingVerification = await tire.findOne({ providerId: provider._id });
    if (existingVerification) {
      await serviceProvider.findOneAndUpdate({ _id: provider._id }, { username: req.body.fullName, email: req.body.email }, { new: true });
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "en" ? "You have already submitted your verification request." : "لقد قمت بإرسال طلب التحقق بالفعل.",
      });
    }

    if (req.body.birthDate && req.body.birthDate.includes('-')) {
      const parts = req.body.birthDate.split("-");
      if (parts.length === 3 && parts[0].length <= 2) {
        req.body.birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const { error } = tireSchema(lang).validate({
      providerId: (provider._id).toString(),
      ...req.body
    });

    if (error) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: error.details[0].message
      });
    }
    let schemaType = "2"; // ديفولت كفرات
if (req.body.serviceType === "battery Jumpstart") {
    schemaType = "3";
} else if (req.body.serviceType === "tire Filling") {
    schemaType = "2";
}

    // ✅ التعديل: تحديث الاسم والإيميل في جدول الـ serviceProvider الأساسي فور الإرسال
await serviceProvider.findByIdAndUpdate(provider._id, {
  username: req.body.fullName,
  email: req.body.email,
  serviceType: schemaType // 👈 الحين بيتخزن 2 أو 3 ولن يبقى 1
});

    await tire.create({
      providerId: provider._id,
      serviceType: req.body.serviceType,
      fullName: req.body.fullName,
      nationality: req.body.nationality,
      nationalId: req.body.nationalId,
      birthDate: req.body.birthDate,
      email: req.body.email,
      iban: req.body.iban,
      bankAccountName: req.body.bankAccountName,
    });

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Verification request submitted successfully." : "تم إرسال طلبك بنجاح",
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitWinchVerification,
  uploadWinchImages,
  uploadTireImages,
  submitTireVerification
};