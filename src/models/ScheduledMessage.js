const mongoose = require("mongoose");

const scheduledMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "processed"],
      default: "pending"
    },
    processedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

scheduledMessageSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model("ScheduledMessage", scheduledMessageSchema);
