const mongoose = require('mongoose');
const Car = require("../models/car");
const CarPlate = require("../models/carPlate");
const Posts = require("../models/post");
const SlavgePost = require("../models/slavgePost");
const CenterService = require("../models/centerServices");
const CarRental = require("../models/carRental");
const ShowRoomPosts = require("../models/showroomPost");
const Search = require("../models/searchForAnyThing");
//orders
const ServiceProviderOrders = require("../models/serviceProviderOrders");
const RentalOfficeOrders = require("../models/rentalOfficeOrders");
const AuctionOrder = require("../models/auctionOrder");
//rentalOffices
const RentalOffices = require("../models/rentalOffice");
//serviceproviders
const ServiceProviders = require("../models/serviceProvider");
const Winch = require("../models/winsh");
const Tire = require("../models/tire");
//user
const User = require("../models/user");
//report
const Report = require("../models/report");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const { sendNotification } = require("../configration/firebase.js");
const login = async (req, res, next) => {
    try {
        const data = req.body;
        const existAdmin = await Admin.findOne({ email: data.email });

        if (!existAdmin) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: "this admin does not exist"
            });
        }

        // Get password from body
        const password = data.password;

        // Compare passwords
        const match = await bcrypt.compare(password, existAdmin.password);
        if (!match) {
            return res.status(400).send({
                code: 400,
                status: false,
                message: "email or password not correct"
            });
        }

        // Create token
        const token = jwt.sign(
            { id: existAdmin._id, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" } // لو عايزة مدت انتهاء
        );

        return res.status(200).send({
            status: true,
            code: 200,
            message: "admin logged in successfully",
            data: {
                admin: {
                    id: existAdmin._id,
                    email: existAdmin.email,
                    name: existAdmin.username,
                    image: existAdmin.image
                },
                token
            }
        });

    } catch (err) {
        next(err);
    }
};
const getAllPosts = async (req, res, next) => {
    try {
        const cars = await Car.countDocuments({});
        const carplates = await CarPlate.countDocuments({});
        const posts = await Posts.countDocuments({});
        const slavgePosts = await SlavgePost.countDocuments({});
        const carRentals = await CarRental.countDocuments({});
        const showroomPosts = await ShowRoomPosts.countDocuments({});
        const search = await Search.countDocuments({});
        return res.status(200).send({
            status: true,
            code: 200,
            message: "Posts retrieved successfully",
            data: {
                posts: cars + carplates + posts + slavgePosts + carRentals + showroomPosts + search
            }
        })

    }
    catch (err) {
        next(err)
    }
}
const getAllOrders = async (req, res, next) => {
    try {
        const serviceProviderOrders = await ServiceProviderOrders.countDocuments({});
        const rentalOfficeOrders = await RentalOfficeOrders.countDocuments({});
        const auctionOrder = await AuctionOrder.countDocuments({});
        return res.status(200).send({
            status: true,
            code: 200,
            message: "orders retrieved successfully",
            data: {
                posts: serviceProviderOrders + rentalOfficeOrders + auctionOrder
            }
        })

    }
    catch (err) {
        next(err)
    }
}
const approveRentalOffice = async (req, res, next) => {
    try {
        // ✅ التعديل هنا: استخراج الـ ID من البارامترز (Params) لأن الروت يحتوي على :id
        const id = req.params.id; 
        const { status } = req.body; 

        if (!id) return res.status(400).send({ status: false, message: "الـ ID مطلوب" });

        // التحقق من أن الحالة المرسلة صحيحة حسب السكيما الخاصة بك
        if (!['accepted', 'refuded', 'pending'].includes(status)) {
            return res.status(400).send({ status: false, message: "الحالة المرسلة غير صالحة" });
        }

        // تحديث الحالة في قاعدة البيانات
        const office = await RentalOffices.findByIdAndUpdate(
            id,
            { status: status },
            { new: true }
        );

        if (!office) return res.status(404).send({ status: false, message: "مكتب التأجير غير موجود" });

        return res.status(200).send({ 
            status: true, 
            code: 200, 
            message: `تم تحديث الحالة بنجاح إلى ${status}`,
            data: office
        });
    } catch (err) { 
        next(err); 
    }
}
// ✅ 2. جلب تفاصيل مكتب تأجير محدد
const getRentalOfficeDetails = async (req, res, next) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).send({ status: false, message: "الـ ID مطلوب" });

        const office = await RentalOffices.findById(id).populate("cityId", "name").lean();
        
        if (!office) return res.status(404).send({ status: false, message: "المكتب غير موجود" });

        return res.status(200).send({ 
            status: true, 
            code: 200, 
            data: office 
        });
    } catch (err) { next(err); }
};
const getAcceptedRentalOffices = async (req, res, next) => {
    try {
        // البحث عن الحالة 'accepted' فقط
        // حذفنا populate("userId") لأن البيانات موجودة في نفس الجدول
        const offices = await RentalOffices.find({ 
            status: "accepted",
            isDeleted: false 
        })
        .populate("cityId", "name") // نترك فقط المدينة إذا كانت موجودة في السكيما
        .sort({ updatedAt: -1 });

        if (!offices || offices.length === 0) {
            return res.status(200).send({ 
                status: true, 
                code: 200, 
                message: "لا توجد مكاتب مقبولة حالياً", 
                data: [] 
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            count: offices.length,
            message: "تم جلب المكاتب المقبولة بنجاح",
            data: offices
        });
    } catch (err) { 
        next(err); 
    }
};
const getPendingRentalOffices = async (req, res, next) => {
    try {
        // البحث عن الحالة 'pending' (حسب الـ Enum في السكيما الخاصة بك)
        const pendingOffices = await RentalOffices.find({ 
            status: "pending",
            isDeleted: false 
        })
        .populate("cityId", "name") // ربط المدينة فقط
        .sort({ createdAt: -1 });

        if (!pendingOffices || pendingOffices.length === 0) {
            return res.status(200).send({ 
                status: true, 
                code: 200, 
                message: "لا توجد طلبات معلقة حالياً", 
                data: [] 
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            count: pendingOffices.length,
            data: pendingOffices 
        });

    } catch (err) { next(err); }
};
// ✅ 3. جلب منشورات (سيارات) مكتب تأجير محدد
const getRentalOfficePosts = async (req, res, next) => {
    try {
        const officeId = req.query.id;
        if (!officeId) return res.status(400).send({ status: false, message: "الـ ID مطلوب" });
        
        // 1. نفس كودك القديم بالضبط مع إضافة lean لجعل البيانات قابلة للتعديل
        let posts = await CarRental.find({ rentalOfficeId: officeId })
            .sort({ createdAt: -1 })
            .lean();

        // 2. السطر السحري: إضافة حقل id لكل عنصر بدون تغيير محتواه
        posts = posts.map(post => ({
            ...post,
            id: post._id // إضافة ايدي البوست عشان الحذف
        }));

        // 3. نرجع نفس الـ Response اللي كان شغال عندك
        return res.status(200).send({ 
            status: true, 
            code: 200, 
            data: posts 
        });
    } catch (err) { 
        next(err); 
    }
}

const deleteRentalPost = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const { id } = req.params; // نرسل الأيدي في الرابط /delete/:id

        // 1. البحث والحذف
        const deletedPost = await CarRental.findByIdAndDelete(id);

        // 2. التحقق إذا كان موجوداً أصلاً
        if (!deletedPost) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === 'ar' ? "الإعلان غير موجود" : "Post not found"
            });
        }

        // ملاحظة: إذا كان هناك صور مخزنة محلياً، يفضل استدعاء دالة deleteImage هنا
        
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === 'ar' ? "تم حذف الإعلان بنجاح" : "Post deleted successfully"
        });
    } catch (err) {
        next(err);
    }
};
// ✅ الدالة القديمة (getRentalOffice) كما هي لعدم تخريبها
const getRentalOffice = async (req, res, next) => {
    try {
        const rentalOffice = await RentalOffices.find({
            status: { $in: ["accepted", "refused"] }
        })
        const result = await rentalOffice.map(item => ({
            id: item._id,
            username: item.username,
            image: item.image,
            status: item.status,
            type: "مكتب تأجير"
        }));
        return res.status(200).send({
            status: true,
            code: 200,
            message: "your request retrieved successfully",
            data: result
        })
    }
    catch (err) {
        next(err);
    }
}
const getRefusedRentalOffices = async (req, res, next) => {
    try {
        // نستخدم 'refuded' لأنها هي المعرفة في الـ Schema عندك
        const refusedOffices = await RentalOffices.find({ 
            status: "refuded",
            isDeleted: false 
        })
        .populate("cityId", "name")
        .sort({ updatedAt: -1 });

        return res.status(200).send({
            status: true,
            code: 200,
            count: refusedOffices.length,
            message: "تم جلب المكاتب المرفوضة بنجاح",
            data: refusedOffices
        });
    } catch (err) { 
        next(err); 
    }
};
// ✅ الدالة القديمة (deleteRentalOffice) كما هي
const deleteRentalOffice = async (req, res, next) => {
    try {
        const id = req.query.id; // تصحيح: الدالة كانت تحتوي على خطأ `req.query.params.id`
        await RentalOffices.findByIdAndDelete(id)
        return res.status(200).send({
            status: true,
            code: 200,
            message: "rentalOffice deleted successfully"
        })
    }
    catch (err) {
        next(err);
    }
}

