/**
 * Standardized API response helpers.
 * Using these keeps ALL responses in the same shape across the entire app.
 * Frontend devs always know what to expect: { success, message, data }
 */

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

module.exports = { sendSuccess, sendError };
