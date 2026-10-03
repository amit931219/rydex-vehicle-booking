import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI;

async function main() {
    try {
        const conn = await mongoose.connect(MONGODB_URI);
        const users = await conn.connection.db.collection("users").find({}).toArray();

        console.log("\n--- Checking Users in DB ---");
        for (const u of users) {
            console.log(`\nEmail: ${u.email}`);
            console.log(`Role:  ${u.role}`);
            console.log(`Status: ${u.status}`);
            console.log(`Has Password: ${!!u.password}`);
            if (u.password) {
                console.log(`Matches 'Admin@1234':  ${await bcrypt.compare("Admin@1234", u.password)}`);
                console.log(`Matches 'User@1234':   ${await bcrypt.compare("User@1234", u.password)}`);
                console.log(`Matches 'Driver@1234': ${await bcrypt.compare("Driver@1234", u.password)}`);
            }
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
main();
