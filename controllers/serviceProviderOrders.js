const { serviceWinchValidationSchema, serviceTireValidationSchema } = require("../validation/serviceProviderOrdersValidition");
const User = require("../models/user");
const ServiceProviderPricing = require("../models/serviceProviderPrices.js")
const providerRating = require("../models/providerRating");
const orderRating = require("../models/ratingForOrder");
const workSession = require("../models/workingSession");
const ServiceProvider = require("../models/serviceProvider");
const { sendNotification, sendNotificationToMany } = require("../configration/firebase.js");
const winsh = require("../models/winsh");
const getNextOrderNumber = require("../controllers/counter");
const tire = require("../models/tire");
const path = require("path");
const fs = require("fs");
const {saveImage} = require("../configration/saveImage.js");
const serviceProvider = require("../models/serviceProvider");
const serviceProviderOrders = require("../models/serviceProviderOrders");
const { ACCOUNT_CATEGORIES } = require('../utils/serviceConstants');
const review = require("../models/ratingForOrder");


const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
const getOrdersbyServiceType = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    // استخدام id من التوكن لتجنب خطأ undefined
    const currentId = req.user.id;

    // نظام الـ Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // التحقق من جلسة العمل
    const activeSession = await workSession.findOne({ providerId: currentId, isWorking: true });
    if (!activeSession) {
      return res.status(200).json({ status: true, data: { orders: [] } });
    }

    // تحديد نوع الخدمة بناءً على حساب مقدم الخدمة
    const verification = await winsh.findOne({ providerId: currentId }) || await tire.findOne({ providerId: currentId });
    if (!verification) return res.status(404).json({ status: false, message: "Account verification not found" });

    // تحديد نوع الخدمة بناءً على حساب مقدم الخدمة
    // يفضل جلب البيانات من جدول الـ serviceProvider الأساسي لأنه المرجع النهائي
    const provider = await serviceProvider.findById(currentId);
    if (!provider) {
      return res.status(404).json({ status: false, message: "Provider not found" });
    }

let filter = { 
        status: "pending", 
        ended: false 
    };

    if (provider.location?.lat && provider.location?.long) {
        filter.location = {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [provider.location.long, provider.location.lat] 
                },
            }
        };
    }

    let baseFilter = { 
        status: "pending", 
        ended: false 
    };
    
        if (provider.serviceType === "1") {
            filter.serviceType = "winch";
        } else if (provider.serviceType === "2") {
            filter.serviceType = "tire Filling";
        } else if (provider.serviceType === "3") {
            filter.serviceType = "battery Jumpstart";
        } else {
            // إذا كان مقدم الخدمة عنده النوعين مع بعض (لو كنت مسويها كذا)
            filter.serviceType = { $in: ['tire Filling', 'battery Jumpstart'] };
        }
