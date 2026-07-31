const Joi = require("joi");
const getMessages = require("../locales/schemaValiditionMessages/nationalityValiditionMessages");

const nationalitySchema = (lang = "en") => {
  const msg = getMessages(lang);
  
  return Joi.object({
    // تعديل الحقول لتطابق ما نرسله في الـ Body
    nameEn: Joi.string()
      .required()
      .trim()
      .messages({
        "any.required": lang === "ar" ? "الاسم بالإنجليزي مطلوب" : "English name is required",
        "string.base": lang === "ar" ? "يجب أن يكون الاسم نصاً" : "Name must be a string",
      }),
    nameAr: Joi.string()
      .required()
      .trim()
      .messages({
        "any.required": lang === "ar" ? "الاسم بالعربي مطلوب" : "Arabic name is required",
        "string.base": lang === "ar" ? "يجب أن يكون الاسم نصاً" : "Name must be a string",
      }),
  });
};

module.exports = nationalitySchema;