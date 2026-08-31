const express = require("express");
const policyController = require("../controllers/policy.controller");

const router = express.Router();

router.get("/search", policyController.searchPolicies);
router.get("/aggregate", policyController.aggregatePolicies);

module.exports = router;
