import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Structured Logger using Pino.
 * - In Production: JSON logs (standard for CloudWatch/Vercel/DataDog).
 * - In Development: Pretty-printed logs for readability.
 */
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                ignore: 'pid,hostname',
                translateTime: 'SYS:standard',
            },
        },
    base: {
        env: process.env.NODE_ENV,
        revision: process.env.VERCEL_GIT_COMMIT_SHA,
    },
});

export default logger;