// 2. احسب الإجمالي بناءً على الفلتر الأساسي (عشان تتجنب خطأ الـ count)
    const totalOrders = await serviceProviderOrders.countDocuments(baseFilter);

    // 3. الآن أضف الموقع للفلتر الخاص بالجلب فقط
    let fetchFilter = { ...baseFilter };
    if (provider.location?.lat && provider.location?.long) {
        fetchFilter.location = {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [provider.location.long, provider.location.lat] 
                },
                // $maxDistance: 50000 // اختياري: إذا تبي تحدد مسافة معينة (بالأمتار)
            }
        };
    }

    // 4. جلب البيانات بدون .sort() إذا وجد موقع
    let query = serviceProviderOrders.find(fetchFilter)
        .populate('userId', 'username image avgRating averageRating')
        .skip(skip)
        .limit(limit)
        .lean();

    if (!fetchFilter.location) {
        query = query.sort({ createdAt: -1 });
    }

    const rawOrders = await query;
        // إعادة تشكيل البيانات للمسميات المطلوبة (userData بدلاً من userId)
      const orders = await Promise.all(rawOrders.map(async (order) => {
      const finalPrice = order.price !== undefined && order.price !== null ? order.price : 0;            // 1️⃣ حساب المسافة
      let distanceText = "0 km";
        if (provider.location?.lat && provider.location?.long && order.location?.lat && order.location?.long) {
            const distToUser = haversineDistance(
                provider.location.lat,
                provider.location.long,
                order.location.lat,
                order.location.long
            );

            if (order.serviceType === 'winch' && order.dropoffLocation?.lat && order.dropoffLocation?.long) {
                const distToDropOff = haversineDistance(
                    order.location.lat,
                    order.location.long,
                    order.dropoffLocation.lat,
                    order.dropoffLocation.long
                );
                const totalDist = distToUser + distToDropOff;
                distanceText = `${totalDist.toFixed(2)} km`;
            } else {
                distanceText = `${distToUser.toFixed(2)} km`;
            }
        }
            const user = order.userId; 

            // 2️⃣ حساب متوسط التقييم للمستخدم (تعريف واحد فقط)
            let calculatedRating = "0.0";
            if (user && user._id) {
                // تأكد أن اسم الموديل providerRating مستورد في الملف
                const reviews = await providerRating.find({ userId: user._id });
                if (reviews.length > 0) {
                    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
                    calculatedRating = (total / reviews.length).toFixed(1);
                }
            }
            return {
              ...order,
              price: Number(finalPrice),
              distance: distanceText,
                userId: user ? user._id : null, // إبقاء الـ ID الأصلي للضرورة
                userData: user ? {
                    id: user._id,
                    username: user.username,
                    image: user.image,
                    avgRating: calculatedRating || "0.0",
                    averageRating: calculatedRating || "0.0",
                    serviceType: order.serviceType
                } : null
            };
        }));

        return res.status(200).json({ 
            status: true, 
            code: 200, 
            data: { 
                orders,
                pagination: {
                    totalOrders,
                    totalPages: Math.ceil(totalOrders / limit),
                    currentPage: page,
                    limit
                }
            } 
        });
    } catch (err) { 
        next(err); 
    }
};
const addWinchOrder = async (req, res, next) => {
    try {
        const io = req.app.get("io");
        const lang = req.headers['accept-language'] || 'en';
        const BASE_URL = process.env.BASE_URL || "https://api.carnoapp.com";
        
        const userIdFromToken = req.user.id; 
        const user = await User.findById(userIdFromToken);
        if (!user) return res.status(404).json({ status: false, message: "User not found" });

        const location = { 
            lat: parseFloat(req.body['location.lat']), 
            long: parseFloat(req.body['location.long']) 
        };
        const dropoffLocation = { 
            lat: parseFloat(req.body['dropoffLocation.lat']), 
            long: parseFloat(req.body['dropoffLocation.long']) 
        };

        const imageUrl = req.file ? BASE_URL + saveImage(req.file) : "";

        // 1. حساب السعر
        const distance = haversineDistance(dropoffLocation.lat, dropoffLocation.long, location.lat, location.long).toFixed(2);
        const pricing = await ServiceProviderPricing.findOne({});
let calculatedPrice = (distance * (pricing.winchDistance || 0)) + (pricing.winchOpenPrice || 0);

        // القاعدة: لا يقل عن السعر الثابت (Fixed Price)
        let price = Math.max(calculatedPrice, pricing.winchFixedPrice || 0);
        price = Math.round(price);

        // 2. تجهيز بيانات الـ Validation (يجب أن تطابق الـ Schema الذي أرسلته حرفياً)
        const validationData = {
            serviceType: req.body.serviceType || 'winch',
            userId: userIdFromToken,
            image: imageUrl,
            details: req.body.details,
            location: location,
            locationText: req.body.locationText,
            paymentType: req.body.paymentType,
            dropoffLocation: dropoffLocation,
            dropoffLocationText: req.body.dropoffLocationText
        };

        // 3. التحقق من البيانات (الآن لن يظهر خطأ status is not allowed)
        const { error } = serviceWinchValidationSchema(lang).validate(validationData);
        if (error) return res.status(400).json({ status: false, code: 400, message: error.details[0].message });

        // 4. تجهيز البيانات النهائية للحفظ في الداتابيز (نضيف الحقول الإضافية هنا)
        const finalOrderData = {
            ...validationData,
            price: price,
            orderNumber: await getNextOrderNumber("order"),
            status: "pending",
            ended: false,
            searchRadius: 8000
        };

      const order = await serviceProviderOrders.create(finalOrderData);
      io.to(`order_${order._id}`).emit("orderStatus", { 
          orderId: order._id, 
          status: "searching" 
      });

        // 5. إرسال السوكت بالمسميات الأصلية (userData والتقييمات)
const allProviders = await serviceProvider.find({ 
            serviceType: "1", 
            status: "accepted",
            isDeleted: false 
        });

const nearbyProviders = allProviders.filter(p => {
            if (p.location?.lat && p.location?.long) {
                const dist = haversineDistance(location.lat, location.long, p.location.lat, p.location.long);
                return (dist * 1000) <= 50; // تحويل الكيلومتر إلى متر
            }
            return false;
        });

        // تجهيز بيانات السوكيت
        const socketData = { 
            id: order._id, 
            serviceType: "winch", 
            orderNumber: order.orderNumber,
            userData: {
                id: user._id,
                username: user.username,
                image: user.image,
                avgRating: user.avgRating || "0.0",
                averageRating: user.averageRating || "0.0"
            },
            location: location,
            price: price
        };

        // إرسال السوكيت فقط للقريبين (باستخدام socketId المخزن عندهم)
        nearbyProviders.forEach(p => {
            if (p.socketId) {
                io.to(p.socketId).emit("newServiceProviderOrder", socketData);
            }
        });
        
if (allProviders.length > 0) {
            await sendNotificationToMany({
                targets: allProviders,
                targetType: "serviceProvider",
                titleAr: "طلب ونش جديد 🚨",
                titleEn: "New Winch Request",
                messageAr: `طلب جديد من العميل: ${user.username}`,
                messageEn: `New request from: ${user.username}`,
                actionType: "order",
                orderId: String(order._id),
                request: "true",
                orderModel: "ServiceProviderOrders",
                lang: lang
            });
        }

        return res.status(200).send({ status: true, code: 200, message: lang === 'ar' ? "تم إنشاء الطلب" : "Order created", orderId: String(order._id) });

    } catch (err) { next(err); }
};
const addTireOrder = async (req, res, next) => {
    try {
        const io = req.app.get("io");
        const lang = req.headers['accept-language'] || 'en';
        const BASE_URL = process.env.BASE_URL || "https://api.carnoapp.com";

        // 1. استخراج الـ ID من التوكن (اليوزر العادي كما أكدت)
        const userIdFromToken = req.user.id; 

        // 2. البحث عن بيانات العميل في جدول المستخدمين (User Model)
        // هذا يحل مشكلة الشاشة البيضاء في الجوال (reading _id)
      const user = await User.findById(userIdFromToken);
      const pricing = await ServiceProviderPricing.findOne({});
      let startP = 0, endP = 0;
        if (req.body.serviceType === "battery Jumpstart") {
            startP = pricing.batteryStartPrice || 0;
            endP = pricing.batteryEndPrice || 0;
        } else {
            startP = pricing.tireStartPrice || 0;
            endP = pricing.tireEndPrice || 0;
        }let price = startP; 
        
        // إذا حبيت تضيف حسبة مسافة بسيطة هنا تقدر، لكن الأهم:
        price = Math.max(price, startP); // لا يقل عن المبدئي
        if (endP > 0) price = Math.min(price, endP)
        const senderName = user ? user.username : (lang === 'ar' ? "عميل" : "Client");

        // 3. استخراج الإحداثيات (لضمان هيكل الـ Object السليم في Compass)
        const location = {
            lat: parseFloat(req.body['location.lat']),
            long: parseFloat(req.body['location.long'])
        };

        const imageUrl = req.file ? BASE_URL + saveImage(req.file) : "";

        // 4. تجهيز البيانات النهائية للحفظ في الداتابيز
        const formatedData = {
            ...req.body,
            userId: userIdFromToken, // ربط الطلب باليوزر العادي
            image: imageUrl,
            location: location,
            // ضمان وجود الحقول المطلوبة لتجنب أخطاء "Required"
            locationText: req.body.locationText || "Riyadh",
          paymentType: req.body.paymentType || "cash",
            price: Math.round(price),
            details: req.body.details || "",
          orderNumber: await getNextOrderNumber("order")
        };

        // 5. تصفية البيانات للتحقق (حذف المفاتيح النصية التي يرفضها Joi)
        // هذا يحل خطأ "location.lat is not allowed" الذي ظهر في Postman
        const { 
            'location.lat': _l1, 
            'location.long': _l2, 
          orderNumber: _o, 
          price: _p,
            searchRadius: _s,
            ...validationData 
        } = formatedData;

        // 6. التحقق من البيانات (Validation)
        const { error } = serviceTireValidationSchema(lang).validate(validationData);
        if (error) {
            return res.status(400).json({ 
                status: false, 
                code: 400, 
                message: error.details[0].message 
            });
        }

        // 7. الحفظ الفعلي في قاعدة البيانات (كما في صور Compass الناجحة)
      const order = await serviceProviderOrders.create(formatedData);
      io.to(`order_${order._id}`).emit("orderStatus", { 
          orderId: order._id, 
          status: "searching" 
      });
      
        let tireProviders;
        if (formatedData.serviceType === "battery Jumpstart") {
            tireProviders = await tire.find({ serviceType: "battery Jumpstart", status: "accepted" });
        } else {
            tireProviders = await tire.find({ serviceType: "tire Filling", status: "accepted" });
        }

const targetServiceCode = formatedData.serviceType === "battery Jumpstart" ? "3" : "2";
        const serviceProviders = await serviceProvider.find({ 
            serviceType: targetServiceCode, 
            status: "accepted",
            isDeleted: false 
        });
        // 9. إرسال Socket والتنبيهات
const nearbyProviders = serviceProviders.filter(p => {
            if (p.location?.lat && p.location?.long) {
                const dist = haversineDistance(location.lat, location.long, p.location.lat, p.location.long);
                return (dist * 1000) <= 50; // تحويل الكيلومتر إلى متر
            }
            return false;
        });

        const socketData = { 
            id: order._id, 
            serviceType: order.serviceType, 
            username: senderName,
            price: order.price,
            location: location,
            rating: "0.0" 
      };
      nearbyProviders.forEach(p => {
            if (p.socketId) {
                io.to(p.socketId).emit("serviceProviderOrderTire", socketData);
            }
        });
if (serviceProviders.length > 0) {
            await sendNotificationToMany({
                targets: serviceProviders,
                targetType: "serviceProvider",
                titleAr: formatedData.serviceType === "battery Jumpstart" ? "طلب اشتراك بطارية 🔋" : "طلب خدمة إطارات 🛠️",
                titleEn: "New Service Request",
                messageAr: `تم استلام طلب جديد من ${senderName}`,
                messageEn: `New request from ${senderName}`,
                actionType: "order",
                request: "true", 
                orderId: String(order._id),
                orderModel: "ServiceProviderOrders",
                lang: lang
            });
            console.log("✅ تم إرسال إشعارات البطارية/الكفرات");
        } else {
            console.log("⚠️ لم يتم إرسال إشعارات: لا يوجد فنيين مقبولين بهذا النوع");
        }


        return res.status(200).json({ 
            status: true, 
            code: 200, 
          message: lang === 'ar' ? "تم إنشاء الطلب بنجاح" : "Order created successfully",
           orderId: String(order._id)
        });

    } catch (err) { 
        next(err); 
    }
};
    const changeStatusForOrder = async (req, res, next) => {
      try {
        const lang = req.headers['accept-language'] || 'en';
        const providerId = req.user.id;
        const role = req.user.role;
        const io = req.app.get('io');

        if (role != "serviceProvider") {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang == "en" ? "Not allowed, role should be serviceProvider" : "غير مسموح لك، يجب أن يكون الدور موفر خدمة"
          });
        }

        const { orderId, status } = req.body;

        if (!orderId || !status) {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang === 'ar' ? "الرجاء توفير معرف الطلب والحالة" : "Please provide order ID and status"
          });
        }

        const order = await serviceProviderOrders.findById(orderId);
        const provider = await ServiceProvider.findOne({ _id: providerId });
        const user = await User.findOne({ _id: order.userId });
        if (!order) {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang === 'ar' ? "الطلب غير موجود" : "Order not found"
          });
        }

        if (status === "accepted") {
          // ✅ تحقق مما إذا كان لدى الموفر طلب غير منتهي
          const activeOrder = await serviceProviderOrders.findOne({
            providerId: providerId,
            ended: false,
            status: "accepted"
          });

          if (activeOrder) {
            return res.status(400).send({
              status: false,
              code: 400,
              message: lang === 'ar'
                ? "لا يمكنك قبول طلب جديد قبل إنهاء الطلب الحالي"
                : "You can't accept a new order before ending the current one"
            });
          }

          order.status = "accepted";
          order.providerId = providerId;
          order.ended = true;
          await order.save();
        const io = req.app.get("io");
        if (io) {
        io.to(`order_${orderId}`).emit("orderStatus", {
          orderId: orderId,
          status: "accepted",
          providerId: providerId, // نرسل الـ ID عشان الفرونت يجلب بيانات المندوب
          messageAr: "تم قبول طلبك، المندوب في الطريق",
          messageEn: "Order accepted, provider is on the way"
        });
        console.log(`📡 [ACCEPTED] Socket signal sent to room: order_${orderId}`);
      }
          await sendNotification({
            target: user, // المستخدم اللي قدم الطلب
            targetType: "User",
            titleAr: "تمت الموافقة على طلبك",
            titleEn: "Your order has been approved",
            messageAr: `تمت الموافقة على طلبك من قبل ${provider.username || 'المقدم'}`,
            messageEn: `Your order has been approved by ${provider.username || 'the provider'}`,
            actionType: "order",
            orderId: order._id,
            orderModel: "ServiceProviderOrders", // أو OrdersRentalOffice حسب نوع الطلب
            lang: lang, // لو المستخدم عنده لغة محفوظة
          });

          return res.status(200).send({
            status: true,
            code: 200,
            message: lang === 'ar' ? "تم قبول الطلب بنجاح" : "Order accepted successfully"
          });
        } else {
          if (status === "refused") {
            await sendNotification({
              target: user,
              targetType: "User",
              titleAr: "تم رفض طلبك",
              titleEn: "Your order has been rejected",
              messageAr: `تم رفض طلبك رقم ${order._id} من قبل ${provider.username || 'المقدم'}`,
              messageEn: `Your order #${order._id} has been rejected by ${provider.username || 'the provider'}`,
              actionType: "order",
              orderId: order._id,
              orderModel: "ServiceProviderOrders", // أو OrdersRentalOffice حسب نوع الطلب
              lang: lang,
            });

            return res.status(200).send({
              status: true,
              code: 200,
              message: lang === 'ar' ? "تم رفض الطلب" : "Order refused successfully"
            });
          }
        }
      } catch (err) {
        next(err);
      }
    }
    const ordersAndProfit = async (req, res, next) => {
      try {
        const lang = req.headers['accept-language'] || 'en';
        const providerId = req.user.id;

        // تحديد بداية ونهاية اليوم
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // استعلام الطلبات الخاصة بمقدم الخدمة خلال اليوم
        const orders = await serviceProviderOrders.find({
          providerId,
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const totalProfit = orders.reduce((sum, order) => {
          const price = Number(order.price);
          return sum + (isNaN(price) ? 0 : price);
        }, 0);

        return res.status(200).json({
          status: true,
          code: 200,
          message: lang === 'ar' ? "تم حساب الأرباح وعدد الطلبات لليوم بنجاح" : "Today's profit and orders calculated successfully",
          data: {
            totalOrders: orders.length,
            totalProfit: totalProfit.toFixed(2)
          }
        });

      } catch (error) {
        next(error);
      }
    }
    const reportForProvider = async (req, res, next) => {
      try {
        const lang = req.headers['accept-language'] || 'en';
        const providerId = req.user.id;

        // تحديد بداية ونهاية اليوم
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // استعلام الطلبات الخاصة بمقدم الخدمة خلال اليوم
        const orders = await serviceProviderOrders.find({
          providerId,
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const totalProfit = orders.reduce((sum, order) => {
          const price = Number(order.price);
          return sum + (isNaN(price) ? 0 : price);
        }, 0);
        const ratings = await orderRating.find({
          providerId,
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        const sessions = await workSession.find({
          providerId,
          startTime: { $gte: startOfDay, $lte: endOfDay },
          endTime: { $ne: null }
        });

        // 🧮 نحسب إجمالي عدد الساعات
        let totalMilliseconds = 0;

        for (let session of sessions) {
          const start = new Date(session.startTime);
          const end = new Date(session.endTime);
          totalMilliseconds += end - start;
        }

        const totalHours = (totalMilliseconds / (1000 * 60 * 60)).toFixed(2);
        return res.status(200).send({
          status: true,
          code: 200,
          data: {
            totalOrders: orders.length,
            totalProfit: totalProfit.toFixed(2),
            totalRatings: ratings.length,
            totalHours: totalHours
          }
        })

      }
      catch (error) {
        next(error)
      }
}
    const getOrdersByServiceProvider = async (req, res, next) => {
      try {
        const lang = req.headers['accept-language'] || 'en';
        const providerId = req.user.id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const paymentStatusTranslations = {
          en: {
            inProgress: "inProgress",
            paid: "Paid"
          },
          ar: {
            inProgress: "بأنتظار الدفع",
            paid: "تم الدفع"
          }
        };
        const active = req.query.active === "true"; // بتحول 
        console.log(active)

        // حدد قيمة paymentStatus بناءً على قيمة active
        const paymentStatusFilter = active ? "inProgress" : "paid";

        const filter = {
          providerId: providerId,
          status: "accepted",
          paymentStatus: paymentStatusFilter
        };

        const totalOrders = await serviceProviderOrders.countDocuments(filter);

        const orders = await serviceProviderOrders
          .find(filter)
          .populate('userId', 'username image')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });

        const provider = await ServiceProvider.findOne({ _id: providerId });

        if (!provider?.location?.lat || !provider?.location?.long) {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang === 'ar' ? "موقع مزود الخدمة غير متاح" : "Service provider location not available"
          });
        }

        const enrichedOrders = await Promise.all(
          orders.map(async (order) => {
            let distance = null;
            console.log(order.paymentStatus)
            const paymentStatusText = paymentStatusTranslations[lang][order.paymentStatus] || "";
            if (order?.location?.lat && order?.location?.long) {
              distance = haversineDistance(
                provider.location.lat,
                provider.location.long,
                order.location.lat,
                order.location.long
              ).toFixed(2);
            }

            // متوسط التقييم للمستخدم
            let averageRating = null;
            const reviews = await providerRating.find({ userId: order.userId._id });
            if (reviews.length > 0) {
              const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
              averageRating = (total / reviews.length).toFixed(1);
            }

            return {
              id: order._id,
              createdAt: order.createdAt,
              serviceType: ACCOUNT_CATEGORIES.SERVICES[order.serviceType]?.[lang] || order.serviceType,
              userId: order.userId._id,
              price: order.price !== undefined && order.price !== null ? order.price : 0,
              paymentStatus: order.paymentStatus,
              distance: distance ? `${distance} km` : "",
              username: order.userId.username,
              image: order.userId.image,
              rating: averageRating || "0.0",
              paymentStatusText,
              dropoffLocation: order.dropoffLocation,
              dropoffLocationText: order.dropoffLocationText,
              locationText: order.locationText,
              location: order.location
            };
          })
        );

        return res.status(200).send({
          status: true,
          code: 200,
          message: lang === 'ar' ? "تم استرجاع الطلبات بنجاح" : "Orders retrieved successfully",
          data: {
            orders: enrichedOrders,
            pagination: {
              page,
              totalPages: Math.ceil(totalOrders / limit),
            }
          }
        });

      } catch (error) {
        next(error);
      }
}
    
  const calculatePrice = async (order) => {
  const pricing = await ServiceProviderPricing.findOne();
  if (!pricing) return order.price || 0;

if (order.serviceType === 'winch') {
  const distance = haversineDistance(
    order.location.lat,
    order.location.long,
    order.dropoffLocation.lat,
    order.dropoffLocation.long
  );

  const baseDistance = pricing.winchDistance || 1; // الكيلو الأول
  const fixedPrice = pricing.winchFixedPrice || 0; // سعر الكيلو الأول
  const pricePerKm = pricing.winchOpenPrice || 0;  // سعر كل كيلو زيادة

  let price = fixedPrice; // نبدأ بالسعر الثابت

  if (distance > baseDistance) {
    const extraKm = distance - baseDistance;
    price += extraKm * pricePerKm;
  }

  return Math.round(price);
} else if (order.serviceType === 'tire Filling') {
    const start = pricing.tireStartPrice || 0;
    const end = pricing.tireEndPrice || 0;
    return Math.min(Math.max(order.price || start, start), end);

  } else if (order.serviceType === 'battery Jumpstart') {
    const start = pricing.batteryStartPrice || 0;
    const end = pricing.batteryEndPrice || 0;
    return Math.min(Math.max(order.price || start, start), end);
  }
  

  return order.price || 0;
};
    const getOrderById = async (req, res, next) => {
      try {
        const lang = req.headers['accept-language'] || 'en';
        const providerId = req.user.id;

        const order = await serviceProviderOrders.findOne({ _id: req.params.id, providerId });
        if (!order) {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang === "ar" ? "الطلب غير موجود" : "Order not found"
          });
        }

        const user = await User.findOne({ _id: order.userId });

        // ✅ حساب متوسط التقييم
        const ratingDocs = await providerRating.find({ userId: user._id });
        const totalRating = ratingDocs.reduce((sum, doc) => sum + doc.rating, 0);
        const avgRating = ratingDocs.length > 0 ? (totalRating / ratingDocs.length).toFixed(1) : "0.0";

        const calculatedPrice = await calculatePrice(order);


        let formattedOrder = {};
        if (order.serviceType === "tire Filling" || order.serviceType === "battery Jumpstart") {
          formattedOrder = {
            id: order._id,
            orderNumber: order.orderNumber,
            userData: {
              id: user._id,
              image: user.image,
              username: user.username,
              phone: user.phone,
              avgRating: avgRating,
            },
            location: order.location,
            createdAt: order.createdAt,
            image: order.image,
            serviceType: order.serviceType,
            paymentStatus: order.paymentStatus,
            price: calculatedPrice,
            details: order.details,
            userLocation: user.location,
            paymentType: order.paymentType,
            tripStatus: order.tripStatus,
            invoiceIssued: order.invoiceIssued
          };
        } else {
          formattedOrder = {
            id: order._id,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            image: order.image,
            userData: {
              userId: user._id,
              image: user.image,
              username: user.username,
              phone: user.phone,
              avgRating: avgRating,
            },
            location: order.location,
            paymentStatus: order.paymentStatus,
            price: calculatedPrice,
            details: order.details,
            userLocation: user.location,
            paymentType: order.paymentType,
            dropoffLocation: order.dropoffLocation,
            serviceType: order.serviceType,
            tripStatus: order.tripStatus,
            invoiceIssued: order.invoiceIssued
          };
        }

        return res.status(200).send({
          status: true,
          code: 200,
          message: lang === "en" ? "Order retrieved" : "تم استرجاع الطلب بنجاح",
          data: formattedOrder
        });

      } catch (error) {
        next(error);
      }
    }
    const endOrder = async (req, res, next) => {
      try {
        const lang = req.headers['accept-language'] || 'en';
        const providerId = req.user.id;
        const role = req.user.role;

        if (role !== "serviceProvider") {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang === 'ar'
              ? "غير مصرح لك، يجب أن تكون موفر خدمة"
              : "Not authorized, must be a service provider"
          });
        }

        const { orderId } = req.body;

        if (!orderId) {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang === 'ar'
              ? "يرجى توفير معرف الطلب"
              : "Please provide order ID"
          });
        }

        const order = await serviceProviderOrders.findOne({
          _id: orderId,
          providerId: providerId
        });

        if (!order) {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang === 'ar'
              ? "الطلب غير موجود"
              : "Order not found"
          });
        }

        if (order.status !== "accepted" ) {
          return res.status(400).send({
            status: false,
            code: 400,
            message: lang === 'ar'
              ? "لا يمكن إنهاء هذا الطلب"
              : "This order cannot be ended"
          });
        }

        order.ended = true;
        await order.save();

        return res.status(200).json({
          status: true,
          code: 200,
          message: lang === 'ar'
            ? "تم إنهاء الطلب بنجاح"
            : "Order ended successfully"
        });

      } catch (err) {
        next(err);
      }
    }
