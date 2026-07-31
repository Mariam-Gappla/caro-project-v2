const { validateMembership } = require("../validation/membershipValidition");
const Membership = require("../models/memberShip");

const addMembership = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";

    const formattedData = {
      title: {
        en: req.body.titleEn,
        ar: req.body.titleAr
      },
      price: req.body.price, // السعر
      duration: { // مدة الاشتراك
        en: req.body.durationEn,
        ar: req.body.durationAr
      },
      benefits: {
        en: req.body.benefitsEn ? req.body.benefitsEn.split(",").map(i => i.trim()).filter(Boolean) : [],
        ar: req.body.benefitsAr ? req.body.benefitsAr.split(",").map(i => i.trim()).filter(Boolean) : []
      },
      terms: {
        en: req.body.termsEn ? req.body.termsEn.split(",").map(i => i.trim()).filter(Boolean) : [],
        ar: req.body.termsAr ? req.body.termsAr.split(",").map(i => i.trim()).filter(Boolean) : []
      }
    };

    // تأكد من تحديث الـ Validation ليشمل السعر والمدة
    const { error } = validateMembership(lang).validate(formattedData);
    
    if (error) {
      return res.status(400).send({ status: false, code: 400, message: error.details[0].message });
    }

    const newMembership = await Membership.create(formattedData);

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "ar" ? "تم إضافة الباقة بنجاح" : "Plan added successfully",
      data: newMembership
    });

  } catch (err) { next(err); }
};

// ✅ 2. جلب جميع العضويات (مع لغة محددة)
const getMemberships = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] === "ar" ? "ar" : "en";
    
    // جلب البيانات
    const memberships = await Membership.find().lean();

    const formatted = memberships.map((m) => ({
      _id: m._id,
      // استخدام ?. للتأكد من وجود الكائن قبل قراءة اللغات
      title: m.title?.[lang] || m.title?.['ar'] || "N/A", 
      price: m.price || 0,
      // هنا كان الخطأ، أضفنا علامة الاستفهام للتأكد
      duration: m.duration?.[lang] || m.duration?.['ar'] || "N/A",
      benefits: m.benefits?.[lang] || m.benefits?.['ar'] || [],
      terms: m.terms?.[lang] || m.terms?.['ar'] || [],
      createdAt: m.createdAt,
    }));

    res.status(200).send({
      status: true,
      code: 200,
      data: formatted,
    });
  } catch (err) { 
    next(err); 
  }
};

// ✅ 3. تعديل عضوية موجودة
const updateMembership = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const { id } = req.params;

    // نفس منطق تجهيز البيانات في الإضافة
    const updateData = {
      ...req.body,
      title: { en: req.body.titleEn, ar: req.body.titleAr },
      benefits: {
        en: req.body.benefitsEn?.split(",").map(i => i.trim()),
        ar: req.body.benefitsAr?.split(",").map(i => i.trim()),
      },
      terms: {
        en: req.body.termsEn?.split(",").map(i => i.trim()),
        ar: req.body.termsAr?.split(",").map(i => i.trim()),
      }
    };

    const updated = await Membership.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
      return res.status(404).send({
        status: false,
        message: lang === 'ar' ? "العضوية غير موجودة" : "Membership not found"
      });
    }

    res.status(200).send({
      status: true,
      code: 200,
      message: lang === "ar" ? "تم تحديث العضوية بنجاح" : "Membership updated successfully"
    });
  } catch (err) { next(err); }
};

// ✅ 4. حذف عضوية
const deleteMembership = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const { id } = req.params;

    const deleted = await Membership.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).send({
        status: false,
        message: lang === 'ar' ? "العضوية غير موجودة" : "Membership not found"
      });
    }

    res.status(200).send({
      status: true,
      code: 200,
      message: lang === "ar" ? "تم حذف العضوية بنجاح" : "Membership deleted successfully"
    });
  } catch (err) { next(err); }
};

module.exports = {
  addMembership,
  getMemberships,
  updateMembership,
  deleteMembership
};