export type AppErrorCode =
  | 'NOT_CONFIGURED'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'CIRCUIT_BREAKER_OPEN'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'BALANCE_ERROR'
  | 'SERVER_ERROR'
  | 'PARSE_ERROR'
  | 'URL_ERROR'
  | 'UNSUPPORTED_ERROR'
  | 'BLOCKED_ERROR'
  | 'STORAGE_ERROR'
  | 'UNKNOWN_ERROR'

export interface AppError extends Error {
  code: AppErrorCode
  recoverable: boolean
  retryable: boolean
  originalError?: unknown
}

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  NOT_CONFIGURED: 'AI服务未配置，请在设置中配置API密钥',
  API_ERROR: 'API调用失败，请稍后重试',
  RATE_LIMIT: 'API调用配额已用尽或请求频率过高，请稍后重试',
  INVALID_RESPONSE: 'AI返回的内容格式异常，请尝试更换模型或调整输入内容后重试',
  TIMEOUT: '请求超时，请检查网络连接或稍后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络设置或代理配置',
  CIRCUIT_BREAKER_OPEN: '服务暂时不可用，请稍后重试',
  VALIDATION_ERROR: '数据验证失败，请检查输入内容',
  AUTH_ERROR: 'API密钥无效或已过期，请在设置中检查并更新API密钥',
  BALANCE_ERROR: 'API账户余额不足，请前往服务商平台充值后重试',
  SERVER_ERROR: '服务器错误，请稍后重试',
  PARSE_ERROR: '数据解析失败，请尝试重新操作',
  URL_ERROR: 'URL访问失败，请检查链接是否正确',
  UNSUPPORTED_ERROR: '不支持的操作或格式',
  BLOCKED_ERROR: '访问被阻止，请检查网络或代理设置',
  STORAGE_ERROR: '数据存储失败，请检查存储空间',
  UNKNOWN_ERROR: '发生了未知错误'
}

const RETRYABLE_CODES: Set<AppErrorCode> = new Set([
  'RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'CIRCUIT_BREAKER_OPEN', 'SERVER_ERROR'
])

const RECOVERABLE_CODES: Set<AppErrorCode> = new Set([
  'RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'CIRCUIT_BREAKER_OPEN',
  'INVALID_RESPONSE', 'PARSE_ERROR', 'SERVER_ERROR', 'BALANCE_ERROR'
])

export function createAppError(
  code: AppErrorCode,
  message?: string,
  originalError?: unknown
): AppError {
  const error = new Error(message || ERROR_MESSAGES[code]) as AppError
  error.code = code
  error.recoverable = RECOVERABLE_CODES.has(code)
  error.retryable = RETRYABLE_CODES.has(code)
  error.originalError = originalError
  return error
}

export function classifyError(error: unknown): AppError {
  if (isAppError(error)) return error

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()

    if (msg.includes('circuit breaker') || msg.includes('断路器')) {
      return createAppError('CIRCUIT_BREAKER_OPEN', undefined, error)
    }
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota') || msg.includes('频率')) {
      return createAppError('RATE_LIMIT', undefined, error)
    }
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('超时')) {
      return createAppError('TIMEOUT', undefined, error)
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('网络')) {
      return createAppError('NETWORK_ERROR', undefined, error)
    }
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key') || msg.includes('密钥')) {
      return createAppError('AUTH_ERROR', undefined, error)
    }
    if (msg.includes('402') || msg.includes('insufficient') || msg.includes('balance') || msg.includes('余额不足')) {
      return createAppError('BALANCE_ERROR', undefined, error)
    }
    if (msg.includes('403') || msg.includes('forbidden')) {
      return createAppError('AUTH_ERROR', undefined, error)
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('server')) {
      return createAppError('SERVER_ERROR', undefined, error)
    }
    if (msg.includes('json') || msg.includes('parse') || msg.includes('解析') || msg.includes('empty response')) {
      return createAppError('PARSE_ERROR', undefined, error)
    }
    if (msg.includes('storage') || msg.includes('localstorage') || msg.includes('quotaexceeded')) {
      return createAppError('STORAGE_ERROR', undefined, error)
    }
    if (msg.includes('blocked') || msg.includes('cors')) {
      return createAppError('BLOCKED_ERROR', undefined, error)
    }
    if (msg.includes('unsupported') || msg.includes('不支持')) {
      return createAppError('UNSUPPORTED_ERROR', undefined, error)
    }

    return createAppError('UNKNOWN_ERROR', error.message, error)
  }

  return createAppError('UNKNOWN_ERROR', String(error), error)
}

function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    'code' in error &&
    'recoverable' in error &&
    'retryable' in error
  )
}

export function getUserFriendlyMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message
  }
  return classifyError(error).message
}