const getOrderByIdForUser = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const userId = req.user.id;
    const order = await serviceProviderOrders.findById(req.params.id).populate("providerId");

    if (!order) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "ar" ? "الطلب غير موجود" : "Order not found"
      });
    }

    let providerData = undefined;

    // تحقق أولاً هل يوجد مقدم خدمة وافق على الطلب أم لا
    if (order.providerId) {
      const ratingDocs = await providerRating.find({ providerId: order.providerId._id });
      const totalRating = ratingDocs.reduce((sum, doc) => sum + doc.rating, 0);
      const avgRating = ratingDocs.length > 0 ? (totalRating / ratingDocs.length).toFixed(1) : "0.0";

      providerData = {
        id: order.providerId._id,
        image: order.providerId.image,
        username: order.providerId.username,
        avgRating: avgRating,
      };
    }
    const existingRating = await review.findOne({ userId, orderId: order._id });
    // تجهيز البيانات سواء بوجود مقدم خدمة أو بدونه
    const formattedOrder = {
      id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      image: order.image,
      serviceType: order.serviceType,
      status: order.status, // مهم لمعرفة هل هو pending أو accepted
      paymentStatus: order.paymentStatus,
      price: order.price || 0,
      details: order.details,
      location: order.location,
      dropoffLocation: order.dropoffLocation,
      providerData: providerData, 
      isRated: !!existingRating
    };

    return res.status(200).send({
      status: true,
      code: 200,
      data: formattedOrder
    });

  } catch (error) {
    next(error);
  }
}
const getServiceLiveStats = async (req, res, next) => {
  try {
    const { serviceType } = req.query; 
    
    // 1. تحويل المسمى النصي (winch) إلى الكود المخزن في الداتابيز (1)
    // تأكد من الأكواد عندك (1 للونش، 2 للبنشر، 3 للبطارية)
    let serviceCode = serviceType;
    if (serviceType === 'winch') serviceCode = "1";
    else if (serviceType === 'tire Filling') serviceCode = "2";
    else if (serviceType === 'battery Jumpstart') serviceCode = "3";

    const stats = await ServiceProvider.aggregate([
      {
        // البحث عن الموفرين بالكود (مثلاً "1")
        $match: {
          serviceType: serviceCode,
          status: "accepted",
          isDeleted: false
        }
      },
      {
        // 2. الربط مع جدول التقييمات الصحيح
        $lookup: {
          from: "providerratings", 
          localField: "_id",
          foreignField: "serviceProviderId",
          as: "allReviews"
        }
      },
      {
        $addFields: {
          // فحص المتواجدين حالياً (Online)
          isOnline: { 
            $cond: [
              { $and: [
                  { $ne: ["$fcmToken", null] }, 
                  { $ne: ["$fcmToken", ""] }
              ]}, 1, 0
            ] 
          },
          providerAvg: { $avg: "$allReviews.rating" },
          providerReviewCount: { $size: "$allReviews" }
        }
      },
      {
        $group: {
          _id: null,
          overallAvgRating: { $avg: "$providerAvg" },
          totalParticipation: { $sum: "$providerReviewCount" },
          availableCount: { $sum: "$isOnline" }
        }
      }
    ]);

    // إذا لم يجد شيئاً (يرجع أصفار بأمان)
    if (stats.length === 0) {
      return res.status(200).json({
        status: true,
        code: 200,
        data: {
          rating: "0.0",
          reviewsCount: 0,
          availableProviders: 0,
          isAvailable: false
        }
      });
    }

    const result = stats[0];
    return res.status(200).json({
      status: true,
      code: 200,
      data: {
        rating: result.overallAvgRating ? result.overallAvgRating.toFixed(1) : "0.0",
        reviewsCount: result.totalParticipation || 0,
        availableProviders: result.availableCount || 0,
        isAvailable: result.availableCount > 0
      }
    });
  } catch (err) {
    next(err);
  }
};

