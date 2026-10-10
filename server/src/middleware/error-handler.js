import multer from "multer";

export function errorHandler(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    const statusCode = error.code === "LIMIT_FILE_SIZE" ? 400 : 500;
    return res.status(statusCode).json({
      error: error.message,
    });
  }

  return res.status(error.statusCode || 500).json({
    error: error.message || "Unexpected server error",
    details: error.details,
  });
}
