const { User, Policy } = require("../models");

async function searchByUsername(username) {
  const trimmed = (username || "").trim();

  if (!trimmed) {
    const error = new Error("Query parameter 'username' is required");
    error.statusCode = 400;
    throw error;
  }

  const users = await User.find({
    firstName: { $regex: trimmed, $options: "i" }
  })
    .select("_id firstName email")
    .lean();

  if (users.length === 0) {
    const error = new Error(`User not found for username: ${trimmed}`);
    error.statusCode = 404;
    throw error;
  }

  const userIds = users.map((user) => user._id);

  const policies = await Policy.aggregate([
    {
      $match: {
        userId: { $in: userIds }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "agents",
        localField: "agentId",
        foreignField: "_id",
        as: "agent"
      }
    },
    { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "useraccounts",
        localField: "accountId",
        foreignField: "_id",
        as: "account"
      }
    },
    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "lobs",
        localField: "policyCategoryId",
        foreignField: "_id",
        as: "lob"
      }
    },
    { $unwind: { path: "$lob", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "carriers",
        localField: "companyCollectionId",
        foreignField: "_id",
        as: "carrier"
      }
    },
    { $unwind: { path: "$carrier", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        policyId: "$_id",
        policyNumber: 1,
        policyStartDate: 1,
        policyEndDate: 1,
        user: {
          userId: "$user._id",
          firstName: "$user.firstName",
          email: "$user.email",
          phoneNumber: "$user.phoneNumber",
          address: "$user.address",
          state: "$user.state",
          zipCode: "$user.zipCode",
          gender: "$user.gender",
          userType: "$user.userType"
        },
        agent: {
          agentId: "$agent._id",
          agentName: "$agent.agentName"
        },
        account: {
          accountId: "$account._id",
          accountName: "$account.accountName"
        },
        lob: {
          lobId: "$lob._id",
          categoryName: "$lob.categoryName"
        },
        carrier: {
          carrierId: "$carrier._id",
          companyName: "$carrier.companyName"
        }
      }
    }
  ]);

  if (policies.length === 0) {
    const error = new Error(`No policies found for username: ${trimmed}`);
    error.statusCode = 404;
    throw error;
  }

  return {
    username: trimmed,
    matchedUsers: users.length,
    totalPolicies: policies.length,
    policies
  };
}

async function aggregateByUser() {
  const results = await Policy.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "agents",
        localField: "agentId",
        foreignField: "_id",
        as: "agent"
      }
    },
    { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "useraccounts",
        localField: "accountId",
        foreignField: "_id",
        as: "account"
      }
    },
    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "lobs",
        localField: "policyCategoryId",
        foreignField: "_id",
        as: "lob"
      }
    },
    { $unwind: { path: "$lob", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "carriers",
        localField: "companyCollectionId",
        foreignField: "_id",
        as: "carrier"
      }
    },
    { $unwind: { path: "$carrier", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$userId",
        userName: { $first: "$user.firstName" },
        email: { $first: "$user.email" },
        totalPolicies: { $sum: 1 },
        policies: {
          $push: {
            policyId: "$_id",
            policyNumber: "$policyNumber",
            policyStartDate: "$policyStartDate",
            policyEndDate: "$policyEndDate",
            agentName: "$agent.agentName",
            accountName: "$account.accountName",
            categoryName: "$lob.categoryName",
            companyName: "$carrier.companyName"
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        userName: 1,
        email: 1,
        totalPolicies: 1,
        policies: 1
      }
    },
    { $sort: { userName: 1 } }
  ]);

  return results;
}

module.exports = {
  searchByUsername,
  aggregateByUser
};
