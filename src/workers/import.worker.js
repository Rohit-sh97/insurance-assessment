const { parentPort, workerData } = require("worker_threads");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function toStringValue(value) {
  if (isEmpty(value)) {
    return "";
  }
  return String(value).trim();
}

function toDateValue(value) {
  if (isEmpty(value)) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString();
    }
  }

  const str = String(value).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    return new Date(Date.UTC(year, month, day)).toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeRow(row) {
  const firstName = toStringValue(row.firstname);
  const email = toStringValue(row.email).toLowerCase();
  const agentName = toStringValue(row.agent);
  const accountName = toStringValue(row.account_name);
  const categoryName = toStringValue(row.category_name);
  const companyName = toStringValue(row.company_name);
  const policyNumber = toStringValue(row.policy_number);

  if (
    !firstName ||
    !email ||
    !agentName ||
    !accountName ||
    !categoryName ||
    !companyName ||
    !policyNumber
  ) {
    return null;
  }

  return {
    agentName,
    user: {
      firstName,
      dob: toDateValue(row.dob),
      address: toStringValue(row.address),
      phoneNumber: toStringValue(row.phone),
      state: toStringValue(row.state),
      zipCode: toStringValue(row.zip),
      email,
      gender: toStringValue(row.gender),
      userType: toStringValue(row.userType)
    },
    accountName,
    lob: {
      categoryName
    },
    carrier: {
      companyName
    },
    policy: {
      policyNumber,
      policyStartDate: toDateValue(row.policy_start_date),
      policyEndDate: toDateValue(row.policy_end_date)
    }
  };
}

function parseSpreadsheet(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("Uploaded file was not found on disk");
  }

  const extension = path.extname(filePath).toLowerCase();
  if (![".csv", ".xlsx", ".xls"].includes(extension)) {
    throw new Error("Only .csv and .xlsx files are supported");
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Spreadsheet does not contain any sheets");
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
    raw: false
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Spreadsheet is empty");
  }

  const records = [];
  let skipped = 0;

  for (const row of rows) {
    const normalized = normalizeRow(row);
    if (normalized) {
      records.push(normalized);
    } else {
      skipped += 1;
    }
  }

  if (records.length === 0) {
    throw new Error("No valid rows found in the spreadsheet");
  }

  return {
    totalRows: rows.length,
    skipped,
    records
  };
}

try {
  const result = parseSpreadsheet(workerData.filePath);
  parentPort.postMessage(result);
} catch (error) {
  parentPort.postMessage({
    error: error.message || "Failed to parse spreadsheet"
  });
}
