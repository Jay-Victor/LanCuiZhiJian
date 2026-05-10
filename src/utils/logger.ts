const IS_DEV = import.meta.env.DEV

function noop() {}

export const logger = {
  info: IS_DEV ? console.info.bind(console) : noop,
  warn: IS_DEV ? console.warn.bind(console) : noop,
  error: IS_DEV ? console.error.bind(console) : noop,
  debug: IS_DEV ? console.debug.bind(console) : noop,
  log: IS_DEV ? console.log.bind(console) : noop,
}
