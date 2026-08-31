# Insurance Assessment API

A production-style Node.js backend for importing insurance policy data from CSV/XLSX files and querying policies with MongoDB aggregations. Includes CPU monitoring with PM2 auto-restart and scheduled message processing.

---

## Technology Stack

- **Node.js** — JavaScript runtime
- **Express.js** — REST API framework
- **MongoDB Atlas** — Cloud database
- **Mongoose** — MongoDB ODM with schemas and indexes
- **Worker Threads** — Offload CPU-intensive spreadsheet parsing
- **Multer** — Multipart file upload handling
- **XLSX (SheetJS)** — CSV/XLSX parsing
- **node-cron** — Scheduled background jobs
- **systeminformation** — Real-time CPU monitoring
- **PM2** — Process management and auto-restart
- **dotenv** — Environment configuration

---

## Architecture

```text
Client / Postman
      |
      v
Express.js REST API
      |
      +---------------------+
      |                     |
      v                     v
Upload API              Policy APIs
      |                     |
      v                     v
Multer                Controller
      |
      v
Worker Thread
      |
      +--> Read CSV/XLSX
      +--> Parse & Normalize
      +--> Return Records
      |
      v
MongoDB Atlas
      |
      +-----------------------------+
      |        |        |          |
      v        v        v          v
   Agent    User    Account     LOB
                                    |
                                    v
                                Carrier
                                    |
                                    v
                                 Policy

Background:
Node.js
  |
  +--> CPU Monitor (systeminformation)
  |       |
  |       +--> CPU >= 70%
  |                |
  |                v
  |           process.exit(1)
  |                |
  |                v
  |              PM2
  |                |
  |                v
  |          Restart server
  |
  +--> node-cron
  |
  v
Scheduled Messages
  |
  v
MongoDB
```

---

## Folder Structure

```text
insurance-assessment/
│
├── src/
│   ├── server.js                 # Entry point
│   ├── app.js                    # Express app
│   │
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   │
│   ├── models/
│   │   ├── Agent.js
│   │   ├── User.js
│   │   ├── UserAccount.js
│   │   ├── LOB.js
│   │   ├── Carrier.js
│   │   ├── Policy.js
│   │   ├── ScheduledMessage.js
│   │   └── index.js
│   │
│   ├── routes/
│   │   ├── upload.routes.js
│   │   ├── policy.routes.js
│   │   └── message.routes.js
│   │
│   ├── controllers/
│   │   ├── upload.controller.js
│   │   ├── policy.controller.js
│   │   └── message.controller.js
│   │
│   ├── services/
│   │   ├── import.service.js     # Worker orchestration + bulk upserts
│   │   ├── policy.service.js     # Search & aggregation logic
│   │   └── scheduler.service.js  # Scheduled message CRUD + cron job
│   │
│   ├── workers/
│   │   └── import.worker.js      # Worker Thread: parses CSV/XLSX
│   │
│   ├── jobs/
│   │   └── cpu-monitor.js        # CPU threshold monitor
│   │
│   └── middleware/
│       ├── upload.middleware.js  # Multer config
│       └── error.middleware.js   # Centralized error handling
│
├── uploads/                      # Temporary uploads (gitignored)
│
├── .env                          # Local config (gitignored)
├── .env.example                  # Template
├── .gitignore
├── package.json
└── README.md
```

---

## Installation

```bash
cd insurance-assessment
npm install
```

---

## Environment Setup

Create `.env` from the example and fill in your MongoDB Atlas URI:

```bash
cp .env.example .env
```

```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/insurance_assessment
CPU_THRESHOLD=70
CPU_CHECK_INTERVAL=5000
CRON_EXPRESSION=*/30 * * * * *
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | *(required)* |
| `CPU_THRESHOLD` | CPU % that triggers restart | `70` |
| `CPU_CHECK_INTERVAL` | Interval between CPU checks (ms) | `5000` |
| `CRON_EXPRESSION` | Cron schedule for message processor | `*/30 * * * * *` (every 30s) |

> **Never commit `.env`** — it is in `.gitignore`.

---

## MongoDB Atlas Setup (Required)

The application requires a MongoDB Atlas cluster. Follow these steps:

1. **Create a Cluster**: Go to [MongoDB Atlas](https://cloud.mongodb.com) and create a free M0 cluster
2. **Create a Database User**:
   - Go to **Database Access** → **Add New Database User**
   - Choose **Password** authentication
   - Set username/password (e.g., `rsantoshsharma9730` / your password)
   - **Important**: Grant **Read and write to any database** role (Atlas Admin or custom role with `readWrite` on `insurance_assessment`)
3. **Configure Network Access**:
   - Go to **Network Access** → **Add IP Address**
   - **For development**: Add `0.0.0.0/0` (allow from anywhere) — *remove in production*
   - **For production**: Add your server's specific IP
4. **Get Connection String**:
   - Go to **Clusters** → **Connect** → **Connect your application**
   - Copy the **SRV connection string** (starts with `mongodb+srv://`)
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `insurance_assessment`

