const si = require("systeminformation");

function startCpuMonitor() {
  const threshold = Number(process.env.CPU_THRESHOLD || 70);
  const interval = Number(process.env.CPU_CHECK_INTERVAL || 5000);

  console.log("CPU monitor started");

  const timer = setInterval(async () => {
    try {
      const load = await si.currentLoad();
      const usage = Number(load.currentLoad.toFixed(2));

      console.log(`CPU Usage: ${usage}%`);

      if (usage >= threshold) {
        console.log(`CPU usage exceeded ${threshold}%. Restarting server...`);
        clearInterval(timer);
        process.exit(1);
      }
    } catch (error) {
      console.error("CPU monitoring error:", error.message);
    }
  }, interval);

  timer.unref();
}

module.exports = startCpuMonitor;
