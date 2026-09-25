import nodemailer from "nodemailer";

export const sendMail = async (to: string, subject: string, html: string) => {
    const rawUser = process.env.EMAIL || "";
    const rawPass = process.env.PASS || "";

    const user = rawUser.trim().replace(/^["']|["']$/g, "");
    const pass = rawPass.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");

    if (!user || !pass) {
        console.error("sendMail error: EMAIL or PASS environment variable is missing.");
        throw new Error("Email credentials are not configured on the server");
    }

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user,
            pass,
        },
    });

    const plainText = html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();

    const info = await transporter.sendMail({
        from: `"RYDEX Support" <${user}>`,
        to: to.trim().toLowerCase(),
        subject,
        html,
        text: plainText,
    });

    console.log("Email sent successfully to:", to, "MessageId:", info.messageId);
    return info;
};
