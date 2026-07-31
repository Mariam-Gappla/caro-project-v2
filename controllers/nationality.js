const nationality = require("../models/nationality");
const nationalitySchema = require("../validation/nationality");

// ✅ 1. إضافة جنسية جديدة (تدعم اللغتين)
const addNationality = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const data = req.body;

    // --- 1. حالة إضافة مجموعة جنسيات (Bulk Insert) ---
    if (Array.isArray(data)) {
      // تجهيز البيانات لتطابق هيكل الموديل الجديد
      const formattedData = data.map(item => ({
        name: {
          en: item.nameEn.trim(),
          ar: item.nameAr.trim()
        }
      }));

      // الإضافة الجماعية (insertMany)
      // ordered: false تعني إذا وجد عنصر مكرر يتخطاه ويكمل الباقي
      await nationality.insertMany(formattedData, { ordered: false });

      return res.status(200).json({
        code: 200,
        status: true,
        message: lang === 'ar' ? 'تم إضافة قائمة الجنسيات بنجاح' : 'Nationalities list added successfully',
      });
    }

    // --- 2. حالة إضافة جنسية واحدة فقط (Single Insert) ---
    // هنا نقوم بعمل الـ Validation لأننا نتوقع Object
    const { error } = nationalitySchema(lang).validate(req.body);
    if (error) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: error.details[0].message,
      });
    }

    const { nameEn, nameAr } = req.body;

    // التحقق من التكرار للجنسية الواحدة
    const existingNationality = await nationality.findOne({
      $or: [
        { "name.en": nameEn.trim() },
        { "name.ar": nameAr.trim() }
      ]
    });

    if (existingNationality) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: lang === 'ar' ? 'هذه الجنسية موجودة بالفعل' : 'This nationality already exists',
      });
    }

    await nationality.create({
      name: {
        en: nameEn.trim(),
        ar: nameAr.trim()
      }
    });

    return res.status(200).json({
      code: 200,
      status: true,
      message: lang === 'ar' ? 'تم إضافة الجنسية بنجاح' : 'Nationality added successfully',
    });

  } catch (err) {
    // معالجة خطأ التكرار في insertMany (Bulk)
    if (err.code === 11000) {
      return res.status(200).json({
        code: 200,
        status: true,
        message: lang === 'ar' ? 'تمت العملية مع تخطي العناصر المكررة' : 'Operation done, duplicates skipped'
      });
    }
    next(err);
  }
};

// ✅ 2. جلب الجنسيات (عرض اللغة بناءً على الـ Header)
const getNationality = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    // نحدد حقل اللغة المطلوب: إما 'ar' أو 'en'
    const displayLang = lang === 'ar' ? 'ar' : 'en';

    const nationalities = await nationality.find({}, { _id: 1, name: 1 });

    const formatted = nationalities.map((item) => ({
      id: item._id,
      text: item.name[displayLang] || item.name['en'] // العودة للإنجليزية في حال عدم توفر العربية
    }));

    res.status(200).send({
      code: 200,
      status: true,
      message: lang === 'ar' ? 'تم استرجاع الجنسيات بنجاح' : 'Nationalities retrieved successfully',
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

// ✅ 3. تعديل جنسية (اللغتين)
const updateNationality = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nameEn, nameAr } = req.body;
    const lang = req.headers['accept-language'] || 'en';

    // التحقق من المدخلات
    const { error } = nationalitySchema(lang).validate(req.body);
    if (error) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: error.details[0].message,
      });
    }

    // التأكد من أن الاسم الجديد لا يخص ID آخر (لمنع التكرار عند التعديل)
    const duplicate = await nationality.findOne({
      _id: { $ne: id },
      $or: [
        { "name.en": nameEn.trim() },
        { "name.ar": nameAr.trim() }
      ]
    });

    if (duplicate) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: lang === 'ar' ? 'اسم الجنسية هذا موجود بالفعل' : 'This nationality name already exists',
      });
    }

    const updated = await nationality.findByIdAndUpdate(
      id,
      { 
        name: { 
          en: nameEn.trim(), 
          ar: nameAr.trim() 
        } 
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).send({
        code: 404,
        status: false,
        message: lang === 'ar' ? 'الجنسية غير موجودة' : 'Nationality not found',
      });
    }

    return res.status(200).json({
      code: 200,
      status: true,
      message: lang === 'ar' ? 'تم تحديث الجنسية بنجاح' : 'Nationality updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ✅ 4. حذف جنسية
const deleteNationality = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lang = req.headers['accept-language'] || 'en';

    const deleted = await nationality.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).send({
        code: 404,
        status: false,
        message: lang === 'ar' ? 'الجنسية غير موجودة' : 'Nationality not found',
      });
    }

    return res.status(200).json({
      code: 200,
      status: true,
      message: lang === 'ar' ? 'تم حذف الجنسية بنجاح' : 'Nationality deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { addNationality, getNationality, updateNationality, deleteNationality };