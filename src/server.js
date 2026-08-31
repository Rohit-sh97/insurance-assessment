require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const startCpuMonitor = require("./jobs/cpu-monitor");
const { startMessageScheduler } = require("./services/scheduler.service");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startCpuMonitor();
      startMessageScheduler();
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
