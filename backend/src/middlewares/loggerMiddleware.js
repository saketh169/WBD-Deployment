const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');

const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const logsFolder = path.join(__dirname, '..', '..', 'logs');
const requestLogsFolder = path.join(logsFolder, 'request');
const errorLogsFolder = path.join(logsFolder, 'error');

let fileLoggingEnabled = !isServerlessRuntime;

if (fileLoggingEnabled) {
  try {
    if (!fs.existsSync(logsFolder)) {
      fs.mkdirSync(logsFolder, { recursive: true });
    }

    if (!fs.existsSync(requestLogsFolder)) {
      fs.mkdirSync(requestLogsFolder, { recursive: true });
    }

    if (!fs.existsSync(errorLogsFolder)) {
      fs.mkdirSync(errorLogsFolder, { recursive: true });
    }
  } catch (error) {
    fileLoggingEnabled = false;
  }
}

const formatDate = (time) => {
  const date = time ? new Date(time) : new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const buildLogFileName = (prefix, time) => `${prefix}-${formatDate(time)}.txt`;

const noopStream = { write: () => {} };

// Create a rotating write stream for access logs
const accessLogStream = fileLoggingEnabled
  ? rfs.createStream((time) => buildLogFileName('request', time), {
      interval: '1d', // Rotate daily
      maxFiles: 30, // Keep logs for up to 30 days
      immutable: true,
      path: requestLogsFolder
    })
  : noopStream;

// Create a rotating write stream for error logs
const errorLogStream = fileLoggingEnabled
  ? rfs.createStream((time) => buildLogFileName('error', time), {
      interval: '1d', // Rotate daily
      maxFiles: 30,
      immutable: true,
      path: errorLogsFolder
    })
  : noopStream;

// Morgan middleware for HTTP request logging
const requestLogger = morgan('combined', { stream: accessLogStream });

const errorLogger = (err, req = null) => {
  const timestamp = new Date().toISOString();
  const method = req ? req.method : 'UNKNOWN';
  const url = req ? req.originalUrl || req.url : 'N/A';
  const errorMessage = err.message || 'Unknown Error';

  const logMessage = `[${timestamp}] ERROR ${method} ${url} - ${errorMessage}\n`;

  if (fileLoggingEnabled) {
    errorLogStream.write(logMessage);
  } else {
    console.error(logMessage.trim());
  }
};

module.exports = {
  requestLogger,
  errorLogger
};
