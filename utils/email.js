const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_PASSWORD
  }
});

const sendNotification = (to, subject, text) => {
  const mailOptions = { from: process.env.ADMIN_EMAIL, to, subject, text };
  return transporter.sendMail(mailOptions);
};

module.exports = { sendNotification };
