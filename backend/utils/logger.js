const formatMessage = (level, message) => {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}]: ${message}`;
};

const logger = {
  info: (message) => console.log(formatMessage('info', message)),
  warn: (message) => console.warn(formatMessage('warn', message)),
  error: (message) => console.error(formatMessage('error', message)),
  debug: (message) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message));
    }
  }
};

export default logger;
