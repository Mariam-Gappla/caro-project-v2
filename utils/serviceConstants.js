const ACCOUNT_CATEGORIES = {
    SERVICES: {
        'winch': { 
            ar: "ونش وسطحه", 
            en: "Winch" 
        },
        'tire Filling': { 
            ar: "تعبئة كفر", 
            en: "Tire Filling" 
        },
        'battery Jumpstart': { 
            ar: "اشتراك بطارية", 
            en: "Battery Jumpstart" 
        },
        'slavge': { 
            ar: "تشليح", 
            en: "Salvage" 
        }
    },

    CENTERS: {
        'workshop': { 
            ar: "ورشة", 
            en: "Workshops" 
        },
        'inspection': { 
            ar: "مركز فحص", 
            en: "Inspection Centers" 
        },
        'car_care': { 
            ar: "مركز عناية بالسيارات", 
            en: "Car Care" 
        },
        'showroom': { 
            ar: "معرض", 
            en: "Showrooms" 
        },
        'rental': { 
            ar: "مكتب تأجير سيارات", 
            en: "Rental Offices" 
        },
        'spare_parts': { 
            ar: "تشليح", 
            en: "Spare Parts" 
        }
    },

    // 🟡 ثالثاً: أنواع الحسابات العامة
    ROLES: {
        'trial': { 
            ar: "تجريبي", 
            en: "Trial" 
        },
        'client': { 
            ar: "موثق", 
            en: "Verified" 
        }
    }
};

// تصدير المفاتيح لاستخدامها في الـ Enum داخل الموديلات (Validation)
const SERVICE_KEYS = Object.keys(ACCOUNT_CATEGORIES.SERVICES);

module.exports = { 
    ACCOUNT_CATEGORIES, 
    SERVICE_KEYS 
};