const getServiceProviderAccept = async (req, res, next) => {
    try {
        const requests = await ServiceProviders.find({ status: "accepted" }).sort({ createdAt: -1 });

        const result = await Promise.all(
            requests.map(async (provider) => {
                const winchData = await Winch.findOne({ providerId: provider._id }).lean();
                const tireData = await Tire.findOne({ providerId: provider._id }).lean();

                let type = "غير محدد";
                if (tireData) {
                    if (tireData.serviceType === "tire Filling") type = "تعبئة كفر";
                    else if (tireData.serviceType === "battery Jumpstart") type = "اشتراك بطارية";
                    else if (tireData.serviceType === "tire Filling and battery Jumpstart") type = "تعبئة كفر واشتراك بطارية";
                } else if (winchData) {
                    type = "ونش وسطحة";
                }

                const verification = winchData || tireData;
                return {
                    id: provider._id,
                    username: verification?.fullName || provider.username,
                    image: provider.image,
                    status: provider.status,
                    phone: provider.phone,
                    type: type
                };
            })
        );

        return res.status(200).send({ status: true, code: 200, data: result });
    } catch (err) { next(err); }
};

const getServiceProviderRefuse = async (req, res, next) => {
    try {
        const requests = await ServiceProviders.find({ status: "refused" }).sort({ createdAt: -1 });

        const result = await Promise.all(
            requests.map(async (provider) => {
                const winchData = await Winch.findOne({ providerId: provider._id }).lean();
                const tireData = await Tire.findOne({ providerId: provider._id }).lean();

                let type = "غير محدد";
                if (tireData) {
                    if (tireData.serviceType === "tire Filling") type = "تعبئة كفر";
                    else if (tireData.serviceType === "battery Jumpstart") type = "اشتراك بطارية";
                    else if (tireData.serviceType === "tire Filling and battery Jumpstart") type = "تعبئة كفر واشتراك بطارية";
                } else if (winchData) {
                    type = "ونش وسطحة";
                }

                const verification = winchData || tireData;
                return {
                    id: provider._id,
                    username: verification?.fullName || provider.username,
                    image: provider.image,
                    status: provider.status,
                    phone: provider.phone,
                    type: type
                };
            })
        );

        return res.status(200).send({ status: true, code: 200, data: result });
    } catch (err) { next(err); }
};

