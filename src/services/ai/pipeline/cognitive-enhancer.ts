import { AIProvider, EnhancedResult, Bias, LogicalFallacy, CounterArgument } from '../types'
import { getPromptWithVariables } from '@/services/prompts/custom-prompts'
import { validateEnhanceResult } from '../utils/result-validator'

interface StageResult<T> {
  data: T
  validation: {
    valid: boolean
    errors: Array<{ path: string; message: string; value: unknown }>
    warnings: Array<{ path: string; message: string; suggestion: string }>
    sanitized: boolean
  }
}

const BIAS_PATTERNS: Array<{ pattern: RegExp; type: string; explanation: string }> = [
  { pattern: /(?:绝对|一定|必然|毫无疑问|毋庸置疑|当然)/g, type: '绝对化表述', explanation: '使用绝对化语言可能忽略了例外情况和条件性' },
  { pattern: /(?:所有人都知道|大家都在说|众所周知|显而易见)/g, type: '从众效应', explanation: '诉诸大众观点而非证据本身' },
  { pattern: /(?:专家表示|权威人士|著名学者|据内部人士)/g, type: '诉诸权威', explanation: '依赖权威而非具体证据支撑论点' },
  { pattern: /(?:不得不|只能|别无选择|唯一的办法)/g, type: '虚假二分', explanation: '将复杂问题简化为仅有的两种选择' },
  { pattern: /(?:一直都是|自古以来|历来如此|传统上)/g, type: '诉诸传统', explanation: '以传统做法作为正当性依据而非实际效果' },
  { pattern: /(?:说白了|说白了就是|其实就是|无非就是)/g, type: '过度简化', explanation: '将复杂问题过度简化' }
]

const FALLACY_PATTERNS: Array<{ pattern: RegExp; type: string; explanation: string }> = [
  { pattern: /(?:你又是怎么知道的|你自己不也|你有什么资格)/g, type: '人身攻击', explanation: '攻击对方个人而非其论点本身' },
  { pattern: /(?:要么[。，,]要么|不是[。，,]就是|只有两种可能)/g, type: '虚假二分谬误', explanation: '将问题简化为仅有两个极端选项' },
  { pattern: /(?:滑坡|一旦开始|接下来就会|最终导致)/g, type: '滑坡谬误', explanation: '假设一系列因果链而缺乏充分证据' },
  { pattern: /(?:没人能证明不是|无法反驳|你无法证明)/g, type: '诉诸无知', explanation: '因对方无法证伪而声称命题为真' },
  { pattern: /(?:之后[。，,]因此|在那之后|自从[。，,]就)/g, type: '事后归因', explanation: '仅因时间先后顺序就断定因果关系' },
  { pattern: /(?:如果[。，,]那么一定|只要[。，,]就一定会)/g, type: '过度概括', explanation: '从有限案例推广到普遍结论' }
]

export class CognitiveEnhancer {
  constructor(private aiProvider: AIProvider, private model?: string) {}
  
  async enhance(text: string, signal?: AbortSignal): Promise<StageResult<EnhancedResult>> {
    if (!text || text.trim().length === 0) {
      return {
        data: { biases: [], logicalFallacies: [], counterArguments: [] },
        validation: { valid: true, errors: [], warnings: [], sanitized: false }
      }
    }
    
    const result = await this.aiProvider.processText<EnhancedResult>(
      text,
      {
        task: 'enhance',
        customPrompt: getPromptWithVariables('enhance'),
        model: this.model,
        temperature: 0.6,
        maxTokens: 4096,
        signal
      }
    )
    
    if (!result.success || !result.data) {
      const fallbackData = this.ruleBasedEnhance(text)
      return {
        data: fallbackData,
        validation: {
          valid: false,
          errors: [{ path: 'root', message: result.error || 'AI处理失败，使用规则降级结果', value: null }],
          warnings: [{ path: 'enhancedResult', message: '使用基于规则的降级分析替代AI增强', suggestion: '检查AI服务配置后重试以获得更准确的分析' }],
          sanitized: true
        }
      }
    }
    
    const { result: validatedData, validation } = validateEnhanceResult(result.data)
    return { data: validatedData, validation }
  }

  private ruleBasedEnhance(text: string): EnhancedResult {
    const biases: Bias[] = []
    const logicalFallacies: LogicalFallacy[] = []
    const counterArguments: CounterArgument[] = []

    for (const { pattern, type, explanation } of BIAS_PATTERNS) {
      const matches = text.match(pattern)
      if (matches) {
        for (const match of matches.slice(0, 3)) {
          biases.push({ type, content: match, explanation })
        }
      }
    }

    for (const { pattern, type, explanation } of FALLACY_PATTERNS) {
      const matches = text.match(pattern)
      if (matches) {
        for (const match of matches.slice(0, 3)) {
          logicalFallacies.push({ type, content: match, explanation })
        }
      }
    }

    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 10)
    const claimPatterns = /(?:认为|主张|表明|说明|证明|意味着|表明了|显示出)/
    for (const sentence of sentences.slice(0, 3)) {
      if (claimPatterns.test(sentence)) {
        const trimmed = sentence.trim()
        counterArguments.push({
          originalPoint: trimmed,
          counterPoint: `可从相反角度审视该观点：${trimmed.replace(claimPatterns, '的反对者认为')}存在其他可能性`,
          evidence: '建议查阅多方面资料验证此观点的合理性'
        })
      }
    }

    return {
      biases: biases.slice(0, 5),
      logicalFallacies: logicalFallacies.slice(0, 5),
      counterArguments: counterArguments.slice(0, 3)
    }
  }
}