### Example `.env`

```env
PORT=5000
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/insurance_assessment?retryWrites=true&w=majority&appName=Cluster0
CPU_THRESHOLD=70
CPU_CHECK_INTERVAL=5000
CRON_EXPRESSION=*/30 * * * * *
```

### Common Connection Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `bad auth : authentication failed` | Wrong password, user doesn't exist, or wrong `authSource` | Verify credentials in Atlas → Database Access; try adding `?authSource=admin` |
| `querySrv ECONNREFUSED` / `ETIMEDOUT` | DNS SRV blocked by firewall/ISP | Use Google DNS (`8.8.8.8`) — already configured in `src/config/db.js`; or use standard connection string with replica set members |
| `IP not whitelisted` | Your IP not in Network Access | Add `0.0.0.0/0` for dev in Atlas → Network Access |
| `user not allowed to do action` | User lacks `readWrite` role | Grant Atlas Admin or custom role with `readWrite` on `insurance_assessment` |

### If SRV Connection Fails

Use the standard connection string format with explicit replica set members:

```env
MONGO_URI=mongodb://username:password@shard-00-00.xxxxx.mongodb.net:27017,shard-00-01.xxxxx.mongodb.net:27017,shard-00-02.xxxxx.mongodb.net:27017/insurance_assessment?replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
```

Get the shard hostnames from Atlas → **Connect** → **Connect your application** → **Standard connection string**.

---

## Run Development

```bash
npm run dev
```

Server starts at `http://localhost:5000`.

---

## Run with PM2 (Production)

```bash
# Start
pm2 start src/server.js --name insurance-api

# View logs
pm2 logs insurance-api

# Stop
pm2 stop insurance-api

# Restart
pm2 restart insurance-api

# Delete
pm2 delete insurance-api
```

---

## API Documentation

### 1. Upload CSV/XLSX

**POST** `/api/upload`

Upload a `.csv` or `.xlsx` file for import.

#### Request

- Content-Type: `multipart/form-data`
- Field name: `file`

```bash
curl -X POST http://localhost:5000/api/upload \
  -F "file=@sample.csv"
```

#### Success Response (200)

```json
{
  "message": "File imported successfully",
  "totalRows": 1198,
  "imported": 1198,
  "skipped": 0
}
```

#### Errors

| Status | Cause |
|--------|-------|
| 400 | No file uploaded, invalid file type, empty spreadsheet, no valid rows |
| 500 | MongoDB error, worker thread failure |

---

### 2. Search Policies by Username

**GET** `/api/policies/search?username=John`

Returns all policies for users whose first name matches the query (case-insensitive). Uses MongoDB aggregation with `$lookup`.

#### Query Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `username` | Yes | First name to search |

#### Example

```bash
curl "http://localhost:5000/api/policies/search?username=Lura"
```

#### Success Response (200)

```json
{
  "username": "Lura",
  "matchedUsers": 1,
  "totalPolicies": 2,
  "policies": [
    {
      "policyId": "66c...",
      "policyNumber": "YEEX9MOIBU7X",
      "policyStartDate": "2018-11-02T00:00:00.000Z",
      "policyEndDate": "2019-11-02T00:00:00.000Z",
      "user": {
        "userId": "66c...",
        "firstName": "Lura Lucca",
        "email": "madler@yahoo.ca",
        "phoneNumber": "8677356559",
        "address": "170 MATTHIAS CT",
        "state": "NC",
        "zipCode": "27028",
        "gender": "",
        "userType": "Active Client"
      },
      "agent": {
        "agentId": "66c...",
        "agentName": "Alex Watson"
      },
      "account": {
        "accountId": "66c...",
        "accountName": "Lura Lucca & Owen Dodson"
      },
      "lob": {
        "lobId": "66c...",
        "categoryName": "Commercial Auto"
      },
      "carrier": {
        "carrierId": "66c...",
        "companyName": "Integon Gen Ins Corp"
      }
    }
  ]
}
```

#### Errors

| Status | Cause |
|--------|-------|
| 400 | Missing `username` query param |
| 404 | No user found, or user has no policies |
| 500 | MongoDB aggregation error |

---

### 3. Aggregated Policies by User

**GET** `/api/policies/aggregate`

Returns all users with their policy counts and policy details. Uses `$lookup`, `$group`, `$project`, `$unwind`.

#### Example

```bash
curl http://localhost:5000/api/policies/aggregate
```

#### Success Response (200)