const getServiceProviderRequests = async (req, res, next) => {
    try {
        const requests = await ServiceProviders.find({ status: "pending" }).sort({ createdAt: -1 });

        const result = await Promise.all(
            requests.map(async (provider) => {
                const winchData = await Winch.findOne({ providerId: provider._id }).lean();
                const tireData = await Tire.findOne({ providerId: provider._id }).lean();

                let type = "غير محدد";
                if (tireData) {
                    if (tireData.serviceType === "tire Filling") type = "تعبئة كفر";
                    else if (tireData.serviceType === "battery Jumpstart") type = "اشتراك بطارية";
                    else if (tireData.serviceType === "tire Filling and battery Jumpstart") type = "تعبئة كفر واشتراك بطارية";
                } else if (winchData) {
                    type = "ونش وسطحة";
                }

                const verification = winchData || tireData;
                return {
                    id: provider._id,
                    username: verification?.fullName || provider.username,
                    image: provider.image,
                    status: provider.status,
                    phone: provider.phone,
                    type: type
                };
            })
        );

        return res.status(200).send({ status: true, code: 200, data: result });
    } catch (err) { next(err); }
};
const getServiceProviderDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. جلب بيانات المزود الأساسية
        const provider = await ServiceProviders.findById(id).lean();
        if (!provider) return res.status(404).send({ status: false, message: "المزود غير موجود" });

        // 2. البحث في جداول التوثيق (winsh و tire)
        const winchData = await Winch.findOne({ providerId: id }).lean();
        const tireData = winchData ? null : await Tire.findOne({ providerId: id }).lean();
        
        const verification = winchData || tireData;

        // 3. جلب الطلبات المنفذة
        const orders = await ServiceProviderOrders.find({ providerId: id, status: "completed" }).lean() || [];

        // 4. بناء الرد مع إصلاح الأخطاء
        const responseData = {
            profile: {
                id: provider._id,
                username: verification?.fullName || provider.username,
                // ✅ إصلاح رابط الصورة: إضافة السلاش الناقص
                image: provider.image ? provider.image.replace("comimages", "com/images") : null,
                rating: provider.rating || 0,
                balance: provider.balance || 0,
                email: verification?.email || provider.email,
                phone: provider.phone,
                // ✅ تحديد نوع الخدمة
                serviceType: winchData ? "ونش وسطحة" : 
                            (tireData?.serviceType === 'tire Filling' ? "تعبئة كفر" : 
                             tireData?.serviceType === 'battery Jumpstart' ? "اشتراك بطارية" : 
                             "تعبئة كفر واشتراك بطارية"),
                status: provider.status
            },
            // ✅ المستندات: ستظهر قيم لو كان النوع "ونش"، وتظل null لو "بطارية/كفر" لأنها غير موجودة بالـ Schema
            documents: {
                nationalIdImage: winchData?.nationalIdImage || null,    
                licenseImage: winchData?.licenseImage || null,       
                carRegistrationImage: winchData?.carRegistrationImage || null, 
                carImage: winchData?.carImage || null                
            },
            bankInfo: {
                iban: verification?.iban || "N/A",
                bankAccountName: verification?.bankAccountName || "N/A"
            },
            orders: orders.map(order => ({
                id: order._id,
                serviceName: order.serviceName || (winchData ? "سحب سيارة" : "خدمة طريق"),
                price: order.price,
                date: order.createdAt
            }))
        };

        return res.status(200).send({ status: true, code: 200, data: responseData });
    } catch (err) {
        next(err);
    }
};

