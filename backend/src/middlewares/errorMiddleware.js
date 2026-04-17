const { errorLogger } = require('./loggerMiddleware');

// Custom error class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', 401);

// Send error response in development
const sendErrorDev = (err, req, res) => {
    return res.status(err.statusCode).json({
        success: false,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

// Send error response in production
const sendErrorProd = (err, req, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
};

// Global error handler
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log the error using errorLogger from loggerMiddleware
    errorLogger(err, req);

    // Handle Multer file upload errors first (before dev/prod split)
    if (err.name === 'MulterError') {
        const multerMessages = {
            LIMIT_FILE_SIZE: `File too large: "${err.field}" exceeds the 10MB limit. Please upload a smaller file.`,
            LIMIT_UNEXPECTED_FILE: `Unexpected file field: "${err.field}". Please use the correct upload field.`,
        };
        const message = multerMessages[err.code] || `File upload error: ${err.message}`;
        return res.status(400).json({ success: false, name: 'MulterError', code: err.code, field: err.field, message });
    }

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Handle specific MongoDB/Mongoose errors
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
};

// 404 Not Found handler
const notFoundHandler = (req, res, next) => {
    const err = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(err);
};

// Async error handler wrapper
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Unhandled promise rejection handler
const handleUnhandledRejection = () => {
    process.on('unhandledRejection', (err, promise) => {
        console.log('UNHANDLED REJECTION! 💥 Shutting down...');
        console.log(err.name, err.message);
        errorLogger(err);
        process.exit(1);
    });
};

// Uncaught exception handler
const handleUncaughtException = () => {
    process.on('uncaughtException', (err) => {
        console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
        console.log(err.name, err.message);
        errorLogger(err);
        process.exit(1);
    });
};

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
    catchAsync,
    handleUnhandledRejection,
    handleUncaughtException
};
