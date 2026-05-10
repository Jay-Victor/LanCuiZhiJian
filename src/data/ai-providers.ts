export interface AIModel {
  id: string
  name: string
  description: string
  contextWindow: number
  maxOutput: number
  inputPrice: number
  outputPrice: number
  features: string[]
  capabilities: ('text' | 'code' | 'reasoning' | 'vision' | 'function_calling')[]
  recommended: boolean
  status: 'available' | 'deprecated' | 'beta'
}

export interface AIServiceProvider {
  id: string
  name: string
  displayName: string
  description: string
  website: string
  docsUrl: string
  category: 'international' | 'chinese' | 'open_source'
  authType: 'bearer' | 'api_key' | 'oauth'
  baseUrl: string
  models: AIModel[]
  status: 'active' | 'maintenance' | 'coming_soon'
  logoUrl?: string
}

export const aiServiceProviders: AIServiceProvider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    displayName: 'DeepSeek',
    description: '深度求索 - 高性价比AI服务商，支持推理和代码生成',
    website: 'https://www.deepseek.com',
    docsUrl: 'https://platform.deepseek.com/docs',
    category: 'chinese',
    authType: 'bearer',
    baseUrl: 'https://api.deepseek.com/v1',
    status: 'active',
    models: [
      {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek V4 Flash',
        description: '最新V4 Flash模型，高性价比',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.14,
        outputPrice: 0.28,
        features: ['长上下文', '多轮对话', '指令遵循'],
        capabilities: ['text', 'code'],
        recommended: true,
        status: 'available'
      },
      {
        id: 'deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        description: '最新V4 Pro推理模型，适合复杂逻辑推理',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.55,
        outputPrice: 2.19,
        features: ['深度推理', '思维链', '数学推理'],
        capabilities: ['text', 'reasoning', 'code'],
        recommended: false,
        status: 'available'
      }
    ]
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    displayName: 'ChatGPT',
    description: '全球领先的AI研究公司，提供GPT系列模型',
    website: 'https://openai.com',
    docsUrl: 'https://platform.openai.com/docs',
    category: 'international',
    authType: 'bearer',
    baseUrl: 'https://api.openai.com/v1',
    status: 'active',
    models: [
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        description: '新一代轻量模型，更强指令遵循',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 0.40,
        outputPrice: 1.60,
        features: ['指令遵循', '快速响应', '函数调用'],
        capabilities: ['text', 'code', 'vision', 'function_calling'],
        recommended: true,
        status: 'available'
      },
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        description: '新一代旗舰模型，更强编码和指令遵循',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 2.00,
        outputPrice: 8.00,
        features: ['指令遵循', '编码增强', '函数调用'],
        capabilities: ['text', 'code', 'vision', 'function_calling'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'gpt-5.4-mini',
        name: 'GPT-5.4 Mini',
        description: '最新GPT-5.4轻量模型，更强能力',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 0.50,
        outputPrice: 2.00,
        features: ['指令遵循', '快速响应', '函数调用'],
        capabilities: ['text', 'code', 'vision', 'function_calling'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        description: '最新GPT-5.4旗舰模型，最强性能',
        contextWindow: 256000,
        maxOutput: 16384,
        inputPrice: 2.50,
        outputPrice: 10.00,
        features: ['旗舰性能', '编码增强', '函数调用'],
        capabilities: ['text', 'code', 'vision', 'reasoning', 'function_calling'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'o4-mini',
        name: 'o4-mini',
        description: '推理模型，适合复杂问题解决',
        contextWindow: 200000,
        maxOutput: 100000,
        inputPrice: 1.10,
        outputPrice: 4.40,
        features: ['深度推理', '复杂问题', '思维链'],
        capabilities: ['text', 'code', 'reasoning'],
        recommended: false,
        status: 'available'
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    displayName: 'Claude',
    description: 'Anthropic公司开发的Claude系列模型，擅长长文本和代码',
    website: 'https://www.anthropic.com',
    docsUrl: 'https://docs.anthropic.com',
    category: 'international',
    authType: 'bearer',
    baseUrl: 'https://api.anthropic.com/v1',
    status: 'active',
    models: [
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        description: '最新Sonnet模型，平衡性能与成本',
        contextWindow: 200000,
        maxOutput: 64000,
        inputPrice: 3.00,
        outputPrice: 15.00,
        features: ['长上下文', '代码生成', '创意写作'],
        capabilities: ['text', 'code', 'vision', 'function_calling'],
        recommended: true,
        status: 'available'
      },
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        description: '最强性能模型，适合复杂任务',
        contextWindow: 200000,
        maxOutput: 32000,
        inputPrice: 15.00,
        outputPrice: 75.00,
        features: ['顶级性能', '复杂推理', '长文本理解'],
        capabilities: ['text', 'code', 'vision', 'reasoning', 'function_calling'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        description: '超快速模型，适合低延迟场景',
        contextWindow: 200000,
        maxOutput: 8192,
        inputPrice: 0.80,
        outputPrice: 4.00,
        features: ['超快响应', '低成本', '函数调用'],
        capabilities: ['text', 'code', 'vision', 'function_calling'],
        recommended: false,
        status: 'available'
      }
    ]
  },
  {
    id: 'google',
    name: 'Google',
    displayName: 'Gemini',
    description: 'Google AI提供的Gemini系列模型',
    website: 'https://ai.google.dev',
    docsUrl: 'https://ai.google.dev/docs',
    category: 'international',
    authType: 'api_key',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    status: 'active',
    models: [
      {
        id: 'gemini-3.2-flash',
        name: 'Gemini 3.2 Flash',
        description: '最新Flash模型，快速响应，支持思考模式',
        contextWindow: 1000000,
        maxOutput: 65536,
        inputPrice: 0.15,
        outputPrice: 0.60,
        features: ['超长上下文', '快速响应', '多模态', '思考模式'],
        capabilities: ['text', 'code', 'vision', 'reasoning', 'function_calling'],
        recommended: true,
        status: 'available'
      },
      {
        id: 'gemini-3.2-pro',
        name: 'Gemini 3.2 Pro',
        description: '最新旗舰模型，最强性能',
        contextWindow: 2000000,
        maxOutput: 65536,
        inputPrice: 1.25,
        outputPrice: 10.00,
        features: ['超长上下文', '顶级性能', '多模态', '思考模式'],
        capabilities: ['text', 'code', 'vision', 'reasoning', 'function_calling'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash Lite',
        description: '超轻量模型，极低成本',
        contextWindow: 1000000,
        maxOutput: 65536,
        inputPrice: 0.075,
        outputPrice: 0.30,
        features: ['超低成本', '快速响应', '多模态'],
        capabilities: ['text', 'code', 'vision', 'function_calling'],
        recommended: false,
        status: 'available'
      }
    ]
  },
  {
    id: 'doubao',
    name: 'Doubao',
    displayName: '豆包',
    description: '字节跳动旗下AI模型服务',
    website: 'https://www.volcengine.com/product/doubao',
    docsUrl: 'https://www.volcengine.com/docs/82379',
    category: 'chinese',
    authType: 'bearer',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    status: 'active',
    models: [
      {
        id: 'doubao-seed-1.6-flash',
        name: 'Doubao Seed 1.6 Flash (需填入接入点ID)',
        description: '快速模型，请在火山引擎控制台创建接入点，将接入点ID填入模型选择框',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.04,
        outputPrice: 0.08,
        features: ['低成本', '中文优化', '快速响应'],
        capabilities: ['text', 'code'],
        recommended: true,
        status: 'available'
      },
      {
        id: 'doubao-seed-1.6',
        name: 'Doubao Seed 1.6 (需填入接入点ID)',
        description: '标准模型，请在火山引擎控制台创建接入点，将接入点ID填入模型选择框',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.08,
        outputPrice: 0.16,
        features: ['中文优化', '均衡性能'],
        capabilities: ['text', 'code'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'doubao-seed-2.0-lite',
        name: 'Doubao Seed 2.0 Lite (需填入接入点ID)',
        description: '最新轻量模型，请在火山引擎控制台创建接入点，将接入点ID填入模型选择框',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPrice: 0.03,
        outputPrice: 0.06,
        features: ['最新一代', '低成本', '中文优化'],
        capabilities: ['text', 'code'],
        recommended: false,
        status: 'available'
      }
    ]
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    displayName: 'Kimi',
    description: '月之暗面旗下Kimi模型，擅长长文本处理',
    website: 'https://www.moonshot.cn',
    docsUrl: 'https://platform.moonshot.cn/docs',
    category: 'chinese',
    authType: 'bearer',
    baseUrl: 'https://api.moonshot.cn/v1',
    status: 'active',
    models: [
      {
        id: 'kimi-k2.6',
        name: 'Kimi K2.6',
        description: '最新K2.6模型，支持工具调用和长上下文',
        contextWindow: 131072,
        maxOutput: 131072,
        inputPrice: 0.06,
        outputPrice: 0.06,
        features: ['长上下文', '工具调用', '中文优化'],
        capabilities: ['text', 'code', 'function_calling'],
        recommended: true,
        status: 'available'
      },
      {
        id: 'kimi-k2.5',
        name: 'Kimi K2.5',
        description: 'K2.5模型，支持工具调用',
        contextWindow: 131072,
        maxOutput: 131072,
        inputPrice: 0.06,
        outputPrice: 0.06,
        features: ['长上下文', '工具调用', '中文优化'],
        capabilities: ['text', 'code', 'function_calling'],
        recommended: false,
        status: 'available'
      }
    ]
  },
  {
    id: 'qwen',
    name: 'Qwen',
    displayName: '通义千问',
    description: '阿里云通义千问系列模型',
    website: 'https://tongyi.aliyun.com',
    docsUrl: 'https://help.aliyun.com/document_detail/2712195.html',
    category: 'chinese',
    authType: 'bearer',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    status: 'active',
    models: [
      {
        id: 'qwen3.6-flash',
        name: 'Qwen3.6 Flash',
        description: '最新轻量模型，快速响应，性价比高',
        contextWindow: 131072,
        maxOutput: 8192,
        inputPrice: 0.02,
        outputPrice: 0.06,
        features: ['快速响应', '低成本', '中文优化'],
        capabilities: ['text', 'code'],
        recommended: true,
        status: 'available'
      },
      {
        id: 'qwen3.6-plus',
        name: 'Qwen3.6 Plus',
        description: '最新增强模型，更强能力',
        contextWindow: 131072,
        maxOutput: 16384,
        inputPrice: 0.08,
        outputPrice: 0.24,
        features: ['增强能力', '中文优化', '代码生成'],
        capabilities: ['text', 'code', 'reasoning'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'qwen3.6-max-preview',
        name: 'Qwen3.6 Max Preview',
        description: '最新旗舰模型，最强性能',
        contextWindow: 131072,
        maxOutput: 32768,
        inputPrice: 0.12,
        outputPrice: 0.36,
        features: ['顶级性能', '复杂推理', '中文优化'],
        capabilities: ['text', 'code', 'reasoning'],
        recommended: false,
        status: 'available'
      }
    ]
  },
  {
    id: 'zhipu',
    name: 'Zhipu',
    displayName: '智谱GLM',
    description: '智谱AI旗下GLM系列模型',
    website: 'https://open.bigmodel.cn',
    docsUrl: 'https://open.bigmodel.cn/dev/api',
    category: 'chinese',
    authType: 'bearer',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    status: 'active',
    models: [
      {
        id: 'glm-4.7-flash',
        name: 'GLM-4.7 Flash',
        description: '最新免费模型，快速响应',
        contextWindow: 128000,
        maxOutput: 4096,
        inputPrice: 0,
        outputPrice: 0,
        features: ['免费', '快速响应', '中文优化'],
        capabilities: ['text', 'code'],
        recommended: true,
        status: 'available'
      },
      {
        id: 'glm-4.7-flashx',
        name: 'GLM-4.7 FlashX',
        description: '增强免费模型，更强能力',
        contextWindow: 128000,
        maxOutput: 4096,
        inputPrice: 0,
        outputPrice: 0,
        features: ['免费', '增强能力', '中文优化'],
        capabilities: ['text', 'code'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'glm-5-turbo',
        name: 'GLM-5 Turbo',
        description: '最新快速模型，高性价比',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 0.01,
        outputPrice: 0.01,
        features: ['快速响应', '高性价比', '中文优化'],
        capabilities: ['text', 'code'],
        recommended: false,
        status: 'available'
      },
      {
        id: 'glm-5',
        name: 'GLM-5',
        description: '最新旗舰模型，最强性能',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPrice: 0.05,
        outputPrice: 0.05,
        features: ['旗舰性能', '复杂推理', '中文优化'],
        capabilities: ['text', 'code', 'reasoning'],
        recommended: false,
        status: 'available'
      }
    ]
  }
]

export const getProviderById = (id: string): AIServiceProvider | undefined => {
  return aiServiceProviders.find(p => p.id === id)
}

export const getModelById = (providerId: string, modelId: string): AIModel | undefined => {
  const provider = getProviderById(providerId)
  return provider?.models.find(m => m.id === modelId)
}

export const getProvidersByCategory = (category: AIServiceProvider['category']): AIServiceProvider[] => {
  return aiServiceProviders.filter(p => p.category === category)
}

export const searchModels = (query: string): { provider: AIServiceProvider; model: AIModel }[] => {
  const results: { provider: AIServiceProvider; model: AIModel }[] = []
  const lowerQuery = query.toLowerCase()
  
  aiServiceProviders.forEach(provider => {
    provider.models.forEach(model => {
      if (
        model.name.toLowerCase().includes(lowerQuery) ||
        model.description.toLowerCase().includes(lowerQuery) ||
        model.features.some(f => f.toLowerCase().includes(lowerQuery))
      ) {
        results.push({ provider, model })
      }
    })
  })
  
  return results
}

export const formatPrice = (price: number): string => {
  if (price === 0) return '免费'
  return `$${price.toFixed(2)}/1M tokens`
}

export const formatContextWindow = (tokens: number): string => {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`
  return tokens.toString()
}