const updateServiceProviderStatus = async (req, res, next) => {
    try {
        const { id, status, type, reason } = req.body;
        const lang = req.headers['accept-language'] || 'en';

        const provider = await ServiceProviders.findByIdAndUpdate(id, { status: status }, { new: true });

        if (!provider) {
            return res.status(404).send({ status: false, message: "Provider not found" });
        }

        const model = type === 'winsh' ? Winch : Tire;
        await model.findOneAndUpdate({ providerId: id }, { status: status });

        if (status === "accepted") {
            await sendNotification({
                target: provider,
                targetType: "serviceProvider",
                lang: lang,
                actionType: "provider",
                titleAr: "تم قبول طلب انضمامك",
                titleEn: "Application Approved",
                messageAr: "تهانينا! تم قبولك كمقدم خدمة في كارنو ويمكنك الآن استقبال الطلبات.",
                messageEn: "Congratulations! Your account is now active on Carno.",
            });
        } 
        else if (status === "refused") {
            await sendNotification({
                target: provider,
                targetType: "serviceProvider",
                lang: lang,
                actionType: "provider",
                titleAr: "تم رفض طلب الانضمام",
                titleEn: "Application Refused",
                messageAr: `للأسف تم رفض طلبك. ${reason ? `السبب: ${reason}` : ""}`,
                messageEn: `Unfortunately, your request was refused. ${reason ? `Reason: ${reason}` : ""}`,
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: status === "accepted" ? "تم القبول بنجاح" : "تم الرفض"
        });
    } catch (err) { 
        next(err); 
    }
};
const deleteServiceProvider = async (req, res, next) => {
    try {
        const { id } = req.params; // أو req.query.id حسب توجيه الـ route عندك
        
        await ServiceProviders.findByIdAndDelete(id);
        
        // ملاحظة: قد ترغب أيضاً في حذف خدماته المرتبطة (ونش/إطارات)
        await Winch.findOneAndDelete({ providerId: id });
        await Tire.findOneAndDelete({ providerId: id });

        return res.status(200).send({
            status: true,
            code: 200,
            message: "serviceProvider and related services deleted successfully"
        });
    } catch (err) {
        next(err);
    }
};

const getUsers = async (req, res, next) => {
    try {
        const status = req.query.status;
        const users = await User.find({ status: status }).select("username phone");
        const result = users.map((item) => {
            return {
                id: item._id,
                username: item.username,
                phone: item.phone,
            }
        });
        return res.status(200).send({
            status: true,
            code: 200,
            message: "Your request retrieved successfully",
            data: result
        })

    }
    catch (err) {
        next(err)
    }
}
const deleteUser = async (req, res, next) => {
    try {
        const id = req.query.params.id;
        await User.findByIdAndDelete(id);
        return res.status(200).send({
            status: true,
            code: 200,
            message: "user deleted successfully",
        })

    }
    catch (err) {
        next(err)
    }
}
const getUsersForAdmin = async (req, res, next) => {
    try {
        const { type } = req.params; // المتغير المرسل: 'verified' أو 'unverified'
        
        let query = { isProvider: false }; // جلب المستخدمين العاديين فقط

        if (type === 'verified') {
            query.status = "verified"; // الموثقين
        } else if (type === 'unverified') {
            query.status = "unverified"; // غير الموثقين
        }

        // جلب المستخدمين بناءً على الفلتر
        const users = await User.find(query).sort({ createdAt: -1 }).lean();

        // تنسيق البيانات للإرجاع
        const result = users.map(user => ({
            id: user._id,
            username: user.username,
            email: user.email || "N/A",
            phone: user.phone,
            // تصحيح رابط الصورة إذا كان ناقصاً
            image: user.image ? user.image.replace("comimages", "com/images") : null,
            status: user.status, // verified/unverified
            createdAt: user.createdAt
        }));

        return res.status(200).send({
            status: true,
            code: 200,
            count: result.length,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

const deleteUserForAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;  

        const deletedUser = await User.findByIdAndDelete(id);
        
        if (!deletedUser) {
            return res.status(404).send({
                status: false,
                message: "المستخدم غير موجود"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: "تم حذف المستخدم بنجاح"
        });
    } catch (err) {
        next(err);
    }
};
const getReports = async (req, res, next) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });

        const result = await Promise.all(
            reports.map(async (report) => {

                let entityData = null;

                if (report.entityType === "Post") {
                    entityData = await Posts.findById(report.entityId);
                }

                if (report.entityType === "ShowRoomPosts") {
                    entityData = await ShowRoomPosts.findById(report.entityId);
                }

                if (report.entityType === "Car") {
                    entityData = await Car.findById(report.entityId);
                }

                if (report.entityType === "CarPlate") {
                    entityData = await CarPlate.findById(report.entityId);
                }

                return {
                    id: report._id,      
                    reportid: report._id,    
                    contentId: report.entityId,
                    reason: report.reason,
                    isViolation: report.isViolation,
                    status: report.status,
                    entityType: report.entityType,
                    createdAt: report.createdAt
                };
            })
        );

        return res.status(200).send({
            status: true,
            code: 200,
            message: "Reports retrieved successfully",
            data: result
        });

    } catch (err) {
        next(err);
    }
};
const updatePassword= async (req, res, next) => {
    const password = "caroUser";
const updatedPassword = await bcrypt.hash(password, 10);
console.log("Updated hashed password:", updatedPassword);
}
// ... الاستدعاءات كما هي ...
// أضف هذا السطر لأنه ناقص عندك ويسبب الانهيار في الـ populate
const City = require("../models/city"); 
const centerService = require('../models/centerServices');
const SalvagePost = require('../models/slavgePost');