```json
[
  {
    "userId": "66c...",
    "userName": "Lura Lucca",
    "email": "madler@yahoo.ca",
    "totalPolicies": 2,
    "policies": [
      {
        "policyId": "66c...",
        "policyNumber": "YEEX9MOIBU7X",
        "policyStartDate": "2018-11-02T00:00:00.000Z",
        "policyEndDate": "2019-11-02T00:00:00.000Z",
        "agentName": "Alex Watson",
        "accountName": "Lura Lucca & Owen Dodson",
        "categoryName": "Commercial Auto",
        "companyName": "Integon Gen Ins Corp"
      }
    ]
  }
]
```

---

### 4. Schedule a Message

**POST** `/api/messages/schedule`

Persists a message to MongoDB with a scheduled execution time. A background cron job processes due messages.

#### Request Body

```json
{
  "message": "Policy renewal reminder",
  "day": "2026-09-01",
  "time": "10:30"
}
```

#### Validation

- `message`: required, non-empty string
- `day`: required, valid `YYYY-MM-DD`
- `time`: required, valid `HH:mm` (24-hour)

#### Success Response (201)

```json
{
  "message": "Message scheduled successfully",
  "data": {
    "id": "66c...",
    "message": "Policy renewal reminder",
    "scheduledAt": "2026-09-01T10:30:00.000Z",
    "status": "pending"
  }
}
```

#### Errors

| Status | Cause |
|--------|-------|
| 400 | Missing/invalid message, day, or time |
| 500 | MongoDB error |

---

## CPU Monitoring

- Runs in the main process using `systeminformation`.
- Checks CPU every **5 seconds** (configurable via `CPU_CHECK_INTERVAL`).
- If CPU ≥ **70%** (configurable via `CPU_THRESHOLD`), calls `process.exit(1)`.
- **PM2 detects the crash** and restarts the application automatically.
- Terminal output:

```text
CPU monitor started
CPU Usage: 32.41%
CPU Usage: 45.72%
CPU Usage: 61.32%
CPU Usage: 71.04%
CPU usage exceeded 70%. Restarting server...
```

> For testing, set `CPU_THRESHOLD=10` in `.env` to trigger a quick restart.

---

## Worker Threads

File parsing runs in a **Worker Thread** (`src/workers/import.worker.js`):

```
Main Thread                  Worker Thread
    |                             |
    |--- workerData.filePath ---> |
    |                             |-- Read CSV/XLSX (XLSX)
    |                             |-- Parse rows
    |                             |-- Normalize fields
    |                             |-- Skip invalid rows
    | <--- {records, skipped} --- |
    |                             |
    |-- Bulk upsert to MongoDB -- |
```

**Why?**
- Spreadsheet parsing is CPU-intensive and blocks the event loop.
- Worker Thread keeps the API responsive under large uploads.
- Errors in the worker are sent back via `parentPort.postMessage` and surfaced as HTTP 500.

---

## Scheduled Messages — Design Rationale

**Problem:** A simple `setTimeout()` is lost on server restart.

**Solution:**
1. Persist every scheduled message in MongoDB (`scheduledmessages` collection) with `status: "pending"` and `scheduledAt`.
2. `node-cron` runs every 30 seconds (`CRON_EXPRESSION`).
3. Each tick:
   - Finds pending messages where `scheduledAt <= now`.
   - Atomically claims each with `findOneAndUpdate({ _id, status: "pending" }, { $set: { status: "processed", processedAt: now } })`.
   - If the update returns `null`, another tick already processed it — no duplicates.
   - Logs the processed message (replace with email/push/etc. in production).

This survives restarts, scales to multiple instances (if you add a distributed lock later), and is auditable.

---

## Error Handling

Centralized in `src/middleware/error.middleware.js`:

| Code | Meaning |
|------|---------|
| 400 | Bad request (validation, missing fields) |
| 404 | Resource not found |
| 500 | Server / database / worker error |

All errors return:

```json
{
  "success": false,
  "message": "Descriptive error"
}
```

---

## Quick Test Checklist

```bash
# 1. Install deps
npm install

# 2. Add real MONGO_URI to .env

# 3. Start server
npm run dev

# 4. Upload sample CSV
curl -X POST http://localhost:5000/api/upload \
  -F "file=@../data-sheet - Node js Assesment (2) (1).csv"

# 5. Search policies
curl "http://localhost:5000/api/policies/search?username=Lura"

# 6. Aggregate policies
curl http://localhost:5000/api/policies/aggregate

# 7. Schedule a message
curl -X POST http://localhost:5000/api/messages/schedule \
  -H "Content-Type: application/json" \
  -d '{"message":"Test reminder","day":"2026-09-01","time":"10:30"}'

# 8. Test CPU monitor (optional)
#    Set CPU_THRESHOLD=10 in .env, restart, watch PM2 restart
```

---

## License

ISC