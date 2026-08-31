const mongoose = require("mongoose");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes("USERNAME:PASSWORD")) {
    throw new Error(
      "MONGO_URI is missing or still using the placeholder. Set a real MongoDB Atlas connection string in .env"
    );
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4
  });

  console.log("MongoDB connected");
}

module.exports = connectDB;
