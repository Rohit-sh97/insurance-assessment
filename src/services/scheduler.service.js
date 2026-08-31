const cron = require("node-cron");
const { ScheduledMessage } = require("../models");

function isValidDate(day) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(new Date(`${day}T00:00:00`).getTime());
}

function isValidTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return false;
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function buildScheduledAt(day, time) {
  const scheduledAt = new Date(`${day}T${time}:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    const error = new Error("Invalid scheduled date/time");
    error.statusCode = 400;
    throw error;
  }

  return scheduledAt;
}

async function scheduleMessage({ message, day, time }) {
  if (!message || !String(message).trim()) {
    const error = new Error("message is required");
    error.statusCode = 400;
    throw error;
  }

  if (!day || !isValidDate(day)) {
    const error = new Error("day must be a valid date in YYYY-MM-DD format");
    error.statusCode = 400;
    throw error;
  }

  if (!time || !isValidTime(time)) {
    const error = new Error("time must be a valid time in HH:mm format");
    error.statusCode = 400;
    throw error;
  }

  const scheduledAt = buildScheduledAt(day, time);

  const saved = await ScheduledMessage.create({
    message: String(message).trim(),
    scheduledAt,
    status: "pending"
  });

  return saved;
}

async function processDueMessages() {
  const now = new Date();

  // Atomically claim due messages so two cron ticks cannot process the same document.
  const dueMessages = await ScheduledMessage.find({
    status: "pending",
    scheduledAt: { $lte: now }
  });

  for (const item of dueMessages) {
    const claimed = await ScheduledMessage.findOneAndUpdate(
      { _id: item._id, status: "pending" },
      { $set: { status: "processed", processedAt: new Date() } },
      { new: true }
    );

    if (!claimed) {
      continue;
    }

    console.log(
      `[Scheduled Message] ${claimed.scheduledAt.toISOString()} -> ${claimed.message}`
    );
  }
}

function startMessageScheduler() {
  const expression = process.env.CRON_EXPRESSION || "*/30 * * * * *";

  if (!cron.validate(expression)) {
    console.error("Invalid CRON_EXPRESSION. Scheduled message processor was not started.");
    return;
  }

  cron.schedule(expression, async () => {
    try {
      await processDueMessages();
    } catch (error) {
      console.error("Scheduled message job failed:", error.message);
    }
  });

  console.log(`Scheduled message processor started (${expression})`);
}

module.exports = {
  scheduleMessage,
  startMessageScheduler,
  processDueMessages
};
