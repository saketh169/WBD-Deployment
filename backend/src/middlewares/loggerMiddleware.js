const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');

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

// Create a rotating write stream for access logs
const accessLogStream = rfs.createStream((time) => buildLogFileName('request', time), {
  interval: '1d', // Rotate daily
  maxFiles: 30, // Keep logs for up to 30 days
  immutable: true,
  path: requestLogsFolder
});

// Create a rotating write stream for error logs
const errorLogStream = rfs.createStream((time) => buildLogFileName('error', time), {
  interval: '1d', // Rotate daily
  maxFiles: 30,
  immutable: true,
  path: errorLogsFolder
});

// Morgan middleware for HTTP request logging
const requestLogger = morgan('combined', { stream: accessLogStream });

const errorLogger = (err, req = null) => {
  const timestamp = new Date().toISOString();
  const method = req ? req.method : 'UNKNOWN';
  const url = req ? req.originalUrl || req.url : 'N/A';
  const errorMessage = err.message || 'Unknown Error';

  const logMessage = `[${timestamp}] ERROR ${method} ${url} - ${errorMessage}\n`;

  errorLogStream.write(logMessage);
};

module.exports = {
  requestLogger,
  errorLogger
};
