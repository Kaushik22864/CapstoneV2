const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);


require("dotenv").config();
const mongoose=require("mongoose");
const connectDB=require("./config/db");
const Admin=require("./models/Admin");
const {
    passwordService
}=require("../security/services");
const createAdmin=async()=>{
    await connectDB();
    const existing=
    await Admin.findOne({
        email:"admin@capstone.com"
    });
    if(existing){
        console.log("Admin already exists");
        process.exit();
    }
    const hashedPassword=
    await passwordService.hashPassword(
        "adminPassword@123",
    );
    await Admin.create({
        firstName:"System",
        lastName:"Administrator",
        email:"admin@capstone.com",
        password:hashedPassword

    });
    console.log("Admin created");
    process.exit();
};

createAdmin();