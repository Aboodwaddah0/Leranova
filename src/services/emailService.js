import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendLoginCode = async (email, code, userName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login Code - Learnova',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #333;">Login Code</h2>
          <p>Hello ${userName},</p>
          <p>Your login code is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you did not request this code, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Login code sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send login code email');
  }
};

export const sendOAuthWelcomeEmail = async (email, userName, type = 'organization') => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Learnova - OAuth Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Learnova!</h2>
          <p>Hello ${userName},</p>
          <p>Your ${type} account has been created successfully using OAuth.</p>
          <p>You can now log in using your OAuth provider.</p>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">If you have any questions, please contact our support team.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
};

export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
};
