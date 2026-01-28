import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password (16 chars)
      },
      pool: true,
      maxConnections: 1,
      maxMessages: 5,
      rateDelta: 2000,
      rateLimit: 5,
    });

    const mailOptions = {
      from: `"HireFilter Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email error:", error.message);
    console.error("Email error code:", error.code);
    throw error;
  }
};
