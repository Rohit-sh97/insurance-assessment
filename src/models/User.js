const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    dob: {
      type: Date,
      default: null
    },
    address: {
      type: String,
      default: "",
      trim: true
    },
    phoneNumber: {
      type: String,
      default: "",
      trim: true
    },
    state: {
      type: String,
      default: "",
      trim: true
    },
    zipCode: {
      type: String,
      default: "",
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    gender: {
      type: String,
      default: "",
      trim: true
    },
    userType: {
      type: String,
      default: "",
      trim: true
    }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ firstName: 1 });

module.exports = mongoose.model("User", userSchema);
