/**
 * Common API Response Formatter Middleware
 * Enforces standardized response structure — NO repeated fields:
 * {
 *   isError: boolean,
 *   success: boolean,
 *   message: string,
 *   data: <business object, no envelope keys inside>,
 *   status: number,
 *   statusCode: number
 * }
 */

// Keys that belong to the envelope and should NOT appear inside data
const ENVELOPE_KEYS = new Set(['isError', 'success', 'message', 'status', 'statusCode', 'payload', 'data']);

/**
 * Strip envelope-level keys from a flat controller response object
 * so they don't get duplicated inside `data`.
 */
const stripEnvelopeKeys = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const cleaned = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!ENVELOPE_KEYS.has(k)) cleaned[k] = v;
  }
  return cleaned;
};

const formatResponseMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Preserve swagger / api-docs responses
    if (req.originalUrl && (req.originalUrl.startsWith('/api-docs') || req.originalUrl.startsWith('/swagger'))) {
      return originalJson(body);
    }

    const statusCode = res.statusCode || 200;
    const isErrorStatus = statusCode >= 400;

    // If body is already a clean envelope (has isError + no raw business data at top level), pass through
    if (body && typeof body === 'object' && 'isError' in body && 'data' in body && !('role' in body) && !('id' in body) && !('token' in body)) {
      return originalJson(body);
    }

    let message = isErrorStatus ? 'An error occurred' : 'Success';
    let data = null;
    let isError = isErrorStatus;
    let success = !isErrorStatus;

    if (body === null || body === undefined) {
      data = null;
    } else if (Array.isArray(body)) {
      data = body;
    } else if (typeof body === 'string') {
      message = body;
      data = null;
    } else if (typeof body === 'object') {
      // Extract envelope fields from body
      if ('isError' in body) {
        isError = Boolean(body.isError);
        success = !isError;
      } else if ('success' in body) {
        success = Boolean(body.success);
        isError = !success;
      }

      if (body.message) {
        message = body.message;
      }

      // Determine what goes into data
      if ('data' in body) {
        // Controller already wrapped in data — use it as-is
        data = body.data;
      } else if ('payload' in body) {
        data = body.payload;
      } else {
        // Flat controller response — strip envelope keys so they don't duplicate
        data = stripEnvelopeKeys(body);
        if (data && Object.keys(data).length === 0) data = null;
      }
    } else {
      data = body;
    }

    const formatted = {
      isError,
      success,
      message,
      data,
      status: statusCode,
      statusCode,
    };

    return originalJson(formatted);
  };

  // Helper: success response
  res.sendSuccess = (data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      isError: false,
      success: true,
      message,
      data,
      status: statusCode,
      statusCode,
    });
  };

  // Helper: error response
  res.sendError = (message = 'An error occurred', statusCode = 500, details = null) => {
    return res.status(statusCode).json({
      isError: true,
      success: false,
      message,
      data: null,
      status: statusCode,
      statusCode,
      ...(details ? { details } : {}),
    });
  };

  next();
};

module.exports = { formatResponseMiddleware };
