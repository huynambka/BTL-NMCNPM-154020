const express = require('express');
const router = express.Router();
const passport = require("passport");
const userController = require("../controllers/user");
const { uploadAvatar, uploadAvatarErrorHandler } = require("../middlewares/uploadAvatar");


const { upload, uploadErrorHandler } = require("../middlewares/upload");

// Middleware cho JWT authentication (bỏ ra cho route update)
const passportJWT = passport.authenticate("jwt", {
    failureRedirect: "/auth/login", // Redirect đến login nếu không xác thực
    session: false,
});

// router.get("/update", passportJWT, userController.getUpdate);

// router.post("/update", passportJWT, userController.updateUser);

// Hiển thị thông tin User từ góc nhìn Company
router.get('/company/profile', passportJWT, userController.getUserProfileForCompany);
// Get Profile Page
router.get('/profile', passportJWT, userController.getUserInfo);

// Route upload CV
router.get("/upload-cv", passportJWT, userController.getUploadCV);
router.post(
    "/upload-cv",
    passportJWT,
    upload.single("cv"),
    uploadErrorHandler, // Xử lý lỗi từ middleware
    userController.uploadCV
);
// Route xóa CV
router.post("/delete-cv", passportJWT, userController.deleteCV);
// Route xem job đang applied
router.get("/applied-jobs", passportJWT, userController.getAppliedJobs);

// Route create thông tin người dùng 
router.get("/update", passportJWT, userController.createInfo);
router.post("/updated", passportJWT, uploadAvatar.single("avatar"), uploadAvatarErrorHandler, userController.createdInfo);

//Route đổi mật khẩu người dùng 
router.get("/change-password", passportJWT, userController.changePassword);
router.post("/change-password", passportJWT, userController.updatedPassword);
module.exports = router;
