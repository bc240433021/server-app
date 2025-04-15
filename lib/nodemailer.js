import nodemailer from "nodemailer";

const emailAddress = process.env.EMAIL_ADDRESS;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  auth: {
    user: emailAddress,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
});

/**
 * Send emails using that function
 * @param {Object} param0
 * @param {Array} param0.to
 * @param {String} param0.subject
 * @param {"html" | "text"} param0.contentType
 * @param {String} param0.content
 */
export async function sendEmail({ to, subject, contentType = "html", content, bcc }) {
  const res = await transporter.sendMail({
    from: `EDconsulting<${emailAddress}>`,
    subject,
    [contentType]: content,
    ...(bcc && bcc.length > 0 ? { bcc } : { to }),
  });
  return res;
}

export default transporter;
