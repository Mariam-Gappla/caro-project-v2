const MainCategoryActivity = require("../models/mainCategoryActivity")
const addMainCategoryActivity = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const { nameEn, nameAr } = req.body;
        if (!nameEn || !nameAr) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "en" ? "main category name in english and arabic are required" : "اسم التصنيف الرئيسي بالانجليزي والعربي مطلوب"
            });
        }
        const existingCategory = await MainCategoryActivity.findOne({ $or: [{ "name.en": nameEn }, { "name.ar": nameAr }] });
        if (existingCategory) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "en" ? "main category name already exists" : "اسم التصنيف الرئيسي موجود بالفعل"
            });
        }
        await MainCategoryActivity.create({ name: { en: nameEn, ar: nameAr } });
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "en" ? "main category created successfully" : "تم إنشاء التصنيف الرئيسي بنجاح"
        });
    }
    catch (err) {
        next(err);
    }
}
const getAllMainCategoryActivity = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const mainCategories = await MainCategoryActivity.find({});

        const formattedCategories = mainCategories.map(cat => ({
            id: cat._id,
            text: cat.name[lang],        // النص بناءً على لغة الهيدر
            nameAr: cat.name.ar,         // الاسم العربي صراحةً
            nameEn: cat.name.en          // الاسم الإنجليزي صراحةً
        }));

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "en" ? "main categories retrieved successfully" : "تم استرجاع التصنيفات الرئيسية بنجاح",
            data: formattedCategories
        });
    }
    catch (err) {
        next(err);
    }
};

const deleteMainCategoryActivity = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        // نأخذ الـ id من الـ params (/:id)
        const { id } = req.params;

        // تنفيذ عملية الحذف والبحث في خطوة واحدة
        const deletedCategory = await MainCategoryActivity.findByIdAndDelete(id);

        // 🛡️ تحقق إذا كان المعرف (ID) موجوداً أصلاً في قاعدة البيانات
        if (!deletedCategory) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === "en" ? "Main category not found" : "التصنيف الرئيسي غير موجود"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "en" ? "Main category deleted successfully" : "تم حذف التصنيف الرئيسي بنجاح"
        });
    }
    catch (err) {
        // تمرير الخطأ للميدل وير الخاص بالمعالجة العامة للأخطاء
        next(err);
    }
};
module.exports = {
    addMainCategoryActivity,
    getAllMainCategoryActivity,
    deleteMainCategoryActivity
};