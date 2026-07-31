const subCategorySchema = require("../validation/subCategoryValiditions");
const SubCategory = require("../models/subCategory");
const getSubCategories = async (req, res, next) => {
    try {
        const lang =req.headers["accept-language"] || "en";
        const categories = await SubCategory.find();
        const formatedCategories=categories.map((cat)=>({id:cat._id,text:cat.name}))
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang=="ar"?"تم جلب الاقسام بنجاح":"Categories fetched successfully",
            data: formatedCategories
        });
    }
    catch (error) {
        next(error);
    }
}
const addSubCategory = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "ar";
        const data = req.body;
        const mainCategoryId = req.params.id; // نأخذ الـ ID من الرابط

        // ✅ 1. التحقق إذا كانت البيانات مصفوفة (إضافة جماعية)
        if (Array.isArray(data)) {
            const formattedSubs = data.map(item => ({
                name: { 
                    ar: item.nameAr || item.subCategoryAr, 
                    en: item.nameEn || item.subCategoryEn 
                },
                mainCategoryId: mainCategoryId // نربط الجميع بالـ ID الموجود في الرابط
            }));

            await SubCategory.insertMany(formattedSubs, { ordered: false });

            return res.status(200).send({
                status: true,
                code: 200,
                message: lang == "ar" ? "تم إضافة قائمة الأقسام بنجاح" : "Sub categories list added successfully",
            });
        }

        // ✅ 2. كودك الأصلي للإضافة الفردية (مع تصحيح بسيط لاستخدام data)
        const { subCategoryAr, subCategoryEn, nameAr, nameEn } = data;
        const ar = subCategoryAr || nameAr;
        const en = subCategoryEn || nameEn;

        if (!ar || !en) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang == "ar" ? "القسم الفرعى مطلوب عربى وانجليزى" : "Sub category in Arabic and English is required"
            });
        }

        await SubCategory.create({
            name: { ar: ar, en: en },
            mainCategoryId: mainCategoryId
        });

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang == "ar" ? "تم إضافة القسم بنجاح" : "Sub category added successfully",
        });

    } catch (error) {
        next(error);
    }
};
const updateSubCategory = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "ar";

        const { error } = subCategorySchema(lang).validate({
            name: req.body.name
        });

        if (error) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: error.details[0].message
            });
        }

        const categoryId = req.params.id;
        console.log(categoryId)
        const category = await SubCategory.findById({ _id: categoryId });
        if (!category) {
            return res.status(400).send({
                status: false,
                code: 400,
                message:lang=="ar"? "القسم الفرعى غير موجود":"sub Category not found"
            });
        }
        const cat = await SubCategory.findByIdAndUpdate({ _id: categoryId }, { name: req.body.name }, { new: true });


        return res.status(200).send({
            status: true,
            code: 200,
            message: lang=="ar"?"تم تعديل القسم الفرعى بنجاح":"sub Category updated successfully",
            data: cat
        });

    } catch (error) {
        next(error);
    }
};
const deleteSubCategory = async (req, res, next) => {
    try {
        // 1. تعريف اللغة من الهيدر (هذا هو السطر الناقص عندك)
        const lang = req.headers['accept-language'] === 'ar' ? 'ar' : 'en';
        
        const categoryId = req.params.id;

        // 2. تصحيح: findByIdAndDelete تأخذ الأيدي مباشرة بدون كائن _id
        const category = await SubCategory.findByIdAndDelete(categoryId);

        if (!category) {
            return res.status(404).send({ // يفضل 404 لأن القسم غير موجود
                status: false,
                code: 404,
                message: lang == "ar" ? "القسم الفرعي غير موجود" : "Sub Category not found"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang == "ar" ? "تم حذف القسم الفرعي بنجاح" : "Sub Category deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};
const getSubCategoriesInMainCategory = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const id = req.params.id;
        const categories = await SubCategory.find({ mainCategoryId: id });
        const formatedCategories = categories.map(cat => {
            return {
                id: cat._id,
                text: lang == "ar" ? cat.name.ar : cat.name.en,
            }
        })
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang == "ar" ? "تم جلب الاقسام الفرعيه بنجاح" : "sub Categories fetched successfully",
            data: formatedCategories
        })
    }
    catch (error) {
        next(error)
    }
}

module.exports = {
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    getSubCategories,
    getSubCategoriesInMainCategory
}
