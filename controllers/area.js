const Area = require("../models/area");
const addArea = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const data = req.body; // نستخدم data هنا كاسم للمدخلات

        // ✅ 1. التحقق أولاً: هل المدخلات مصفوفة؟
        if (Array.isArray(data)) {
            const formattedAreas = data.map(item => ({
                name: { 
                    ar: item.nameAr, 
                    en: item.nameEn 
                },
                cityId: item.cityId
            }));

            await Area.insertMany(formattedAreas, { ordered: false });

            // ⛔ هام جداً: return هنا تمنع الكود من النزول للأسفل ووقوع الخطأ
            return res.status(200).send({
                status: true,
                code: 200,
                message: lang === "ar" ? "تم إضافة القائمة بنجاح" : "List added successfully"
            });
        }

        // ✅ 2. إذا لم تكن مصفوفة (يعني إضافة عنصر واحد فقط)
        // لا نستخرج القيم إلا في هذه المرحلة لضمان أن data هو Object وليس Array
        if (data && typeof data === 'object') {
            const { nameAr, nameEn, cityId } = data;

            if (!cityId || !nameAr || !nameEn) {
                return res.status(400).send({
                    status: false,
                    code: 400,
                    message: lang === "ar" ? "جميع الحقول مطلوبة" : "All fields are required"
                });
            }

            const existingArea = await Area.findOne({
                cityId,
                $or: [{ "name.ar": nameAr }, { "name.en": nameEn }]
            });

            if (existingArea) {
                return res.status(400).send({
                    status: false,
                    code: 400,
                    message: lang === "ar" ? "موجود مسبقاً" : "Already exists"
                });
            }

            await Area.create({
                name: { ar: nameAr, en: nameEn },
                cityId
            });

            return res.status(200).send({
                status: true,
                code: 200,
                message: lang === "ar" ? "تم الإضافة بنجاق" : "Added successfully"
            });
        }

        // في حال كانت البيانات غير صالحة (ليست مصفوفة ولا كائن)
        return res.status(400).send({ status: false, message: "Invalid data format" });

    } catch (err) {
        next(err);
    }
};
const getArea = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const cityId = req.params.cityId;
        const areas = await Area.find({ cityId });
        // رجّع البيانات مع اسم المنطقة حسب اللغة المطلوبة
        const formattedAreas = areas.map(area => ({
            id: area._id,
            text: area.name[lang] || area.name.en  // fallback للإنجليزي لو اللغة مش موجودة
        }));
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم جلب المناطق بنجاح" : "Areas fetched successfully",
            areas: formattedAreas
        });
    }
    catch (err) {
        next(err)
    }
}
// أضف هذه الدوال لملف المناطق (Area)
const updateArea = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nameAr, nameEn, cityId } = req.body;
        const lang = req.headers["accept-language"] || "en";

        const updatedArea = await Area.findByIdAndUpdate(
            id,
            { name: { ar: nameAr, en: nameEn }, cityId },
            { new: true }
        );

        if (!updatedArea) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === "ar" ? "المنطقة/المدينة غير موجودة" : "Area not found"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم تحديث المنطقة بنجاح" : "Area updated successfully"
        });
    } catch (err) {
        next(err);
    }
};

const deleteArea = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lang = req.headers["accept-language"] || "en";

        const deletedArea = await Area.findByIdAndDelete(id);

        if (!deletedArea) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === "ar" ? "المنطقة غير موجودة" : "Area not found"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم حذف المنطقة بنجاح" : "Area deleted successfully"
        });
    } catch (err) {
        next(err);
    }
};
module.exports = {
    addArea,
    getArea,
    updateArea,
    deleteArea
}