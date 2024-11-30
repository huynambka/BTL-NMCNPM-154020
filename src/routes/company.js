const router = require("express").Router();
const passport = require("passport");
const companyController = require("../controllers/company");

const passportJWT = passport.authenticate("jwt", {
    failureRedirect: "/auth/login",
    session: false,
});

router.post("/register", companyController.register);
router.get("/register", (req, res) => {
    res.render("register-company");
});
// Tạo job mới
router.get("/new-job",passportJWT, companyController.companyJobs);
router.post("/new-job",passportJWT, companyController.createJob);
// Trang thông tin công ty phía công ty
router.get("/profile", passportJWT, companyController.profile);
// Edit company profile
router.get("/edit", passportJWT, companyController.edit);
// Trang thông tin công ty phía user
router.get("/:id", companyController.companyDetail);
// router.post("/update", passportJWT, companyController.updateCompany);

// Xoa job trong cty
router.post("/jobs/:job_id/delete", passportJWT, companyController.deleteJob);
// thông tin job cụ thể của công ty
router.get("/jobs/:job_id/edit", passportJWT, companyController.editJob);
router.post("/jobs/:job_id/update", passportJWT, companyController.postEditJob);

// show cho bản thân công ty xem
router.get("/jobs/:job_id/show", passportJWT, companyController.showJob);
router.get("/jobs/:job_id/view-candidates", passportJWT, companyController.viewCandidates);

module.exports = router;
