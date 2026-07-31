const Notification = require("../models/notification");
const getMessages = require("../locales/schemaValiditionMessages/notificationValiditionMessages");
const getNotifications = async (req, res, next) => {
  const lang = req.headers["accept-language"] || "en";
  try {
    const targetId = req.user.id;
    let targetType = req.user.role; // لازم يكون عندك role في JWT: 'user' أو 'rentalOffice' أو 'serviceProvider'
    console.log(targetId)
    console.log(targetType)
    if (targetType == 'user') {
      targetType = 'User';
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { targetId, targetType};

    const totalNotifications = await Notification.countDocuments(filter);
    const readNotification=await Notification.countDocuments({targetId, targetType,isRead:false});
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedNotifications = notifications.map((not) => ({
      id:not._id,
      title: not.title[lang],
      request:not.request || "",
      action:not.action || " ",
      type:not.type || " ",
      message: not.message[lang],
      date: not.createdAt,
    }));
    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Notifications fetched successfully" : "تم جلب الإشعارات بنجاح",
      data: {
        notifications: formattedNotifications,
        count:readNotification,
        pagination: {
          page: formattedNotifications.length === 0 ? 1 : page,
          totalPages: Math.ceil(totalNotifications / limit),
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
const addNotification = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const {
      targetId,
      targetType,
      orderId,
      orderModel,
      title,
      message
    } = req.body;

    // ✅ تحقق من البيانات المطلوبة
    if (!targetId || !targetType || !title || !message || !orderModel) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'en' ? 'Missing required fields' : 'يوجد حقول مطلوبة مفقودة'
      });
    }

    const notification = new Notification({
      targetId,
      targetType,
      orderModel,
      orderId,
      title,
      message
    });

    await notification.save();

    return res.status(201).send({
      status: true,
      code: 201,
      message: lang === 'en' ? 'Notification sent successfully' : 'تم إرسال الإشعار بنجاح',
    });
  } catch (error) {
    next(error);
  }
};
const updateRead = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const id = req.params.id;

    // 🟢 1. تحقق من وجود id
    if (!id) {
      return res.status(400).json({
        status: false,
        code:400,
        message: lang === "en" ? "Notification ID is required" : "مطلوب معرف الإشعار",
      });
    }

    // 🟢 2. تحديث الإشعار
    const notification = await Notification.findOneAndUpdate(
      { _id: id },
      { isRead: true },
      { new: true }
    );

    // 🟢 3. تحقق هل فعلاً الإشعار موجود
    if (!notification) {
      return res.status(400).json({
        status: false,
        code:400,
        message: lang === "en" ? "Notification not found" : "الإشعار غير موجود",
      });
    }

    // 🟢 4. رجّع رد ناجح
    return res.status(200).json({
      status: true,
      code:200,
      message: lang === "en" ? "Notification marked as read" : "تم تعيين الإشعار كمقروء",
    });
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getNotifications,
  addNotification,
  updateRead
};
