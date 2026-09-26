const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');

// Detect serverless environments (Vercel, AWS Lambda) where filesystem is read-only
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION
);

let accessLogStream = null;
let errorLogStream = null;

// Only initialize file-based rotating streams if NOT in a read-only serverless environment
if (!isServerless) {
  try {
    const logsFolder = path.join(__dirname, '..', '..', 'logs');
    const requestLogsFolder = path.join(logsFolder, 'request');
    const errorLogsFolder = path.join(logsFolder, 'error');

    if (!fs.existsSync(logsFolder)) {
      fs.mkdirSync(logsFolder, { recursive: true });
    }
    if (!fs.existsSync(requestLogsFolder)) {
      fs.mkdirSync(requestLogsFolder, { recursive: true });
    }
    if (!fs.existsSync(errorLogsFolder)) {
      fs.mkdirSync(errorLogsFolder, { recursive: true });
    }

    const formatDate = (time) => {
      const date = time ? new Date(time) : new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const buildLogFileName = (prefix, time) => `${prefix}-${formatDate(time)}.txt`;

    accessLogStream = rfs.createStream((time) => buildLogFileName('request', time), {
      interval: '1d', // Rotate daily
      maxFiles: 30, // Keep logs for up to 30 days
      immutable: true,
      path: requestLogsFolder
    });

    errorLogStream = rfs.createStream((time) => buildLogFileName('error', time), {
      interval: '1d', // Rotate daily
      maxFiles: 30,
      immutable: true,
      path: errorLogsFolder
    });
  } catch (err) {
    console.warn('[Logger] Read-only filesystem detected, falling back to console logger:', err.message);
    accessLogStream = null;
    errorLogStream = null;
  }
}

// Morgan middleware for HTTP request logging (file stream in container/VM, stdout in Vercel)
const requestLogger = accessLogStream 
  ? morgan('combined', { stream: accessLogStream }) 
  : morgan('dev');

// Error logger helper
const errorLogger = (err, req = null) => {
  const timestamp = new Date().toISOString();
  const method = req ? req.method : 'UNKNOWN';
  const url = req ? req.originalUrl || req.url : 'N/A';
  const errorMessage = err?.message || 'Unknown Error';
  const logMessage = `[${timestamp}] ERROR ${method} ${url} - ${errorMessage}\n`;

  if (errorLogStream) {
    try {
      errorLogStream.write(logMessage);
    } catch {
      console.error(logMessage);
    }
  } else {
    console.error(logMessage);
  }
};

module.exports = {
  requestLogger,
  errorLogger
};
