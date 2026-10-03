import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URL not found in .env.local");
    process.exit(1);
}

const targetEmail = process.argv[2] || "admin@rydex.com";

async function main() {
    try {
        console.log(`Connecting to MongoDB...`);
        const conn = await mongoose.connect(MONGODB_URI);
        const db = conn.connection.db;

        const cleanEmail = targetEmail.toLowerCase().trim();
        const existing = await db.collection("users").findOne({ email: cleanEmail });

        if (existing) {
            await db.collection("users").updateOne(
                { _id: existing._id },
                { $set: { role: "admin", status: "ACTIVE" } }
            );
            console.log(`\n🎉 Successfully promoted ${cleanEmail} to role: "admin"!`);
        } else {
            const hashedPassword = await bcrypt.hash("Admin@1234", 10);
            await db.collection("users").insertOne({
                name: "Platform Administrator",
                email: cleanEmail,
                password: hashedPassword,
                role: "admin",
                status: "ACTIVE",
                isEmailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`\n🎉 Created new Admin Account:`);
            console.log(`Email:    ${cleanEmail}`);
            console.log(`Password: Admin@1234`);
            console.log(`Role:     admin`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Error setting admin:", err);
        process.exit(1);
    }
}

main();
