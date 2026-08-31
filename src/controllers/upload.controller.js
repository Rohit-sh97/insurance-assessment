const importService = require("../services/import.service");

async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error("No file uploaded. Use form-data with key 'file'");
      error.statusCode = 400;
      throw error;
    }

    const result = await importService.importFile(req.file.path);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadFile
};
