/**
 * 日志记录工具
 */

export enum LogLevel {
    ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO',
    DEBUG = 'DEBUG',
}

interface LogData {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: unknown;
    error?: {
        message: string;
        stack?: string;
        name?: string;
    };
}

export class Logger {
    /**
     * 记录日志
     */
    static log(level: LogLevel, message: string, data?: unknown): void {
        const timestamp = new Date().toISOString();
        const logData: LogData = {
            timestamp,
            level,
            message,
            ...(data && { data }),
        };
        console.log(JSON.stringify(logData));
    }

    /**
     * 记录错误
     */
    static error(message: string, error?: Error | unknown): void {
        const timestamp = new Date().toISOString();
        const logData: LogData = {
            timestamp,
            level: LogLevel.ERROR,
            message,
        };

        if (error instanceof Error) {
            logData.error = {
                message: error.message,
                stack: error.stack,
                name: error.name,
            };
        } else if (error) {
            logData.data = error;
        }

        console.error(JSON.stringify(logData));
    }

    /**
     * 记录警告
     */
    static warn(message: string, data?: unknown): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * 记录信息
     */
    static info(message: string, data?: unknown): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * 记录调试信息
     */
    static debug(message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, message, data);
    }
}
