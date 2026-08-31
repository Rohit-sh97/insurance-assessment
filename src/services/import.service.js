const { Worker } = require("worker_threads");
const path = require("path");
const fs = require("fs/promises");
const { Agent, User, UserAccount, LOB, Carrier, Policy } = require("../models");

function runImportWorker(filePath) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn, value) => {
      if (settled) {
        return;
      }
      settled = true;
      fn(value);
    };

    const worker = new Worker(path.join(__dirname, "../workers/import.worker.js"), {
      workerData: { filePath }
    });

    worker.on("message", (message) => {
      if (message && message.error) {
        const error = new Error(message.error);
        error.statusCode = 400;
        settle(reject, error);
        return;
      }
      settle(resolve, message);
    });

    worker.on("error", (error) => {
      settle(reject, error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        settle(reject, new Error(`Import worker stopped with exit code ${code}`));
      }
    });
  });
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (key && !map.has(key)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

async function upsertLookup(Model, uniqueItems, filterFn, setFn, keyFn) {
  if (uniqueItems.length === 0) {
    return new Map();
  }

  const operations = uniqueItems.map((item) => ({
    updateOne: {
      filter: filterFn(item),
      update: { $setOnInsert: setFn(item) },
      upsert: true
    }
  }));

  await Model.bulkWrite(operations, { ordered: false });

  const docs = await Model.find({
    $or: uniqueItems.map((item) => filterFn(item))
  }).lean();

  const lookup = new Map();
  for (const doc of docs) {
    lookup.set(keyFn(doc), doc._id);
  }
  return lookup;
}

async function persistRecords(records) {
  const agents = uniqueBy(records, (row) => row.agentName.toLowerCase());
  const users = uniqueBy(records, (row) => row.user.email);
  const lobs = uniqueBy(records, (row) => row.lob.categoryName.toLowerCase());
  const carriers = uniqueBy(records, (row) => row.carrier.companyName.toLowerCase());

  const agentLookup = await upsertLookup(
    Agent,
    agents,
    (item) => ({ agentName: item.agentName }),
    (item) => ({ agentName: item.agentName }),
    (doc) => doc.agentName.toLowerCase()
  );

  const userLookup = await upsertLookup(
    User,
    users,
    (item) => ({ email: item.user.email }),
    (item) => ({
      firstName: item.user.firstName,
      dob: item.user.dob,
      address: item.user.address,
      phoneNumber: item.user.phoneNumber,
      state: item.user.state,
      zipCode: item.user.zipCode,
      email: item.user.email,
      gender: item.user.gender,
      userType: item.user.userType
    }),
    (doc) => doc.email
  );

  const lobLookup = await upsertLookup(
    LOB,
    lobs,
    (item) => ({ categoryName: item.lob.categoryName }),
    (item) => ({ categoryName: item.lob.categoryName }),
    (doc) => doc.categoryName.toLowerCase()
  );

  const carrierLookup = await upsertLookup(
    Carrier,
    carriers,
    (item) => ({ companyName: item.carrier.companyName }),
    (item) => ({ companyName: item.carrier.companyName }),
    (doc) => doc.companyName.toLowerCase()
  );

  const accounts = uniqueBy(records, (row) => {
    const userId = userLookup.get(row.user.email);
    return userId ? `${row.accountName.toLowerCase()}::${userId}` : null;
  });

  const accountLookup = await upsertLookup(
    UserAccount,
    accounts,
    (item) => ({
      accountName: item.accountName,
      userId: userLookup.get(item.user.email)
    }),
    (item) => ({
      accountName: item.accountName,
      userId: userLookup.get(item.user.email)
    }),
    (doc) => `${doc.accountName.toLowerCase()}::${doc.userId}`
  );

  const policyOps = [];
  let imported = 0;

  for (const row of records) {
    const userId = userLookup.get(row.user.email);
    const agentId = agentLookup.get(row.agentName.toLowerCase());
    const accountId = accountLookup.get(
      `${row.accountName.toLowerCase()}::${userId}`
    );
    const policyCategoryId = lobLookup.get(row.lob.categoryName.toLowerCase());
    const companyCollectionId = carrierLookup.get(
      row.carrier.companyName.toLowerCase()
    );

    if (!userId || !agentId || !accountId || !policyCategoryId || !companyCollectionId) {
      continue;
    }

    imported += 1;
    policyOps.push({
      updateOne: {
        filter: { policyNumber: row.policy.policyNumber },
        update: {
          $set: {
            policyNumber: row.policy.policyNumber,
            policyStartDate: row.policy.policyStartDate,
            policyEndDate: row.policy.policyEndDate,
            userId,
            agentId,
            accountId,
            policyCategoryId,
            companyCollectionId
          }
        },
        upsert: true
      }
    });
  }

  if (policyOps.length > 0) {
    await Policy.bulkWrite(policyOps, { ordered: false });
  }

  return imported;
}

async function importFile(filePath) {
  try {
    const parsed = await runImportWorker(filePath);
    const imported = await persistRecords(parsed.records);

    return {
      message: "File imported successfully",
      totalRows: parsed.totalRows,
      imported,
      skipped: parsed.skipped
    };
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
}

module.exports = {
  importFile
};
