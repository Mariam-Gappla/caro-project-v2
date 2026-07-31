


const path = require("path");
const fs = require("fs");

const IMAGES_DIR = path.join(process.cwd(), "images");

const saveImage = (file) => {
  if (!file) return null;

  // multer حفظ الملف خلاص
  const fileName = file.filename;

  return `/images/${fileName}`;
};

const deleteImage = (imgPath) => {
  try {
    if (!imgPath) return;

    const fileName = path.basename(imgPath);
    const fullPath = path.join(IMAGES_DIR, fileName);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log("🗑️ Deleted:", fullPath);
    }
  } catch (err) {
    console.warn("⚠️ Failed to delete image:", imgPath, err.message);
  }
};

module.exports = { saveImage, deleteImage };
