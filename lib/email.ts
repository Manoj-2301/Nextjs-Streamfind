import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export type NotificationType = 'TRACK_RELEASE' | 'SYSTEM_ALERT';

export const sendNotificationEmail = async (
  to: string,
  type: NotificationType,
  data: any
) => {
  let subject = 'Notification from MovieFind';
  let html = '';

  switch (type) {
    case 'TRACK_RELEASE':
      subject = `You are tracking ${data.movieTitle}`;
      html = `
        <div style="font-family: Arial, sans-serif; background-color: #080009; color: #fff; padding: 40px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #18002a;">
          <h2 style="color: #f0abfc; margin-bottom: 20px;">MovieFind Release Tracking</h2>
          <p style="font-size: 16px; color: #fdf4ff; line-height: 1.5;">
            You have successfully set a reminder for <strong>${data.movieTitle}</strong>.
          </p>
          <p style="font-size: 14px; color: #94a3b8; margin-top: 30px;">
            We will notify you again as soon as this movie is released!
          </p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #64748b;">
            <p>You received this email because your Email Delivery Channel is enabled in your MovieFind Control Center.</p>
          </div>
        </div>
      `;
      break;

    case 'SYSTEM_ALERT':
      subject = `System Alert: ${data.title}`;
      html = `
        <div style="font-family: Arial, sans-serif; background-color: #0f0f11; color: #fff; padding: 40px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #fca5a5; margin-bottom: 20px;">System Alert</h2>
          <p style="font-size: 16px; color: #cbd5e1; line-height: 1.5;">
            ${data.message}
          </p>
        </div>
      `;
      break;
  }

  const mailOptions = {
    from: `"MovieFind Notifications" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Notification email sent: ', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending notification email:', error);
    return { success: false, error };
  }
};
