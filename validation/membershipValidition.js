const Joi = require("joi");
const getMessages = require("../locales/schemaValiditionMessages/membershipValiditionMessages");
const validateMembership = (lang = "en") => {
    const messages = getMessages(lang);
    return Joi.object({
        title: Joi.object({
            en: Joi.string().required().messages({
                "any.required": messages.titleEn,
                "string.base": messages.titleEn,
            }),
            ar: Joi.string().required().messages({
                "any.required": messages.titleAr,
                "string.base": messages.titleAr,
            }),
        }),
        price: Joi.number().positive().required().messages({
            "any.required": lang === "ar" ? "السعر مطلوب" : "Price is required",
            "number.base": lang === "ar" ? "يجب أن يكون السعر رقماً" : "Price must be a number",
            "number.positive": lang === "ar" ? "يجب أن يكون السعر رقماً موجباً" : "Price must be a positive number",
        }),

        // 2. إضافة التحقق من مدة الاشتراك
        duration: Joi.object({
            en: Joi.string().required().messages({
                "any.required": lang === "ar" ? "المدة بالإنجليزية مطلوبة" : "Duration in English is required",
            }),
            ar: Joi.string().required().messages({
                "any.required": lang === "ar" ? "المدة بالعربية مطلوبة" : "Duration in Arabic is required",
            }),
        }),

        benefits: Joi.object({
            en: Joi.array().items(Joi.string().required()).min(1).required().messages({
                "any.required": messages.benefitsEn,
                "array.base": messages.benefitsEn,
                "array.min": messages.benefitsEn,
            }),
            ar: Joi.array().items(Joi.string().required()).min(1).required().messages({
                "any.required": messages.benefitsAr,
                "array.base": messages.benefitsAr,
                "array.min": messages.benefitsAr,
            }),
        }),

        terms: Joi.object({
            en: Joi.array().items(Joi.string().required()).min(1).required().messages({
                "any.required": messages.termsEn,
                "array.base": messages.termsEn,
                "array.min": messages.termsEn,
            }),
            ar: Joi.array().items(Joi.string().required()).min(1).required().messages({
                "any.required": messages.termsAr,
                "array.base": messages.termsAr,
                "array.min": messages.termsAr,
            }),
        }),
    });

};
module.exports = {
    validateMembership
};
