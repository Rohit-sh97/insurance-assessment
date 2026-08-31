const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: true,
      trim: true
    },
    policyStartDate: {
      type: Date,
      default: null
    },
    policyEndDate: {
      type: Date,
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAccount",
      required: true
    },
    policyCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LOB",
      required: true
    },
    companyCollectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Carrier",
      required: true
    }
  },
  { timestamps: true }
);

policySchema.index({ policyNumber: 1 }, { unique: true });
policySchema.index({ userId: 1 });
policySchema.index({ agentId: 1 });

module.exports = mongoose.model("Policy", policySchema);
