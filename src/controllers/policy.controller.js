const policyService = require("../services/policy.service");

async function searchPolicies(req, res, next) {
  try {
    const result = await policyService.searchByUsername(req.query.username);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function aggregatePolicies(req, res, next) {
  try {
    const result = await policyService.aggregateByUser();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchPolicies,
  aggregatePolicies
};
