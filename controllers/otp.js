const Otp = require("../models/otp");
const jwt = require("jsonwebtoken");
const sendSms = require("../utils/sms");
const getMessages = require("../configration/getmessages");
const makeOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const lang = req.headers["accept-language"] || "en";
    const messages = getMessages(lang);

   
    // توليد OTP عشوائي
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // حذف أي OTP سابق
    await Otp.deleteMany({ phone });

    // حفظ OTP
    await Otp.create({
      phone,
      otp,
      expiresAt
    });

    // إرسال SMS
    await sendSms({
      phone,
      message: `${messages.sendCode.text} ${otp}`
    });

    res.status(200).send({
      status: true,
      code: 200,
      message: messages.sendCode.success
    });
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    const lang = req.headers["accept-language"] || "en";
    const messages = getMessages(lang);

    const record = await Otp.findOne({ phone });

    if (!record) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: messages.verify.notExist
      });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: messages.verify.expired
      });
    }

    if (record.otp !== code) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: messages.verify.error
      });
    }

    // إنشاء توكن
    const token = jwt.sign(
      { identifier: phone },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // حذف OTP بعد الاستخدام
    await Otp.deleteOne({ _id: record._id });

    return res.status(200).send({
      status: true,
      code: 200,
      message: messages.verify.success,
      data: { token }
    });
  } catch (err) {
    next(err);
  }
};
module.exports = {
    makeOtp, verifyOtp
}