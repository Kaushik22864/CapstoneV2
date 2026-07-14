const Specialist = require("../models/Specialist");
const SpecialistApplication = require("../models/SpecialistApplication");
const Admin = require("../models/Admin");
const axios = require("axios");

const {
  passwordService,
  jwtService,
  auditService,
} = require("../../security/services");

const getPresignedViewUrlFromLambda = async (key) => {
  if (!key) return "";
  try {
    const response = await axios.post(
      "https://b24uxf3gwloquyts6lvh55uoue0vawvl.lambda-url.ap-south-1.on.aws/",
      {
        key: key,
        fileKey: key,
        fileName: key,
        credentialKey: key,
      }
    );
    if (typeof response.data === "string") return response.data;
    return (
      response.data.viewUrl ||
      response.data.url ||
      response.data.downloadUrl ||
      response.data.presignedUrl ||
      ""
    );
  } catch (err) {
    console.error("Error generating view URL from Lambda:", err.message);
    return "";
  }
};

// ============================
// Admin Login
// ============================

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await passwordService.verify(
      password,
      admin.password
    );

    if (!passwordMatch) {
      auditService.logAuth({
        type: "failure",
        userId: admin._id,
        email: admin.email,
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
      userId: admin._id,
      email: admin.email,
      role: "admin",
      isVerified: true,
    });

    auditService.logAuth({
      type: "success",
      userId: admin._id,
      email: admin.email,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ============================
// Dashboard Statistics
// ============================

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await Specialist.countDocuments();

    const verifiedDoctors = await Specialist.countDocuments({
      verified: true,
    });

    const pendingRequests =
      await SpecialistApplication.countDocuments({
        status: "pending",
      });

    const rejectedRequests =
      await SpecialistApplication.countDocuments({
        status: "rejected",
      });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const verifiedToday = await Specialist.countDocuments({
      createdAt: {
        $gte: today,
      },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        verifiedDoctors,
        pendingRequests,
        rejectedRequests,
        verifiedToday,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ============================
// Recent Applications
// ============================

const getRecentApplications = async (req, res) => {
  try {
    const applications = await SpecialistApplication.find({
      status: "pending",
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      applications,
    })
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  };
}



// ============================
// Get Single Application
// ============================

const getApplicationById = async (req, res) => {
  try {
    const application =
      await SpecialistApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    let doctor = application.toObject();
    if (doctor.credentialKey) {
      const viewUrl = await getPresignedViewUrlFromLambda(doctor.credentialKey);
      if (viewUrl) {
        doctor.credentialUrl = viewUrl;
      }
    }

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ============================
// Approve Application
// ============================

const approveApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application =
      await SpecialistApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const existing =
      await Specialist.findOne({
        email: application.email,
      });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Doctor already exists",
      });
    }

    const doctor = await Specialist.create({
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      password: application.password,
      hospital: application.hospital,
      specialization: application.specialization,
      experience: application.experience,
      credentialKey: application.credentialKey,
      credentialUrl: application.credentialUrl,
      verified: true,
    });

    auditService.log({
      action: "APPLICATION_APPROVED",
      userId: doctor._id,
      ipAddress: req.ip,
      details: {
        email: doctor.email,
      },
    });

    await SpecialistApplication.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Doctor approved successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ============================
// Reject Application
// ============================

const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application =
      await SpecialistApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    application.status = "rejected";

    await application.save();

    auditService.log({
      action: "APPLICATION_REJECTED",
      userId: application._id,
      ipAddress: req.ip,
      details: {
        email: application.email,
      },
    });

    res.status(200).json({
      success: true,
      message: "Application rejected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ============================
// Get All Users
// ============================

const getAllUsers = async (req, res) => {
  try {
    const specialists = await Specialist.find();
    const admins = await Admin.find();

    const doctorUsers = specialists.map((doctor) => ({
      id: doctor._id,
      name: `${doctor.firstName} ${doctor.lastName}`,
      email: doctor.email,
      role: "Doctor",
      institution: doctor.hospital,
      status: "Verified",
      verified: true,
      createdAt: doctor.createdAt,
    }));

    const adminUsers = admins.map((admin) => ({
      id: admin._id,
      name: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      role: "Admin",
      institution: "System Administration",
      status: "Verified",
      verified: true,
      createdAt: admin.createdAt,
    }));

    res.status(200).json({
      success: true,
      users: [...doctorUsers, ...adminUsers],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ============================
// Get Single User
// ============================

const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let user = await Specialist.findById(id);
    let role = "Doctor";
    if (!user) {
      user = await Admin.findById(id);
      role = "Admin";
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    let userObj = user.toObject();
    if (userObj.credentialKey) {
      const viewUrl = await getPresignedViewUrlFromLambda(userObj.credentialKey);
      if (viewUrl) {
        userObj.credentialUrl = viewUrl;
      }
    }

    res.status(200).json({
      success: true,
      user: {
        ...userObj,
        role
      }
    });
  }

  catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

// ============================
// Update User Role
// ============================

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (role === "Admin") {
      const doctor = await Specialist.findById(id);
      if (!doctor) {
        return res.status(404).json({
          success:false,
          message:"Doctor not found"
        })
      }

      const admin = new Admin({
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        password: doctor.password
      });
      await admin.save();
      await Specialist.findByIdAndDelete(id);
    }

    else if (role === "Doctor") {
      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({
          success:false,
          message:"Admin not found"
        });
      }

      const doctor = new Specialist({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: admin.password,
        hospital: "Not Assigned",
        specialization: "General",
        experience: 0,
        verified: true
      });
      await doctor.save();
      await Admin.findByIdAndDelete(id);
    }
    res.status(200).json({
      success:true,
      message:"Role updated successfully"
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
// Delete User
// ============================

const deleteUser = async (req,res)=>{
  try{
    const {id}=req.params;
    let deleted=await Specialist.findByIdAndDelete(id);
    if(!deleted){
      deleted=await Admin.findByIdAndDelete(id);

    }
    if(!deleted){
      return res.status(404).json({
        success:false,
        message:"User not found"
      });
    }
    res.status(200).json({
      success:true,
      message:"User deleted successfully"
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

const getCredentialViewUrl = async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: "Key is required" });
    }
    const viewUrl = await getPresignedViewUrlFromLambda(key);
    res.status(200).json({
      success: true,
      viewUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  loginAdmin,
  getDashboardStats,
  getRecentApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  getAllUsers,
  getUserDetails,
  updateUserRole,
  deleteUser,
  getCredentialViewUrl
}
