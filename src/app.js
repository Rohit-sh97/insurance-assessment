const express = require("express");
const uploadRoutes = require("./routes/upload.routes");
const policyRoutes = require("./routes/policy.routes");
const messageRoutes = require("./routes/message.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Insurance API is running"
  });
});

app.use("/api/upload", uploadRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/messages", messageRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
