const nodemailer = require("nodemailer");

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});



const sendOTP = async(email,otp)=>{

    await transporter.sendMail({

        from:process.env.EMAIL_USER,
        to:email,
        subject:"Password Reset OTP",

        html: `
<h2>Password Reset</h2>
<p>Your OTP is</p>
<h1>${otp}</h1>
<p>This OTP expires in 5 minutes.</p>
`
    });

};

module.exports={
    sendOTP
};