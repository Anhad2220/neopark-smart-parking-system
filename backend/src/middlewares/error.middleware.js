/**
 * Global error handler middleware.
 * Registered LAST in app.js so it catches errors from all routes.
 * Any route/controller can call next(error) to land here.
 */

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log the stack trace in development only
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    // Show stack trace only in dev — never expose it in production
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
