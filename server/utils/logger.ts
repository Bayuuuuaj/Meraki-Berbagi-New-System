import winston from 'winston';

const { combine, timestamp, json, colorize, printf } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // 'debug' in dev
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json() // Production format (Structured JSON)
    ),
    transports: [
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? json()
                : combine(colorize(), devFormat)
        }),
        // Add file transport for errors
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
    ],
});

// Wrapper for express requests to log standardized access logs
export const logRequest = (method: string, path: string, status: number, duration: number) => {
    logger.info(`HTTP Request`, {
        method,
        path,
        status,
        duration,
        type: 'access_log'
    });
};
