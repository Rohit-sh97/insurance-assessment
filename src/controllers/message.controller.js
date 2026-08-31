const schedulerService = require("../services/scheduler.service");

async function scheduleMessage(req, res, next) {
  try {
    const saved = await schedulerService.scheduleMessage(req.body);

    res.status(201).json({
      message: "Message scheduled successfully",
      data: {
        id: saved._id,
        message: saved.message,
        scheduledAt: saved.scheduledAt,
        status: saved.status
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  scheduleMessage
};
