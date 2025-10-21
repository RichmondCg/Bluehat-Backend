const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Simple email templates - No names needed
const EMAIL_TEMPLATES = {
  WORKER_INVITATION: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Job Invitation - FixIt</h2>
      <p>Hello!</p>
      <p>You have received a new job invitation on FixIt platform.</p>
      <p><strong>Job Description:</strong></p>
      <p>{jobDescription}</p>
      <p>Please log in to your FixIt account to view the full details and respond to this invitation.</p>
      <p><a href="{frontendUrl}/dashboard" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Invitation</a></p>
      <p>Best regards,<br>The FixIt Team</p>
    </div>
  `,

  APPLICATION_ACCEPTED: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Great News! Application Accepted</h2>
      <p>Hello!</p>
      <p>Your application for a job on FixIt has been accepted!</p>
      <p><strong>Job:</strong> {jobTitle}</p>
      <p>Please log in to your FixIt account to proceed with the next steps.</p>
      <p><a href="{frontendUrl}/dashboard" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
      <p>Best regards,<br>The FixIt Team</p>
    </div>
  `,

  APPLICATION_REJECTED: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Application Update</h2>
      <p>Hello!</p>
      <p>Thank you for your interest in the job "{jobTitle}" on FixIt. Unfortunately, the client has decided to go with another candidate for this position.</p>
      <p>Don't give up! There are many other opportunities available on FixIt.</p>
      <p><a href="{frontendUrl}/jobs" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Browse More Jobs</a></p>
      <p>Best regards,<br>The FixIt Team</p>
    </div>
  `,

  DISCUSSION_STARTED: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Discussion Started</h2>
      <p>Hello!</p>
      <p>Someone has started a discussion about a job on FixIt.</p>
      <p><strong>Job:</strong> {jobTitle}</p>
      <p>Please log in to your FixIt account to continue the conversation.</p>
      <p><a href="{frontendUrl}/messages" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Messages</a></p>
      <p>Best regards,<br>The FixIt Team</p>
    </div>
  `,
};

// Worker invitation email - No names needed
const sendWorkerInvitationEmail = async (workerEmail, jobDescription) => {
  console.log("🔍 sendWorkerInvitationEmail called with:", {
    workerEmail,
    jobDescription: jobDescription?.substring(0, 50) + "...",
    emailExists: !!process.env.EMAIL,
    passwordExists: !!process.env.PASSWORD,
  });

  try {
    const frontendUrl = process.env.FRONTEND_URL;

    console.log("🔍 Email config:", {
      frontendUrl,
      fromEmail: process.env.EMAIL,
    });

    const mailOptions = {
      from: `"FixIt" <${process.env.EMAIL}>`,
      to: workerEmail,
      subject: "New Job Invitation - FixIt",
      html: EMAIL_TEMPLATES.WORKER_INVITATION.replace(
        "{jobDescription}",
        jobDescription
      ).replace("{frontendUrl}", frontendUrl),
      category: "Job Invitation",
    };

    console.log("🔍 Mail options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Worker invitation email sent:", info.response);
    return true;
  } catch (error) {
    console.error("❌ Error sending worker invitation email:", error.message);
    console.error("❌ Full error:", error);
    return false;
  }
};

// Application status update email - No names needed
const sendApplicationStatusEmail = async (
  recipientEmail,
  jobTitle,
  emailType
) => {
  try {
    const frontendUrl =
      process.env.FRONTEND_URL || process.env.DEV_FRONTEND_URL;

    let template, subject;
    switch (emailType) {
      case "application_accepted":
        template = EMAIL_TEMPLATES.APPLICATION_ACCEPTED;
        subject = "Application Accepted - FixIt";
        break;
      case "application_rejected":
        template = EMAIL_TEMPLATES.APPLICATION_REJECTED;
        subject = "Application Update - FixIt";
        break;
      case "discussion_started":
        template = EMAIL_TEMPLATES.DISCUSSION_STARTED;
        subject = "Discussion Started - FixIt";
        break;
      default:
        throw new Error("Unknown email type");
    }

    const mailOptions = {
      from: `"FixIt" <${process.env.EMAIL}>`,
      to: recipientEmail,
      subject: subject,
      html: template
        .replace("{jobTitle}", jobTitle)
        .replace("{frontendUrl}", frontendUrl),
      category: "Application Update",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ${emailType} email sent:`, info.response);
    return true;
  } catch (error) {
    console.error(`❌ Error sending ${emailType} email:`, error.message);
    return false;
  }
};

module.exports = {
  sendWorkerInvitationEmail,
  sendApplicationStatusEmail,
};
