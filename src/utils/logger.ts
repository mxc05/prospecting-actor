import { log } from 'apify';

export const logger = {
  info: (msg: string, extra?: Record<string, unknown>) => log.info(msg, extra),
  warning: (msg: string, extra?: Record<string, unknown>) => log.warning(msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => log.error(msg, extra),
  debug: (msg: string, extra?: Record<string, unknown>) => log.debug(msg, extra),
};