const getReportDetails = async (req, res, next) => {
    try {
        const reportId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).send({ status: false, message: "رقم البلاغ غير صحيح" });
        }

        const report = await Report.findById(reportId).populate("userId", "username phone image");
        if (!report) return res.status(404).send({ status: false, message: "البلاغ غير موجود" });

        const { entityId } = report;
        const targetId = new mongoose.Types.ObjectId(entityId);

        let entityData = null;
        let foundIn = "";

        // 1. البحث المخصص لكل موديل (لجلب العنوان والبيانات)
        // البحث في السيارات
        entityData = await Car.findById(targetId).populate("userId", "username image phone email").populate("cityId", "name");
        if (entityData) { foundIn = "Car"; }

        // البحث في البوستات (الدراجات النارية هنا)
        if (!entityData) {
            entityData = await Posts.findById(targetId).populate("userId", "username image phone email").populate("cityId", "name");
            if (entityData) { foundIn = "Posts"; }
        }

        // البحث في اللوحات
        if (!entityData) {
            entityData = await CarPlate.findById(targetId).populate("userId", "username image phone email").populate("cityId", "name");
            if (entityData) { foundIn = "CarPlate"; }
        }

        // البحث في المعارض
        if (!entityData) {
            entityData = await ShowRoomPosts.findById(targetId).populate("showroomId", "username image phone email").populate("cityId", "name");
            if (entityData) { foundIn = "ShowRoomPosts"; }
        }

        if (!entityData) {
            return res.status(200).send({ status: false, code: 404, message: "المحتوى غير موجود", reportDetails: report });
        }

        const owner = entityData.userId || entityData.showroomId;

        // 2. 💡 منطق استخراج العنوان الذكي
        // يبحث عن title، ثم plateNumber، ثم أول 30 حرف من الوصف إذا لم يجد عنواناً
        const adTitle = entityData.title || 
                        entityData.plateNumber || 
                        (entityData.description ? entityData.description.substring(0, 40) + "..." : "إعلان بدون عنوان");

        return res.status(200).send({
            status: true,
            code: 200,
            data: {
                reportDetails: report,
                itemDetails: {
                    id: entityData._id,
                    foundInTable: foundIn,
                    // --- هنا العنوان المطلوب ---
                    title: adTitle, 
                    cityName: entityData.cityId?.name || "غير محدد",
                    images: entityData.images || [],
                    video: entityData.video || entityData.videoCar || null,
                    ownerData: {
                        username: owner?.username || "مستخدم كارنو",
                        image: owner?.image || null,
                        phone: owner?.phone || entityData.phoneNumber || "غير متوفر"
                    },
                    description: entityData.description || entityData.notes || entityData.discription || ""
                }
            }
        });

    } catch (err) {
        console.error("Error:", err.message);
        return res.status(500).send({ status: false, message: "خطأ في السيرفر: " + err.message });
    }
};
const deleteAnyPost = async (req, res, next) => {
    try {
        // افترضنا أن الـ Middleware يتحقق من الـ role ويضعها في req.user
        if (req.user.role !== 'admin') {
            return res.status(403).send({ status: false, message: "غير مصرح لك" });
        }
        const postId = req.params.id;
        const deletedPost = await Posts.findByIdAndDelete(postId);
        if (!deletedPost) {
            return res.status(404).send({ status: false, message: "الإعلان غير موجود" });
        }
        return res.status(200).send({ status: true, message: "تم الحذف بنجاح" });
    } catch (err) {
        next(err);
    }
};

