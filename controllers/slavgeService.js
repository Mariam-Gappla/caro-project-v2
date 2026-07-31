const SlavgeService = require("../models/slavgeService");
const addSlavgeService = async (req, res, next) => {
    try {
        const { nameAr, nameEn} = req.body; // { name: {ar,en}, cityId }
        const lang = req.headers["accept-language"] || "en";
        if(!nameAr || !nameEn){
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "ar" ? "اسم الخدمه باللغتين مطلوب" : "service name in both languages is required"
            });
        }
        // تحقق من التكرار داخل نفس المدينة
        const existingService = await SlavgeService.findOne({
            $or: [{ "name.ar": nameAr }, { "name.en": nameEn }]
        });

        if (existingService) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "ar" ? "الخدمه موجوده بالفعل": "service already exists"
            });
        }

        await SlavgeService.create({ name: { ar: nameAr, en: nameEn }});
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم إضافة الخدمه بنجاح" : "service added successfully",
        });
    } catch (err) {
        next(err);
    }
};
const getSlaveServices = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const services = await SlavgeService.find({});
        // رجّع البيانات مع اسم المنطقة حسب اللغة المطلوبة
        const formattedServices = services.map(ser => ({
            id: ser._id,
            text: ser.name[lang] || city.name.en  // fallback للإنجليزي لو اللغة مش موجودة
        }));
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم جلب الخدمات بنجاح" : "Services fetched successfully",
            areas: formattedServices
        });
    }
    catch (err) {
        next(err)
    }
}

const deleteSlavgeService = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const { id } = req.params;

        const deletedService = await SlavgeService.findByIdAndDelete(id);

        if (!deletedService) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === "ar" ? "الخدمة غير موجودة" : "Service not found"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم حذف الخدمة بنجاح" : "Service deleted successfully"
        });
    } catch (err) {
        next(err);
    }
};
module.exports = {
    addSlavgeService,
    getSlaveServices,
    deleteSlavgeService
}