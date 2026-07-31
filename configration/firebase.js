// const admin = require("firebase-admin");
// const serviceAccount = require("../firebaseKey.json");
// const Notification = require("../models/notification");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://carno-ba33e-default-rtdb.firebaseio.com"
// });
// const sendNotification = async ({
//   target,       // المستخدم أو الجهة اللى هيستقبل الإشعار
//   targetType,   // User | rentalOffice | serviceProvider
//   titleAr,
//   titleEn,
//   messageAr,
//   messageEn,
//   lang,
//   actionType = "system",
//   senderId = null,
//   orderId = null,
//   orderModel = null,
//   type,
//   request
// }) => {
//   try {
//     const finalTitle = lang === "ar" && titleAr ? titleAr : titleEn;
//     const finalMessage = lang === "ar" && messageAr ? messageAr : messageEn;
//     await Notification.create({
//       targetId: target._id,
//       targetType,
//       orderId,
//       orderModel,
//       request,
//       message:{ ar: messageAr, en: messageEn },
//       title: { ar: titleAr, en: titleEn },
//       actionType,
//       type
//     });

//     if (target.fcmToken) {
//       const payload = {
//         notification: { title:finalTitle, body: finalMessage },
//         data: {
//           actionType,
//           request,
//           ...(senderId ? { senderId: senderId.toString() } : {}),
//           ...(orderId ? { orderId: orderId.toString() } : {}),
//           ...(orderModel ? { orderModel } : {}),
//         },
//         token: target.fcmToken,
//       };
//       await admin.messaging().send(payload);
//       console.log("✅ Notification sent successfully!");
//     } else {
//       console.log("⚠️ Target has no FCM token");
//     }
//   } catch (error) {
//     console.error("❌ Error sending notification:", error);
//   }
// };
// const sendNotificationToMany = async ({
//   targets = [],   // array of users/admins
//   targetType,
//   titleAr,
//   titleEn,
//   messageAr,
//   messageEn,
//   lang = "ar",
//   actionType = "system",
//   senderId = null,
//   orderId = null,
//   orderModel = null,
// }) => {
//   try {
//     const finalTitle = lang === "ar" && titleAr ? titleAr : titleEn;
//     const finalMessage = lang === "ar" && messageAr ? messageAr : messageEn;

//     // 🧾 خزّني الإشعارات كلها فى MongoDB
//     const notifications = targets.map(t => ({
//       targetId: t._id,
//       targetType,
//       title: { ar: titleAr, en: titleEn },
//       message: { ar: messageAr, en: messageEn },
//       actionType,
//       orderId,
//       orderModel,
//       request,
//       type
//     }));

//     await Notification.insertMany(notifications);

//     // 🎯 جهّزى التوكنات
//     const tokens = targets
//       .map(t => t.fcmToken)
//       .filter(token => !!token); // بس اللى عنده توكن

//     if (tokens.length > 0) {
//       const payload = {
//         notification: { title: finalTitle, body: finalMessage },
//         data: {
//           actionType,
//           ...(senderId ? { senderId: senderId.toString() } : {}),
//           ...(orderId ? { orderId: orderId.toString() } : {}),
//           ...(orderModel ? { orderModel } : {}),
//         },
//         tokens,
//       };

//       await admin.messaging().sendEachForMulticast(payload);
//       console.log(`✅ Notification sent to ${tokens.length} users`);
//     } else {
//       console.log("⚠️ No FCM tokens found");
//     }
//   } catch (error) {
//     console.error("❌ Error sending notifications:", error);
//   }
// };

// const db = admin.database();
// module.exports = { db, sendNotification,sendNotificationToMany };
const admin = require("firebase-admin");
const serviceAccount = require("../firebaseKey.json");
const Notification = require("../models/notification");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://carno-ba33e-default-rtdb.firebaseio.com"
});

const sendNotification = async ({
  target,
  targetType,
  titleAr,
  titleEn,
  messageAr,
  messageEn,
  lang = "ar", // أضفت قيمة افتراضية
  actionType = "system",
  senderId = null,
  orderId = null,
  orderModel = null,
  type,
  request
}) => {
  try {
    const finalTitle = lang === "ar" && titleAr ? titleAr : titleEn;
    const finalMessage = lang === "ar" && messageAr ? messageAr : messageEn;

    // 1. التخزين في MongoDB
    await Notification.create({
      targetId: target._id,
      targetType,
      orderId,
      orderModel,
      request,
      message: { ar: messageAr, en: messageEn },
      title: { ar: titleAr, en: titleEn },
      actionType,
      type
    });

    if (target.fcmToken) {
      // 2. بناء الرسالة بتنسيق V1 مع تحويل كل قيم data إلى نصوص Strings
      const message = {
        token: target.fcmToken,
        notification: { 
          title: String(finalTitle || ""), 
          body: String(finalMessage || "") 
        },
        data: {
          actionType: String(actionType || "system"),
          request: String(request || ""),
          senderId: senderId ? String(senderId) : "",
          orderId: orderId ? String(orderId) : "",
          orderModel: orderModel ? String(orderModel) : "",
          type: String(type || "")
        },
        // أضفت لك قسم الـ APNs عشان يشتغل على الأيفون بصوت وتنبيه
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              "content-available": 1
            }
          }
        }
      };

      await admin.messaging().send(message);
      console.log("✅ Notification sent successfully!");
    } else {
      console.log("⚠️ Target has no FCM token");
    }
  } catch (error) {
    console.error("❌ Error sending notification:", error.message);
  }
};

const sendNotificationToMany = async ({
  targets = [],
  targetType,
  titleAr,
  titleEn,
  messageAr,
  messageEn,
  lang = "ar",
  actionType = "system",
  senderId = null,
  orderId = null,
  orderModel = null,
  request,
  type
}) => {
  try {
    const finalTitle = lang === "ar" && titleAr ? titleAr : titleEn;
    const finalMessage = lang === "ar" && messageAr ? messageAr : messageEn;

    const notifications = targets.map(t => ({
      targetId: t._id,
      targetType,
      title: { ar: titleAr, en: titleEn },
      message: { ar: messageAr, en: messageEn },
      actionType,
      orderId,
      orderModel,
      request,
      type
    }));

    await Notification.insertMany(notifications);

    const tokens = targets
      .map(t => t.fcmToken)
      .filter(token => !!token);

    if (tokens.length > 0) {
      // استخدام sendEachForMulticast مع التأكد من الـ Strings
      const message = {
        notification: { 
          title: String(finalTitle || ""), 
          body: String(finalMessage || "") 
        },
        data: {
          actionType: String(actionType || "system"),
          senderId: senderId ? String(senderId) : "",
          orderId: orderId ? String(orderId) : "",
          orderModel: orderModel ? String(orderModel) : "",
        },
        tokens: tokens,
      };

      await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ Notification sent to ${tokens.length} users`);
    } else {
      console.log("⚠️ No FCM tokens found");
    }
  } catch (error) {
    console.error("❌ Error sending notifications:", error.message);
  }
};

const db = admin.database();
module.exports = { db, sendNotification, sendNotificationToMany };