import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Simple logging utility without winston
interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

const formatMessage = (level: string, message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${args.length ? JSON.stringify(args) : ''}`;
};

const writeToFile = (filename: string, message: string) => {
  try {
    fs.appendFileSync(path.join(logsDir, filename), message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

const logger: Logger = {
  info: (message: string, ...args: any[]) => {
    const formattedMessage = formatMessage('info', message, ...args);
    if (process.env.NODE_ENV !== 'production') {
      console.log(formattedMessage);
    }
    writeToFile('combined.log', formattedMessage);
  },
  error: (message: string, ...args: any[]) => {
    const formattedMessage = formatMessage('error', message, ...args);
    if (process.env.NODE_ENV !== 'production') {
      console.error(formattedMessage);
    }
    writeToFile('error.log', formattedMessage);
    writeToFile('combined.log', formattedMessage);
  },
  warn: (message: string, ...args: any[]) => {
    const formattedMessage = formatMessage('warn', message, ...args);
    if (process.env.NODE_ENV !== 'production') {
      console.warn(formattedMessage);
    }
    writeToFile('combined.log', formattedMessage);
  },
  debug: (message: string, ...args: any[]) => {
    const formattedMessage = formatMessage('debug', message, ...args);
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formattedMessage);
    }
    writeToFile('combined.log', formattedMessage);
  }
};

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;