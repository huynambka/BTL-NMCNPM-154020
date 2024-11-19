const Company = require("../models/Company");
const Job = require("../models/Job");
const bcrypt = require("bcrypt");

const { StatusCodes } = require("http-status-codes");
const CompanyRegistration = require("../models/CompanyRegistration");

const getCompanyInfo = async (req, res) => {
    res.json({ success: true, message: "Company found" });
};

const register = async (req, res) => {
    const { companyName, fullName, email, currentPosition, phoneNumber, jobRequirement } = req.body;

    // validate
    if (!companyName || !fullName || !email || !currentPosition || !phoneNumber || !jobRequirement) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Missing required fields" });
    }
    // check phone number
    if (!/\d{10}/.test(phoneNumber)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid phone number" });
    }
    // check email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid email" });
    }
    const companyRegistration = new CompanyRegistration({
        companyName,
        fullName,
        email,
        currentPosition,
        phoneNumber,
        jobRequirement,
    });
    await companyRegistration.save();
    res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Your information was send to administrator. We'll contact you as soon as possible!",
    });
};
// [GET] /company/profile
const profile = async (req, res) => {
    try {
        if (req.company) {
            const id = req.company._id;
            console.log("Company ID: " + id);

            const company = await Company.findById(id).populate("jobs");

            res.render("company/layout/mainpage", {
                company: company,
            });
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

//[GET] /comapny/:id/company_page
const companyDetail = async (req, res) => {
    const id = req.params.id;
    try {
        const company = await Company.findById(id).populate("jobs");

        res.render("company/layout/company_view", {
            company: company,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

// [GET] /company/:id/posts
const companyJobs = async (req, res) => {
    res.render("./company/layout/job_post");
};

// [POST] /company/jobs/create
const createJob = async (req, res) => {
    try {
        if (req.company) {
            const id = req.company._id;
            const {
                jobTitle,
                jobDescription,
                jobRequirement,
                jobBenefit,
                jobLocation,
                jobDeadline,
                jobQuantity,
                jobType,
                jobTime,
                jobExperience,
                jobSkill,
                jobSalary,
            } = req.body;
            const company = await Company.findById(id);
            const isExit = await Job.findOne({ title: jobTitle });
            if (isExit) {
                return res.status(400).send("Job already exists");
            } else {
                const isSalaryNegotiation = false;
                let skill = [];
                if (jobSkill) {
                    skill = jobSkill.split(",");
                } else {
                    console.error("jobSkill is undefined or null");
                }
                if (jobSalary != "Thoả thuận") {
                    const isSalaryNegotiation = false;
                } else {
                    const isSalaryNegotiation = true;
                }
                const job = new Job({
                    title: jobTitle,
                    description: jobDescription,
                    requirement: jobRequirement,
                    benefit: jobBenefit,
                    companyName: company.companyName,
                    companyId: company._id,
                    region: jobLocation,
                    experienceYears: jobExperience,
                    numberOfRecruitment: jobQuantity,
                    status: true,
                    time: jobTime,
                    typeOfWork: jobType,
                    skill: skill,
                    salary: jobSalary,
                    isSalaryNegotiation: isSalaryNegotiation,
                    deadline: jobDeadline,
                    level: "",
                });
                try {
                    await job.save();
                    company.jobs.push(job);
                    await company.save();
                    res.redirect(`/company/profile`);
                } catch (error) {
                    console.error(error);
                    res.status(500).send("Internal Server Error");
                }
            }
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

// [DELETE] /company/jobs/delete/:job_id
const deleteJob = async (req, res) => {
    try {
        if (req.company) {
            const id = req.company._id;
            const job_id = req.params.job_id;
            const company = await Company.findById(id);
            if (!company.jobs.includes(job_id)) {
                return res.status(404).send("Job not found or this job is not belong to your company");
            }
            await Job.findByIdAndDelete(job_id);
            company.jobs.pull(job_id);
            await company.save();

            res.redirect(`/company/profile`);
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};
// [GET] /company/jobs/:job_id/view-candidates
const viewCandidates = async (req, res) => {
    try {
        if (req.company) {
            const id = req.company._id;
            const job_id = req.params.job_id;
            const companyJobs = await Company.findById(id).select("jobs");
            if (!companyJobs.jobs.includes(job_id)) {
                return res.status(404).send("Job not found or this job is not belong to your company");
            }
            const job = await Job.findById(job_id).populate("applicant");
            const candidates = job.applicant;
            res.render("./company/layout/view_candidates", {
                candidates: candidates,
            });
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};
//[POST] /company/update
const updateCompany = async (req, res) => {
    try {
        if (req.company) {
            const companyId = req.company._id;
            // Cập nhật thông tin công ty
            await Company.findByIdAndUpdate(companyId, {
                companyName: req.body.companyName,
                location: req.body.location,
                description: req.body.description,
                website: req.body.website,
                email: req.body.email,
                phoneNumber: req.body.phoneNumber,
                address: {
                    detail: req.body.addressDetail,
                    ward: req.body.ward,
                    district: req.body.district,
                    province: req.body.province,
                    country: req.body.country,
                },
            });

            res.redirect("/company/profile");
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
};
//[GET] /company/edit
const edit = async (req, res) => {
    try {
        if (req.company) {
            // Lấy ID từ URL
            const companyId = req.company._id;

            // Tìm công ty theo ID
            const company = await Company.findById(companyId);

            // Kiểm tra xem có tìm thấy công ty không
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }

            res.render("company/edit", { company });
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "This id is not exist" });
    }
};

//[GET] /company/jobs/:job_id/edit
const editJob = async (req, res) => {
    try {
        if (req.company) {
            const comapnyId = req.company._id;
            const jobId = req.params.job_id;
            const companyJobs = await Company.findById(comapnyId).select("jobs");
            if (!companyJobs.jobs.includes(jobId)) {
                return res.status(404).send("Job not found or this job is not belong to your company");
            }
            const job = await Job.findById(jobId);

            if (!job) {
                return res.status(404).json({ message: "Not Found" });
            }

            res.render("job/edit", { job });
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "This id is not exist" });
    }
};

const postEditJob = async (req, res) => {
    try {
        if (req.company) {
            const jobId = req.params.job_id;

            await Job.findByIdAndUpdate(jobId, {
                title: req.body.title,
                salary: req.body.salary,
                isSalaryNegotiation: req.body.isSalaryNegotiation === "on",
                region: req.body.region,
                experienceYears: req.body.experienceYears,
                deadline: new Date(req.body.deadline),
                type: req.body.type,
                description: req.body.description,
                requirement: req.body.requirement,
                benefit: req.body.benefit,
                location: req.body.location,
                time: req.body.time,
                level: req.body.level,
                numberOfRecruitment: req.body.numberOfRecruitment,
                status: req.body.status === "on",
                typeOfWork: req.body.typeOfWork,
                skill: req.body.skill ? req.body.skill.split(",").map((s) => s.trim()) : [],
            });

            res.redirect(`/jobs/${jobId}/show`);
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
};

const showJob = async (req, res) => {
    try {
        const jobId = req.params.job_id;
        const job = await Job.findById(jobId).populate("companyId");

        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Render view với thông tin job
        res.render("job/show", { job });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "This id is not exist" });
    }
};

module.exports = {
    getCompanyInfo,
    register,
    profile,
    companyDetail,
    companyJobs,
    createJob,
    deleteJob,
    viewCandidates,
    updateCompany,
    edit,
    editJob,
    postEditJob,
    showJob,
};