const getAllPostsForAdmin = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    
    // إعدادات البحث والترقيم (Pagination)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // جلب الإعلانات مع بيانات المستخدمين وترتيبها من الأحدث للأقدم
    const posts = await Posts.find()
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPosts = await Posts.countDocuments();

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Posts retrieved" : "تم جلب المنشورات",
      data: {
        posts,
        pagination: {
          totalPosts,
          currentPage: page,
          totalPages: Math.ceil(totalPosts / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPostDetailsForAdmin = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const postId = req.params.id;

    const posts = await Posts.findById(postId)
      .populate("userId", "username email phone image") // جلب بيانات الاتصال كاملة
      .lean();

    if (!posts) {
      return res.status(404).send({
        status: false,
        code: 404,
        message: lang === "en" ? "Post not found" : "المنشور غير موجود",
      });
    }

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Post details retrieved" : "تم جلب تفاصيل المنشور",
      data: posts, // إرسال الكائن بالكامل
    });
  } catch (error) {
    next(error);
  }
};
const getPendingCenterServices = async (req, res, next) => {
    try {
        const pendingCenters = await User.find({ centerStatus: "pending" })
            .select("username image pendingData centerStatus phone email")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).send({ 
            status: true, 
            code: 200, 
            count: pendingCenters.length,
            data: pendingCenters
        });
    } catch (err) { next(err); }
};

const getAcceptedCenterServices = async (req, res, next) => {
    try {
        const acceptedCenters = await User.find({ centerStatus: "accepted" })
            .select("username image pendingData centerStatus phone email")
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).send({
            status: true,
            code: 200,
            count: acceptedCenters.length,
            data: acceptedCenters
        });
    } catch (err) { next(err); }
};

