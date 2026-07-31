const contactUsSchema = require("../validation/contactUsValidition");
const contactUs = require("../models/contactUs");
const getMessages = require("../configration/getmessages");

// ✅ 1. إرسال رسالة من طرف المستخدم (تبدأ المحادثة أو تتبعها)
const addcontactUs = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const messages = getMessages(lang);
        const role = req.user.role;
        const userId = req.user.id;

        const { error } = contactUsSchema(lang).validate(req.body);
        if (error) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: error.details[0].message
            });
        }

        const messageData = {
            name: req.body.name,
            phone: req.body.phone,
            message: req.body.message,
            senderType: role,
            senderId: userId,
            chatId: userId // 💡 الـ chatId هنا هو دائماً الـ userId لدمج كل رسائله
        };

        await contactUs.create(messageData);

        return res.status(200).send({
            status: true,
            code: 200,
            message: messages.contactus.success,
        });
    } catch (err) {
        next(err);
    }
};

// ✅ 2. جلب القائمة الرئيسية (تجميع المحادثات بدون تكرار)
const getContactList = async (req, res, next) => {
    try {
        const list = await contactUs.aggregate([
            { $sort: { createdAt: -1 } }, // الترتيب من الأحدث
            {
                $group: {
                    _id: "$chatId", // 💡 التجميع بالـ chatId يمنع تكرار العميل
                    lastMessage: { $first: "$message" },
                    lastDate: { $first: "$createdAt" },
                    // جلب أول اسم ورقم ليسوا "أدمن" لضمان ظهور بيانات العميل
                    allNames: { $push: "$name" },
                    allPhones: { $push: "$phone" }
                }
            },
            {
                $project: {
                    chatId: "$_id",
                    lastMessage: 1,
                    date: "$lastDate",
                    name: {
                        $arrayElemAt: [
                            { $filter: { input: "$allNames", as: "n", cond: { $ne: ["$$n", "الدعم الفني - كارنو"] } } },
                            0
                        ]
                    },
                    phone: {
                        $arrayElemAt: [
                            { $filter: { input: "$allPhones", as: "p", cond: { $ne: ["$$p", "Admin"] } } },
                            0
                        ]
                    }
                }
            },
            { $sort: { date: -1 } }
        ]);

        return res.status(200).send({
            status: true,
            code: 200,
            data: list.map(item => ({
                chatId: item.chatId,
                name: item.name || "مستخدم كارنو",
                phone: item.phone,
                lastMessage: item.lastMessage,
                date: item.date,
                image: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'C')}&background=random&color=fff`
            }))
        });
    } catch (err) { next(err); }
};

// ✅ 3. جلب تفاصيل المحادثة (الشات الكامل)
const getContactDetails = async (req, res, next) => {
    try {
        const { id } = req.params; // هنا id هو الـ chatId (ID العميل)
        const messages = await contactUs.find({ chatId: id }).sort({ createdAt: 1 });

        if (!messages.length) {
            return res.status(404).send({ status: false, message: "No conversation found" });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            data: messages
        });
    } catch (err) { next(err); }
};

// ✅ 4. رد الأدمن (ينزل في نفس محادثة العميل)
const adminReply = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const { chatId, message } = req.body; // نرسل chatId (ID العميل) والرسالة

        if (!chatId || !message) {
            return res.status(400).send({ status: false, message: "chatId and message are required" });
        }

        const replyData = {
            name: "الدعم الفني - كارنو",
            phone: "Admin",
            message: message,
            senderType: "admin",
            senderId: req.user.id, // ID الأدمن
            chatId: chatId         // 💡 يربط الرد بنفس غرفة شات العميل
        };

        await contactUs.create(replyData);

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === 'ar' ? "تم إرسال الرد بنجاح" : "Reply sent successfully"
        });
    } catch (err) { next(err); }
};

module.exports = {
    addcontactUs,
    getContactList,
    getContactDetails,
    adminReply
};