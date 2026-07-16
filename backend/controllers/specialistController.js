const Specialist = require("../models/Specialist");
const { passwordService, jwtService, auditService } = require("../../security/services");
const { AUDIT_EVENTS } = require("../../security/services/audit.service");
const SpecialistApplication = require("../models/SpecialistApplication");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto=require("crypto");

const emailService=require("../services/emailService");

// ============================
// Presigned Upload URL Proxy
// ============================

const getPresignedUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const response = await axios.post(
      "https://au6zjukrzlky36hgjsy73aiwae0jzvfu.lambda-url.ap-south-1.on.aws/",
      {
        fileName,
        fileType,
      }
    );
    res.status(200).json({
      success: true,
      ...response.data,
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URL",
    });
  }
};

// ============================
// Specialist Registration
// ============================

const registerSpecialist = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      hospital,
      specialization,
      experience,
      credentialKey,
      credentialUrl,
    } = req.body;

    const emailLower = email.toLowerCase();

    // Check if email already exists in approved specialists
    const existingSpecialist = await Specialist.findOne({
      email: emailLower,
    });

    // Check if email already exists in pending applications
    const existingApplication = await SpecialistApplication.findOne({
      email: emailLower,
    });

    if (existingSpecialist || existingApplication) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Password Security
    const hashedPassword = await passwordService.hashPassword(password, {
      userInfo: {
        email: emailLower,
        firstName,
        lastName,
      },
    });

    // Create pending application
    const application = await SpecialistApplication.create({
      firstName,
      lastName,
      email: emailLower,
      password: hashedPassword,
      hospital,
      specialization,
      experience,
      credentialKey,
      credentialUrl,
      status: "pending",
    });

    // Audit Log
    auditService.log({
      action: AUDIT_EVENTS.USER_CREATED,
      userId: application._id,
      ipAddress: req.ip,
      details: {
        email: application.email,
        role: "Specialist Application",
      },
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    console.error(error);

    if (error.code) {
      return res.status(400).json({
        success: false,
        code: error.code,
        message: error.message,
        errors: error.details || [],
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ============================
// Specialist Login
// ============================

const loginSpecialist = async (req, res) => {
  try {
    const { email, password } = req.body;

    const specialist = await Specialist.findOne({
      email: email.toLowerCase(),
    });

    if (!specialist) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Prevent unverified doctors from logging in
    if (!specialist.verified) {
      return res.status(403).json({
        success: false,
        message: "Your account has not yet been approved.",
      });
    }

    const passwordMatch = await passwordService.verify(
      password,
      specialist.password
    );

    if (!passwordMatch) {
      auditService.logAuth({
        type: "failure",
        userId: specialist._id,
        email: specialist.email,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        reason: "INVALID_CREDENTIALS",
      });

      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { accessToken, refreshToken } = jwtService.generateTokenPair({
      userId: specialist._id,
      email: specialist.email,
      role: specialist.role,
      isVerified: specialist.verified,
    });

    auditService.logAuth({
      type: "success",
      userId: specialist._id,
      email: specialist.email,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(200).json({
      success: true,
      token: accessToken,
      accessToken,
      refreshToken,
      specialist: {
        id: specialist._id,
        firstName: specialist.firstName,
        lastName: specialist.lastName,
        email: specialist.email,
        specialization: specialist.specialization,
        verified: specialist.verified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const sendForgotPasswordOTP = async(req,res)=>{

    try{

        const {email}=req.body;

        const specialist=
        await Specialist.findOne({
            email:email.toLowerCase()
        });

        if(!specialist){

            return res.status(404).json({
                success:false,
                message:"Email not found"
            });

        }

        const otp=
        Math.floor(
            100000+Math.random()*900000
        ).toString();

        specialist.resetOTP=otp;

        specialist.resetOTPExpires=
        Date.now()+5*60*1000;

        await specialist.save();

        // await emailService.sendOTP(
        //     specialist.email,
        //     otp
        // );

        console.log("\n======================================");
        console.log(" PASSWORD RESET OTP");
        console.log("======================================");
        console.log("Email :", specialist.email);
        console.log("OTP   :", otp);
        console.log("Expires In : 5 minutes");
        console.log("======================================\n");

        try {
          await emailService.sendOTP(specialist.email, otp);
           console.log("OTP email sent successfully.");
          } catch (err) {
          console.error("Failed to send OTP email:", err.message);
        }

        res.json({
            success:true,
            message:"OTP sent successfully"
        });
      }
      catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"Server Error"
        });
    }
};

const verifyOTP=async(req,res)=>{

    try{

        const {email,otp}=req.body;

        const specialist=
        await Specialist.findOne({
            email:email.toLowerCase()
        });

        if(!specialist){

            return res.status(404).json({
                success:false,
                message:"User not found"
            });

        }

        if(
            specialist.resetOTP!==otp ||
            specialist.resetOTPExpires<Date.now()
        ){

            return res.status(400).json({
                success:false,
                message:"Invalid or Expired OTP"
            });
        }
        res.json({
            success:true,
            message:"OTP Verified"
        });
    }
    catch(error){
        console.error(error);

        res.status(500).json({
            success:false,
            message:"Server Error"
        });
    }
};

const resetPassword=async(req,res)=>{

    try{
        const{
            email,
            otp,
            password
        }=req.body;

        const specialist=
        await Specialist.findOne({
            email:email.toLowerCase()
        });

        if(!specialist){

            return res.status(404).json({
                success:false,
                message:"User not found"
            });

        }

        if(
            specialist.resetOTP!==otp ||
            specialist.resetOTPExpires<Date.now()
        ){

            return res.status(400).json({
                success:false,
                message:"OTP Expired"
            });

        }

        const hashedPassword=
        await passwordService.hashPassword(
            password,
            {
                userInfo:{
                    email:specialist.email,
                    firstName:specialist.firstName,
                    lastName:specialist.lastName
                }
            }
        );
        specialist.password=hashedPassword;
        specialist.resetOTP=null;
        specialist.resetOTPExpires=null;
        await specialist.save();
        auditService.log({
            action:"PASSWORD_RESET",
            userId:specialist._id,
            ipAddress:req.ip
        });
        res.json({
            success:true,
            message:"Password Updated"
        });
    }
    catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"Server Error"
        });
    }
};

// ============================
// Exports
// ============================

module.exports = {
  getPresignedUrl,
  registerSpecialist,
  loginSpecialist,
  verifyOTP,
  resetPassword,
  sendForgotPasswordOTP
};
