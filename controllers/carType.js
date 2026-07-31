const carType = require("../models/carType")
const addType = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const data = req.body;

        // ✅ 1. الجزء الخاص بالإضافة الجماعية (Array)
        if (Array.isArray(data)) {
            const formattedTypes = data.map(item => ({
                nameId: item.nameId, 
                type: { 
                    en: item.type_en, 
                    ar: item.type_ar 
                }
            }));

            await carType.insertMany(formattedTypes);

            return res.status(200).send({
                status: true,
                code: 200,
                message: lang == "ar" ? "تم إضافة قائمة الأنواع بنجاح" : "Car types list added successfully"
            });
        }

        // ✅ 2. الجزء الخاص بالإضافة الفردية
        // استخراج المتغيرات من req.body لضمان عدم حدوث خطأ "not defined"
        const { nameId, type_en, type_ar } = req.body;

        if (!nameId) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: "nameId required"
            });
        }

        if (!type_en || !type_ar) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang == "en" ? "Please provide nameId and type in both languages" : "من فضلك دخل النوع باللغتين العربيه والانجليزيه"
            });
        }

        const exists = await carType.findOne({
            "type.en": type_en,
            "type.ar": type_ar
        });

        if (exists) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "en"
                    ? "This car type already exists"
                    : "هذا النوع موجود بالفعل"
            });
        }

        await carType.create({
            nameId,
            type: { en: type_en, ar: type_ar }
        });

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang == "ar" ? "تم اضافه نوع السياره بنجاح" : "car type added successfully"
        });

    } catch (error) {
        next(error);
    }
}
const getTypes = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const rentalOfficeId=req.user.id;
        const {nameId}  = req.body;

        if (!nameId) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === 'ar' ? "الرجاء توفير معرف اسم السيارة" : "Please provide nameId"
            });
        }

        const rawTypes = await carType.find({nameId });

        // تغيير شكل النتائج
        const types = rawTypes.map((n) => ({
            id: n._id,
            text: lang === 'ar' ? n.type.ar : n.type.en
        }));

        return res.send({
            status: true,
            code: 200,
            message:
                lang === "en"
                    ? "Your request has been completed successfully"
                    : "تمت معالجة الطلب بنجاح",
            data: types
        });
    } catch (error) {
        next(error);
    }
};
const getType = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        // استلام المعرف من الـ Params (السلاش) بدلاً من الـ Body
        const { nameId } = req.params; 

        if (!nameId) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === 'ar' ? "الرجاء توفير معرف اسم السيارة" : "Please provide nameId"
            });
        }

        const rawTypes = await carType.find({ nameId });

        const types = rawTypes.map((n) => ({
            id: n._id,
            text: lang === 'ar' ? n.type.ar : n.type.en
        }));

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "en" ? "Success" : "تمت معالجة الطلب بنجاح",
            data: types
        });
    } catch (error) {
        next(error);
    }
};
module.exports = {
    addType,
    getTypes,
    getType
}