/** Operational error that is safe to show to the client. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
  static badRequest(msg = "Bad request", details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = "Authentication required") { return new ApiError(401, msg); }
  static forbidden(msg = "You do not have permission to do this") { return new ApiError(403, msg); }
  static notFound(msg = "Not found") { return new ApiError(404, msg); }
  static conflict(msg = "Conflict") { return new ApiError(409, msg); }
}
