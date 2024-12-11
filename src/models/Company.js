const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
    {
        companyName: {
            type: String,
            required: [true, "Company name is not provided"],
            index: true,
        },
        location: String,
        description: String,
        logoPath: String,
        website: String,
        email: {
            type: String,
            index: true,
            unique: true,
        },
        password: {
            type: String,
            required: [true, "Password is not provided"],
        },
        keywords: [String],
        phoneNumber: {
            type: String,
            required: true,
            validate: {
                validator: function (v) {
                    // Kiểm tra định dạng số điện thoại (10 chữ số)
                    return /\d{10}/.test(v);
                },
                message: (props) => `${props.value} không phải là số điện thoại hợp lệ!`,
            },
        },
        address: {
            detail: String,
            ward: String,
            district: String,
            province: String,
        },
        jobs: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Job",
            },
        ],
    },
    { timestamps: true }
);

const Company = mongoose.model("Company", CompanySchema);

module.exports = Company;

