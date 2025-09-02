const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();
const transporter = nodemailer.createTransport({
service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'outlook'
auth: {
user: process.env.EMAIL_USER, // Your email address from .env
pass: process.env.EMAIL_PASS // Your App Password or email password from .env
}
});
// Function to send Verification OTP Email
const sendVerificationEmail = async (toEmail, otp) => {
const mailOptions = {
from: process.env.EMAIL_FROM,
to: toEmail,
subject: 'Gold Nest - Verify Your Email Address',
text: `Your Gold Nest email verification OTP is: ${otp}. It is valid for 10 minutes.`,
html:` <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;"> <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);"> <h2 style="text-align: center; color: #333;"> <img src="${process.env.FRONTEND_URL}/GoldNest.png" alt="Gold Nest Logo" style="max-width: 120px; display: block; margin: auto; margin-bottom: 10px;"></img> Gold Nest - Verify Your Email </h2> <p style="font-size: 16px; color: #555;">Hello,</p> <p style="font-size: 16px; color: #555;">Use the following OTP to verify your email address for your Gold Nest account:</p> <div style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; text-align: center; margin: 20px 0; background-color: #e8f5e9; padding: 10px; border-radius: 5px;"> ${otp} </div> <p style="font-size: 14px; color: #777;">This OTP is valid for 10 minutes. Do not share it with anyone.</p> <p style="font-size: 14px; color: #555;">If you didn't request this, please ignore this email.</p> <p style="font-size: 14px; color: #555;">For assistance, contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color: #4CAF50;">${process.env.EMAIL_USER}</a>.</p> <div style="text-align: center; font-size: 12px; color: #aaa; margin-top: 30px;">© ${new Date().getFullYear()} Gold Nest</div> </div> </body>`
};
try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification Email sent: ' + info.response);
    return true;
} catch (error) {
    console.error('Error sending verification email: ' + error.message);
    return false;
}
};
// Function to send Password Reset Email
const sendPasswordResetEmail = async (toEmail, resetToken) => {
const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Gold Nest - Reset Your Password',
    text: `You requested a password reset for your Gold Nest account. Click the link below to reset it:\n\n${resetUrl}\n\nThis link is valid for 10 minutes. If you did not request this, please ignore this email.`,
    html: `<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
             <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
               <h2 style="text-align: center; color: #333;">
                  <img src="${process.env.FRONTEND_URL}/GoldNest.png" alt="Gold Nest Logo" style="max-width: 120px; display: block; margin: auto; margin-bottom: 10px;">
                  Gold Nest - Reset Your Password
               </h2>
               <p style="font-size: 16px; color: #555;">Hello,</p>
               <p style="font-size: 16px; color: #555;">You requested a password reset. Click the button below to set a new password:</p>
               <div style="text-align: center; margin: 30px 0;">
                 <a href="${resetUrl}" style="background-color: #fbbf24; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Reset Password</a>
               </div>
               <p style="font-size: 14px; color: #777;">This link is valid for 10 minutes. If you cannot click the button, copy and paste this URL into your browser: ${resetUrl}</p>
               <p style="font-size: 14px; color: #555;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                <p style="font-size: 14px; color: #555;">For assistance, contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color: #4CAF50;">${process.env.EMAIL_USER}</a>.</p>
               <div style="text-align: center; font-size: 12px; color: #aaa; margin-top: 30px;">© ${new Date().getFullYear()} Gold Nest</div>
             </div>
           </body>`
};

try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password Reset Email sent: ' + info.response);
    return true;
} catch (error) {
    console.error('Error sending password reset email: ' + error.message);
    return false;
}
};
// --- Admin Welcome & Password Setup Email ---
const sendAdminSetupEmail = async (toEmail, resetToken) => {
const setupUrl = `${process.env.FRONTEND_URL}/admin-password-setup/${resetToken}`;
const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Welcome to GoldNest - Set Up Your Admin Account',
    html: `<body style="font-family: Arial, sans-serif; padding: 30px;">
             <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px;">
               <h2 style="text-align: center;">Welcome to the GoldNest Admin Panel</h2>
               <p>An administrator account has been created for you. Click the button below to set your password and log in. This link is valid for 24 hours.</p>
               <div style="text-align: center; margin: 30px 0;">
                 <a href="${setupUrl}" style="background-color: #1a202c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Set Your Password</a>
               </div>
               <p style="font-size: 14px;">If you did not expect this, please ignore this email.</p>
             </div>
           </body>`
};

try {
    await transporter.sendMail(mailOptions);
    console.log(`Admin setup email sent to ${toEmail}`);
    return true;
} catch (error) {
    console.error(`Error sending admin setup email to ${toEmail}:`, error);
    return false;
}
};
// --- Generic Notification Email ---
const sendGenericNotificationEmail = async (toEmail, subject, message, link = null) => {
// Basic HTML template for general notifications
let htmlContent = `<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
<div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
<h2 style="text-align: center; color: #333;">
<img src="${process.env.FRONTEND_URL}/GoldNest.png" alt="Gold Nest Logo" style="max-width: 120px; display: block; margin: auto; margin-bottom: 10px;">
Gold Nest Notification
</h2>
<h3 style="color: #333;">${subject}</h3>
<p style="font-size: 16px; color: #555; white-space: pre-wrap;">${message}</p>`;
code
Code
// Add a button if a link is provided
if (link) {
    let fullLink;
    // --- THIS IS THE CORRECTED LOGIC BLOCK ---
    if (link.startsWith('/')) {
        fullLink = `${process.env.FRONTEND_URL}${link}`;
    } else if (link.startsWith('http')) {
        fullLink = link;
    } else {
        fullLink = `${process.env.FRONTEND_URL}/${link}`;
    }
    
    htmlContent += `
    <div style="text-align: center; margin: 30px 0;">
        <a href="${fullLink}" style="background-color: #F8B612; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">View Details</a>
    </div>`;
}

htmlContent += `
        <p style="font-size: 14px; color: #555;">For assistance, contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color: #4CAF50;">${process.env.EMAIL_USER}</a>.</p>
        <div style="text-align: center; font-size: 12px; color: #aaa; margin-top: 30px;">© ${new Date().getFullYear()} Gold Nest</div>
    </div>
</body>`;

// Construct the absolute link for the plain text version as well
let plainTextLink = '';
if (link) {
    let fullLink;
    if (link.startsWith('/')) {
        fullLink = `${process.env.FRONTEND_URL}${link}`;
    } else if (link.startsWith('http')) {
        fullLink = link;
    } else {
        fullLink = `${process.env.FRONTEND_URL}/${link}`;
    }
    plainTextLink = `\n\nView Details: ${fullLink}`;
}

const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: `Gold Nest: ${subject}`, // Add prefix to subject
    text: `${subject}\n\n${message}${plainTextLink}`, // Plain text version
    html: htmlContent
};

try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Generic Notification Email sent to ${toEmail}: ${subject}`);
    return true;
} catch (error) {
    console.error(`Error sending generic notification email to ${toEmail}: ` + error.message);
    return false;
}
};
module.exports = {
sendVerificationEmail,
sendPasswordResetEmail,
sendAdminSetupEmail,
sendGenericNotificationEmail
};