const notificationMessages = {
  on_the_way: {
    titleAr: "المزود في الطريق إليك 🚗",
    titleEn: "Provider is on the way 🚗",
    messageAr: "مقدم الخدمة في طريقه إلى موقعك",
    messageEn: "The provider is heading to your location"
  },
  arrived: {
    titleAr: "مقدم الخدمة وصل ✅",
    titleEn: "Provider has arrived ✅",
    messageAr: "مقدم الخدمة وصل إلى موقعك",
    messageEn: "The provider has arrived at your location"
  },
  loaded: {
    titleAr: "تم تحميل السيارة 🚛",
    titleEn: "Car has been loaded 🚛",
    messageAr: "تم تحميل سيارتك على الونش",
    messageEn: "Your car has been loaded onto the winch"
  },
  arrived_dropoff: {
    titleAr: "تم الوصول لموقع التنزيل 📍",
    titleEn: "Arrived at dropoff location 📍",
    messageAr: "وصلنا إلى موقع التنزيل",
    messageEn: "We have arrived at the dropoff location"
  },
  completed: {
    titleAr: "تم إنهاء الطلب 🎉",
    titleEn: "Order completed 🎉",
    messageAr: "تم إنهاء طلبك بنجاح",
    messageEn: "Your order has been completed successfully"
  }
};
const changeTripStatus = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const providerId = req.user.id;
    const { orderId, tripStatus } = req.body;

    if (!orderId || !tripStatus) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "يرجى توفير معرف الطلب والحالة" : "Please provide order ID and trip status"
      });
    }

    const validStatuses = ['on_the_way', 'arrived', 'loaded', 'arrived_dropoff', 'completed'];
    if (!validStatuses.includes(tripStatus)) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "الحالة غير صحيحة" : "Invalid trip status"
      });
    }

    const order = await serviceProviderOrders.findOne({ _id: orderId, providerId });

    if (!order) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "الطلب غير موجود" : "Order not found"
      });
    }

    if (order.serviceType !== 'winch' && ['loaded', 'arrived_dropoff'].includes(tripStatus)) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "هذه الحالة غير متاحة لهذا النوع من الخدمة" : "This status is not available for this service type"
      });
    }

    order.tripStatus = tripStatus;
    await order.save();
    const user = await User.findById(order.userId);

    const notification = notificationMessages[tripStatus];

    if (user) {
      try {
        await sendNotification({
          target: user,
          targetType: "User",
          titleAr: notification.titleAr,
          titleEn: notification.titleEn,
          messageAr: notification.messageAr,
          messageEn: notification.messageEn,
          actionType: "order",
          orderId: order._id,
          orderModel: "ServiceProviderOrders",
          lang: lang
        });
      } catch (notifErr) {
      }
    } else {
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit("tripStatusChanged", {
        orderId,
        tripStatus,
        titleAr: notification.titleAr,
        titleEn: notification.titleEn,
        messageAr: notification.messageAr,
        messageEn: notification.messageEn
      });
    }

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === 'ar' ? "تم تحديث حالة الرحلة" : "Trip status updated successfully",
      data: { tripStatus }
    });

  } catch (err) {
    next(err);
  }
};
const issueInvoice = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const providerId = req.user.id;
    const { orderId } = req.body;

    const order = await serviceProviderOrders.findOne({ _id: orderId, providerId });
    if (!order) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "الطلب غير موجود" : "Order not found"
      });
    }

    if (order.invoiceIssued) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "الفاتورة صدرت مسبقاً" : "Invoice already issued"
      });
    }

    order.invoiceIssued = true;
    await order.save();

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === 'ar' ? "تم إصدار الفاتورة بنجاح" : "Invoice issued successfully"
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {

  addWinchOrder,

  addTireOrder,

  getOrdersbyServiceType,

  changeStatusForOrder,

  ordersAndProfit,

  reportForProvider,

  getOrdersByServiceProvider,

  getOrderById,

  endOrder,

  getOrderByIdForUser,

  getServiceLiveStats,

  changeTripStatus,

  issueInvoice
}