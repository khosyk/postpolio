/**
 * 구조화된 로깅 시스템
 * 프로덕션 환경에서는 Winston 등 전문 로깅 라이브러리 사용 권장
 */

import { env } from '../config/env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatLog(level, message, meta);

    // 개발 환경: 콘솔 출력
    if (env.NODE_ENV !== 'production') {
      const colorMap: Record<LogLevel, string> = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        info: '\x1b[36m', // Cyan
        debug: '\x1b[90m', // Gray
      };
      const reset = '\x1b[0m';
      console.log(`${colorMap[level]}${level.toUpperCase()}${reset}`, entry);
    } else {
      // 프로덕션: JSON 형식으로 출력 (로그 수집 시스템에서 파싱)
      console.log(JSON.stringify(entry));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }
}

export const logger = new Logger();
