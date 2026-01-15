import { describe, it, expect } from 'vitest';
import logger from './logger';

describe('logger', () => {
    it('should be a valid pino logger instance', () => {
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });

    it('should log without error', () => {
        // Just verify that calling the methods doesn't throw
        expect(() => logger.info('Test info message')).not.toThrow();
        expect(() => logger.error({ err: new Error('Test error') }, 'Test error message')).not.toThrow();
    });
});
