import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://amt931219_db_user:qV1hWhjQaQLoEyNR@cluster0.epk1isk.mongodb.net/rydex?retryWrites=true&w=majority&appName=Cluster0";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: { type: String, select: true },
  role: String,
  status: String,
  isEmailVerified: Boolean,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
  await mongoose.connect(MONGODB_URL);
  console.log("Connected to MongoDB");

  const accounts = [
    { email: "admin@rydex.com", name: "Rydex Administrator", role: "admin", pass: "Admin@1234" },
    { email: "amt931219@gmail.com", name: "Amit Tomar (Admin)", role: "admin", pass: "Admin@1234" },
    { email: "user@rydex.com", name: "Rydex Customer", role: "user", pass: "User@1234" },
    { email: "driver@rydex.com", name: "Rydex Driver", role: "partner", pass: "Driver@1234" },
  ];

  for (const acc of accounts) {
    let u = await User.findOne({ email: acc.email });
    const hashed = await bcrypt.hash(acc.pass, 10);

    if (!u) {
      u = await User.create({
        name: acc.name,
        email: acc.email,
        password: hashed,
        role: acc.role,
        status: "ACTIVE",
        isEmailVerified: true,
      });
      console.log(`Created ${acc.email} with role: ${acc.role}`);
    } else {
      u.password = hashed;
      u.role = acc.role;
      u.status = "ACTIVE";
      u.isEmailVerified = true;
      await u.save();
      console.log(`Updated ${acc.email} with role: ${acc.role} and fresh password hash`);
    }
  }

  const all = await User.find({}, { name: 1, email: 1, role: 1, password: 1 });
  console.log("\nVerified in DB:");
  for (const user of all) {
    console.log(`- ${user.email} (${user.role}): hasPassword=${!!user.password}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