const getRefusedCenterServices = async (req, res, next) => {
    try {
        const refusedCenters = await User.find({ centerStatus: "refused" })
            .select("username image pendingData centerStatus phone email")
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).send({
            status: true,
            code: 200,
            count: refusedCenters.length,
            data: refusedCenters
        });
    } catch (err) { next(err); }
};
const approveCenterService = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const lang = req.headers['accept-language'] || 'en';
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === 'ar' ? "المستخدم غير موجود" : "User not found"
            });
        }
        if (user.pendingData) {
            await User.findByIdAndUpdate(userId, {
                ...user.pendingData,
                centerStatus: "accepted",
                pendingData: null
            });
        }

        await sendNotification({
            target: user,
            targetType: "User",
            lang: lang,
            actionType: "system",
            titleAr: "تم قبول طلب مركزك",
            titleEn: "Center Request Approved",
            messageAr: "تهانينا! تم قبول مركزك في كارنو ويمكنك الآن إضافة خدماتك.",
            messageEn: "Congratulations! Your center has been approved on Carno.",
        });

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === 'ar' ? "تم قبول الطلب بنجاح" : "Request accepted successfully"
        });
    } catch (err) { next(err); }
};
// 5. جلب تفاصيل الخدمة (Details) - باستخدام Query
const getCenterServiceDetails = async (req, res, next) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).send({ status: false, message: "الـ ID مطلوب" });

        const center = await User.findOne({ 
            _id: id,
            centerStatus: { $exists: true, $ne: null }
        }).populate("service brand cityId").lean();

        if (!center) {
            return res.status(404).send({ 
                status: false, 
                message: "المركز غير موجود"
            });
        }

        return res.status(200).send({ status: true, code: 200, data: center });
    } catch (err) { next(err); }
};
const deleteCenterService = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const { id } = req.params; 

        const user = await User.findById(id);
        if (!user) {
          return res.status(404).send({
            status: false,
            code: 404,
            message: lang === "ar" ? "العنصر غير موجود بالفعل" : "Center service not found"
          });
        }

        // ✅ مسح centerStatus و pendingData بدل الحذف
        await User.findByIdAndUpdate(id, {
            $unset: { centerStatus: "", pendingData: "" }
        });

        return res.status(200).send({
          status: true,
          code: 200,
          message: lang === "ar" ? "تم حذف المركز بنجاح" : "Center deleted successfully"
        });

    } catch (err) { 
        next(err); 
    }
};
const refuseCenterService = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const lang = req.headers['accept-language'] || 'en';
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === 'ar' ? "المستخدم غير موجود" : "User not found"
            });
        }

        await User.findByIdAndUpdate(userId, {
            centerStatus: "refused"
        });

        await sendNotification({
            target: user,
            targetType: "User",
            lang: lang,
            actionType: "system",
            titleAr: "تم رفض طلب مركزك",
            titleEn: "Center Request Refused",
            messageAr: `للأسف تم رفض طلب مركزك. ${reason ? `السبب: ${reason}` : ""}`,
            messageEn: `Unfortunately, your center request was refused. ${reason ? `Reason: ${reason}` : ""}`,
        });

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === 'ar' ? "تم رفض الطلب بنجاح" : "Request refused successfully"
        });
    } catch (err) { next(err); }
};
// 7. جلب المنشورات المتعلقة (Posts)
const getCenterServicePosts = async (req, res, next) => {
    try {
        const { id } = req.query; 
        const lang = req.headers['accept-language'] || 'en';
        
        if (!id) return res.status(400).send({ status: false, message: "الـ ID مطلوب" });

        const centerData = await User.findOne({ 
            _id: id, 
            categoryCenterId: { $exists: true, $ne: null } 
        }).select("-password"); // ✅ إخفاء الباسورد

        if (!centerData) {
            return res.status(404).send({ status: false, message: "بيانات المركز غير متوفرة" });
        }

        const salvagePosts = await SalvagePost.find({ 
            userId: new mongoose.Types.ObjectId(id) 
        }).sort({ createdAt: -1 });
        
        const centerServices = await CenterService.find({ centerId: id })
            .populate("services")  // ✅ populate
            .sort({ createdAt: -1 });

        return res.status(200).send({ 
            status: true, 
            code: 200,
            message: "تم جلب بيانات المركز والمنشورات بنجاح",
            data: {
                profile: centerData,
                salvagePosts,
                centerServices: centerServices.map(cs => ({
                    ...cs.toObject(),
                    services: cs.services.map(ser => ({
                        id: ser._id,
                        name: ser.name?.[lang] || ser.name?.en || '',
                        image: ser.image
                    }))
                }))
            }
        });
    } catch (err) { 
        next(err); 
    }
};
const getCenterServices = async (req, res, next) => {
    try {
        // البحث عن السجلات التي يكون فيها الحقل من نوع ObjectId حصراً
        // رقم 7 في مونجو يرمز لنوع الـ ObjectId
        const allServices = await User.find({ 
            categoryCenterId: { $type: "objectId" } 
        })
        .populate("service") 
        .sort({ createdAt: -1 });

        return res.status(200).send({
            status: true,
            code: 200,
            count: allServices.length,
            message: "تم جلب خدمات المراكز بنجاح",
            data: allServices
        });
    } catch (err) { 
        next(err); 
    }
};
const getServiceProviderOrdersForAdmin = async (req, res, next) => {
    try {
        const { type, status } = req.query;
        const lang = req.headers['accept-language'] || 'en';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 🟢 بناء الفلتر
        let filter = {};
        if (status) filter.status = status;
        if (type === "winch") filter.serviceType = "winch";
        else if (type === "tire") filter.serviceType = "tire Filling";
        else if (type === "battery") filter.serviceType = "battery Jumpstart";

        const totalCount = await ServiceProviderOrders.countDocuments(filter);

        const orders = await ServiceProviderOrders.find(filter)
            .populate("userId", "username image phone")
            .populate("providerId", "username image phone")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const result = orders.map(order => ({
            id: order._id,
            serviceType: order.serviceType,
            status: order.status,
            price: order.price,
            locationText: order.locationText,
            createdAt: order.createdAt,
            user: order.userId ? {
                id: order.userId._id,
                username: order.userId.username,
                image: order.userId.image,
                phone: order.userId.phone
            } : undefined,
            provider: order.providerId ? {
                id: order.providerId._id,
                username: order.providerId.username,
                image: order.providerId.image,
                phone: order.providerId.phone
            } : undefined
        }));

        return res.status(200).send({
            status: true,
            code: 200,
            count: result.length,
            data: result,
            pagination: {
                page,
                totalPages: Math.ceil(totalCount / limit),
                totalItems: totalCount
            }
        });
    } catch (err) { next(err); }
};

const deleteServiceProviderOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lang = req.headers['accept-language'] || 'en';

        const deleted = await ServiceProviderOrders.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === 'ar' ? "الطلب غير موجود" : "Order not found"
            });
        }

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === 'ar' ? "تم حذف الطلب بنجاح" : "Order deleted successfully"
        });
    } catch (err) { next(err); }
};
const getServiceProviderOrderDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lang = req.headers['accept-language'] || 'en';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === 'ar' ? "الـ ID غير صحيح" : "Invalid ID"
            });
        }

        const order = await ServiceProviderOrders.findById(id)
            .populate("userId", "username image phone email")
            .populate("providerId", "username image phone email")
            .lean();

        if (!order) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === 'ar' ? "الطلب غير موجود" : "Order not found"
            });
        }

        const result = {
            id: order._id,
            orderNumber: order.orderNumber,
            serviceType: order.serviceType,
            status: order.status,
            tripStatus: order.tripStatus,
            paymentType: order.paymentType,
            paymentStatus: order.paymentStatus,
            price: order.price,
            details: order.details,
            image: order.image,
            location: order.location,
            locationText: order.locationText,
            dropoffLocation: order.dropoffLocation,
            dropoffLocationText: order.dropoffLocationText,
            ended: order.ended,
            invoiceIssued: order.invoiceIssued,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            user: order.userId ? {
                id: order.userId._id,
                username: order.userId.username,
                image: order.userId.image,
                phone: order.userId.phone,
                email: order.userId.email
            } : null,
            provider: order.providerId ? {
                id: order.providerId._id,
                username: order.providerId.username,
                image: order.providerId.image,
                phone: order.providerId.phone,
                email: order.providerId.email
            } : null
        };

        return res.status(200).send({
            status: true,
            code: 200,
            data: result
        });
    } catch (err) {
        next(err);
    }
};
module.exports = {
    login,
    getAllPosts,
    getAllOrders,
    getRentalOffice,
    approveRentalOffice,
    getPendingRentalOffices,
    getAcceptedRentalOffices,
    getRentalOfficeDetails,
    getRentalOfficePosts,
    deleteRentalPost,
    getRefusedRentalOffices,
    deleteRentalOffice,
    getServiceProviderAccept,
    getServiceProviderRefuse,
    getServiceProviderRequests,
    getServiceProviderDetails,
    updateServiceProviderStatus,
    deleteServiceProvider,
    getUsers,
    deleteUser,
    getUsersForAdmin,
    deleteUserForAdmin,
    getReports,
    getReportDetails,
    deleteAnyPost,
    getAllPostsForAdmin,
    getPostDetailsForAdmin,
    getPendingCenterServices,
    getAcceptedCenterServices,
    getCenterServiceDetails,
    getRefusedCenterServices,
    refuseCenterService,
    approveCenterService,
    getCenterServicePosts,
    deleteCenterService,
    getCenterServices,
    getServiceProviderOrdersForAdmin,
    deleteServiceProviderOrder,
    getServiceProviderOrderDetails,
    updatePassword
}