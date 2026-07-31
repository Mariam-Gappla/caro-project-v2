const City = require("../models/city");
const addCity = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const data = req.body;

        // ✅ إضافة مصفوفة محافظات دفعة واحدة
        if (Array.isArray(data)) {
            const formattedCities = data.map(item => ({
                name: { ar: item.nameAr, en: item.nameEn }
            }));
            await City.insertMany(formattedCities, { ordered: false });
            return res.status(200).send({
                status: true,
                code: 200,
                message: lang === "ar" ? "تم إضافة قائمة المحافظات بنجاح" : "Cities list added successfully"
            });
        }

        // --- كودك الأصلي للإضافة الفردية (بدون تعديل) ---
        const { nameAr, nameEn } = req.body;
        if (!nameAr || !nameEn) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "ar" ? "اسم المدينه باللغتين مطلوب" : "City name in both languages is required"
            });
        }
        const existingCity = await City.findOne({
            $or: [{ "name.ar": nameAr }, { "name.en": nameEn }]
        });
        if (existingCity) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "ar" ? "المدينه موجوده بالفعل": "City already exists"
            });
        }
        await City.create({ name: { ar: nameAr, en: nameEn }});
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم إضافة المنطقة بنجاح" : "City added successfully",
        });
    } catch (err) {
        next(err);
    }
};
const getCities = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const cities = await City.find({});
        // رجّع البيانات مع اسم المنطقة حسب اللغة المطلوبة
        const formattedCities = cities.map(city => ({
            id: city._id,
            text: city.name[lang] || city.name.en  // fallback للإنجليزي لو اللغة مش موجودة
        }));
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم جلب المدن بنجاح" : "cities fetched successfully",
            areas: formattedCities
        });
    }
    catch (err) {
        next(err)
    }
}
// أضف هذه الدوال لملف المحافظات (City)
const updateCity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nameAr, nameEn } = req.body;
        const lang = req.headers["accept-language"] || "en";

        const updatedCity = await City.findByIdAndUpdate(
            id, 
            { name: { ar: nameAr, en: nameEn } }, 
            { new: true }
        );

        if (!updatedCity) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === "ar" ? "المحافظة غير موجودة" : "City not found"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم تحديث المحافظة بنجاح" : "City updated successfully"
        });
    } catch (err) {
        next(err);
    }
};

const deleteCity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lang = req.headers["accept-language"] || "en";

        const deletedCity = await City.findByIdAndDelete(id);
        
        if (!deletedCity) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === "ar" ? "المحافظة غير موجودة" : "City not found"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم حذف المحافظة بنجاح" : "City deleted successfully"
        });
    } catch (err) {
        next(err);
    }
};
module.exports = {
    addCity,
    getCities,
    updateCity,
    deleteCity
}