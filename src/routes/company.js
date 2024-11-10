const router = require("express").Router();
const passport = require("passport");
const companyController = require("../controllers/company");
const jobController = require("../controllers/job");

const passportJWT = passport.authenticate("jwt", {
    failureRedirect: "/auth/login",
    session: false,
});

router.post("/register", companyController.register);
router.get("/register", (req, res) => {
    res.render("register-company");
});

// router.get("/setup",companyController.changeInfo);
// router.post("/setup",companyController.postChangeInfo);
// router.get("/:id",companyController.companyDetail);
// router.get("/:id/edit",companyController.editCompany);
// router.post("/:id/edit",companyController.postEditCompany);
router.get("/:id/posts", companyController.companyJobs);
router.post("/:id/posts", companyController.postCompanyJobs);
router.get("/:id/company_page", companyController.companyDetail);
router.delete("/:id/delete-job/:job_id", companyController.deleteJob);
router.get("/:id/view-candidates/:job_id", companyController.viewCandidates);
// router.get("/:id/posts/:job_id",companyController.jobDetail);
// router.get("/:id/posts/:job_id/edit",companyController.editJobDetail);
// router.post("/:id/posts/:job_id/edit",companyController.postJobDetail);
router.get("/", companyController.index);

router.get("/:id/edit", companyController.edit);
router.post("/:id/update", companyController.postEditCompany);

// thông tin job cụ thể của công ty
router.get("/jobs/:id/edit", jobController.editJob);
router.post("/jobs/:id/update", jobController.postEditJob);

// show cho bản thân công ty xem
router.get("/jobs/:id/show", jobController.showJob);

module.exports = router;
