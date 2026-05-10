import { AITask } from '@/services/ai/types'

export type AITaskType = AITask

export interface CustomPrompt {
  task: AITaskType
  prompt: string
  isCustom: boolean
  version?: number
}

export interface CustomPromptsConfig {
  prompts: Record<AITaskType, CustomPrompt>
  lastUpdated: string
  schemaVersion: number
}

export interface PromptVariable {
  name: string
  description: string
  required: boolean
  defaultValue?: string
}

export interface PromptStructureRequirement {
  hasRoleDefinition: boolean
  hasOutputFormat: boolean
  hasConstraints: boolean
  hasJsonFormat: boolean
}

interface PromptValidationDetail {
  valid: boolean
  errors: string[]
  warnings: string[]
  structure: PromptStructureRequirement
}

const CURRENT_SCHEMA_VERSION = 2

const STORAGE_KEY = 'custom-ai-prompts'

export const TASK_LABELS: Record<AITaskType, string> = {
  chunk: '文本分段',
  extract: '内容提取',
  filter: '噪声过滤',
  enhance: '语义增强',
  reconstruct: '内容重构'
}

export const TASK_DESCRIPTIONS: Record<AITaskType, string> = {
  chunk: '将输入文本按照语义逻辑进行合理分段，识别主题转换点',
  extract: '从文本中提取核心信息、关键数据和主要论点',
  filter: '清理和优化文本内容，剔除废话、套话和无关内容',
  enhance: '深度分析文本内容，识别偏见、逻辑漏洞并提出反观点',
  reconstruct: '将处理后的信息整合为结构化内容，生成摘要和洞察'
}

export const TASK_VARIABLES: Record<AITaskType, PromptVariable[]> = {
  chunk: [
    { name: 'minChunkSize', description: '单段最小字数', required: false, defaultValue: '200' },
    { name: 'maxChunkSize', description: '单段最大字数', required: false, defaultValue: '800' },
    { name: 'keywordCount', description: '关键词数量', required: false, defaultValue: '3-5' }
  ],
  extract: [
    { name: 'mainPointCount', description: '核心观点数量', required: false, defaultValue: '3-5' },
    { name: 'includeSources', description: '是否包含溯源信息', required: false, defaultValue: 'true' }
  ],
  filter: [
    { name: 'noiseThreshold', description: '噪音判定阈值', required: false, defaultValue: '0.3' },
    { name: 'removedContentCount', description: '记录移除内容条数', required: false, defaultValue: '3-5' }
  ],
  enhance: [
    { name: 'maxCounterArguments', description: '最大反观点数量', required: false, defaultValue: '5' },
    { name: 'analysisDepth', description: '分析深度(浅/中/深)', required: false, defaultValue: '中' }
  ],
  reconstruct: [
    { name: 'sectionCount', description: '章节数量范围', required: false, defaultValue: '2-4' },
    { name: 'insightCount', description: '洞察数量范围', required: false, defaultValue: '3-5' },
    { name: 'recommendationCount', description: '建议数量范围', required: false, defaultValue: '3-5' }
  ]
}

export const DEFAULT_PROMPTS: Record<AITaskType, string> = {
  chunk: `你是一位资深文本结构分析师，专长于识别文本的语义边界与主题转换。你的工作是将输入文本按语义逻辑分段，为后续的信息提取和降噪处理提供结构化基础。

## 目标
识别文本中主题发生转换的位置，在语义变化处进行分段，确保每个段落围绕单一主题完整展开。

## 执行步骤
1. 通读全文，识别整体主题脉络和论述结构
2. 标记主题转换点：关注转折词（然而、但是、此外）、段落缩进、小标题等信号
3. 在转换点处切分，确保每段主题一致、论述完整
4. 为每段提炼主题概括和核心关键词

## 分段规则
- 主题一致性：每段围绕单一主题，避免一段内混杂多个论点
- 语义完整性：段落包含完整论述，不截断句子或论据
- 长度适中：单段200-800字为宜，过长段落考虑按子论点拆分
- 结构保留：列表、代码块、引用块等保持原有结构不被拆散

## 边界处理
- 若全文仅一个主题，返回单个chunk
- 若段落间过渡模糊，优先保持论述完整性
- 若文本为对话或问答格式，按问答对分段

## 输出格式
仅输出合法JSON，不要包含markdown标记、解释文字或任何JSON之外的内容：
{
  "chunks": [
    {
      "content": "段落完整原文内容",
      "topic": "主题概括（10字以内）",
      "keywords": ["关键词1", "关键词2", "关键词3"]
    }
  ]
}

## 约束
- keywords包含3-5个最能代表该段落内容的核心词
- topic必须简洁，概括段落核心论点而非描述段落内容
- content必须保留原文完整表述，不可改写或省略`,

  extract: `你是一位资深信息提取分析师，专长于从结构化文本段落中精准提取核心观点、关键数据和论证逻辑。你的工作是为后续的降噪过滤和批判性分析提供结构化的信息基础。

## 输入说明
你将收到经过语义分段处理的文本，每段以 [索引号] 标记开头。请基于这些分段文本进行信息提取，索引号用于溯源定位。

## 目标
从已分段的文本中提取核心观点、量化数据、主要结论，并建立观点与原文的溯源关系。

## 执行步骤
1. 逐段审读，识别每段的核心论点和支撑论据
2. 提取所有量化数据（数字、日期、百分比、金额等），标注数据类型和来源
3. 归纳全文的主要结论和发现
4. 为每个核心观点标注原文出处，确保可溯源

## 提取规则
- 核心观点：提取3-5个最重要的观点，保持原文表述，不进行改写或解读
- 关键数据：识别所有量化信息，标注类型和来源段落索引
- 主要结论：总结作者明确提出的结论，区分事实陈述与观点表达
- 观点溯源：每个观点关联到具体的段落索引和原文句子

## 边界处理
- 若文本无量化数据，keyData返回空数组
- 若观点与结论重叠，结论侧重于作者的最终判断，观点侧重于论证过程中的关键主张
- 若无法确定chunkIndex，使用-1标注

## 输出格式
仅输出合法JSON，不要包含markdown标记、解释文字或任何JSON之外的内容：
{
  "mainPoints": [
    "核心观点1（保持原文表述）",
    "核心观点2",
    "核心观点3"
  ],
  "keyData": [
    {
      "type": "数据类型（日期/金额/百分比/数量/比率）",
      "value": "具体数值（保持原文格式）",
      "source": "来源段落索引或描述"
    }
  ],
  "conclusions": [
    "主要结论1",
    "主要结论2"
  ],
  "sources": [
    {
      "point": "观点内容",
      "chunkIndex": 0,
      "text": "原文引用（精确到句子级别）"
    }
  ]
}

## 约束
- mainPoints按重要性从高到低排列
- sources中的text必须为原文精确引用，不可改写
- chunkIndex对应分段阶段输出的段落序号`,

  filter: `你是一位资深文本降噪分析师，专长于识别和剔除文本中的冗余信息，同时保留核心论点和逻辑结构。你的工作是对文本进行信息密度优化，为后续的批判性分析提供高质量的文本基础。

## 输入说明
你将收到原始未处理文本。请直接对此文本进行降噪分析，无需考虑分段结构。

## 目标
识别并移除文本中的冗余和低信息量内容，保留核心信息与逻辑骨架，输出信息密度更高的清洁文本。

## 执行步骤
1. 通读全文，识别文本的核心论点和逻辑主线
2. 逐句评估信息价值，标记冗余和低信息量内容
3. 移除标记内容，确保剩余文本逻辑连贯
4. 计算噪音比例，记录典型移除内容

## 过滤标准
移除以下类型的内容：
- 重复表述：同一观点用不同措辞反复陈述
- 空洞修饰：无实质信息的形容词堆砌和情绪性表达
- 冗余过渡：与主题无关的客套话、寒暄和铺垫
- 偏离主题：与核心论点无直接关联的背景信息

保留以下类型的内容：
- 核心论点及其直接支撑论据
- 量化数据和具体事实
- 专业术语和技术概念
- 逻辑连接词和论证结构标记

## 边界处理
- 移除内容后需确保句子间逻辑连贯，必要时补充简短过渡
- 若文本本身信息密度已很高，noiseRatio应接近0
- 若文本大量为冗余内容，cleanedText可能显著短于原文

## 输出格式
仅输出合法JSON，不要包含markdown标记、解释文字或任何JSON之外的内容：
{
  "cleanedText": "清理优化后的完整文本（保持原文逻辑结构和论证顺序）",
  "noiseRatio": 0.3,
  "removedContent": [
    {
      "type": "重复表述/空洞修饰/冗余过渡/偏离主题",
      "content": "被移除的典型内容示例",
      "reason": "移除原因简述"
    }
  ]
}

## 约束
- cleanedText必须保持原文的论证逻辑和结构顺序，不可重新组织
- noiseRatio为0到1之间的数值，0表示无噪音，1表示全文为噪音
- removedContent记录3-5条典型移除内容，非全部移除内容
- 若无需移除任何内容，removedContent返回空数组，noiseRatio为0`,

  enhance: `你是一位资深批判性思维分析师，专长于识别文本中的认知偏差、逻辑谬误和论证缺陷。你的工作是对文本进行深度批判性分析，为最终的内容重构提供多元视角和深度洞察。

## 输入说明
你将收到经过降噪过滤处理的清洁文本，冗余内容已被移除，信息密度较高。请基于此清洁文本进行批判性分析。

## 目标
识别文本中的偏见倾向和逻辑漏洞，提出有建设性的反观点，帮助读者形成更全面、更客观的认知。

## 执行步骤
1. 识别立场倾向：判断作者是否存在明显的立场偏好或选择性呈现
2. 检验论证逻辑：逐条审查论证过程，识别逻辑谬误和推理缺陷
3. 构建反观点：针对核心论点提出有理有据的替代视角
4. 评估可靠性：判断证据充分性和结论合理性

## 分析维度
偏见识别：
- 立场偏见：作者是否只呈现支持自身立场的证据
- 选择性遗漏：是否忽略了重要的反面证据或替代解释
- 情感操控：是否使用煽动性语言替代理性论证

逻辑分析：
- 因果谬误：相关性是否被错误表述为因果性
- 以偏概全：个别案例是否被推广为普遍结论
- 稻草人谬误：是否歪曲对立观点后再加以反驳
- 诉诸权威：是否仅凭权威身份而非证据支撑论点

## 边界处理
- 若文本论证严谨、无明显偏见或谬误，对应字段返回空数组
- 反观点应具有建设性，提供替代视角而非简单否定
- 保持分析客观中立，避免过度解读或牵强附会

## 输出格式
仅输出合法JSON，不要包含markdown标记、解释文字或任何JSON之外的内容：
{
  "biases": [
    {
      "type": "立场偏见/选择性遗漏/情感操控/其他",
      "content": "偏见的具体表现（引用原文）",
      "explanation": "为何构成偏见的分析说明"
    }
  ],
  "logicalFallacies": [
    {
      "type": "因果谬误/以偏概全/稻草人/诉诸权威/其他",
      "content": "谬误的具体表现（引用原文）",
      "explanation": "为何构成逻辑谬误的分析说明"
    }
  ],
  "counterArguments": [
    {
      "originalPoint": "原文中的原始论点",
      "counterPoint": "针对该论点的反观点",
      "evidence": "支撑反观点的理据或证据方向"
    }
  ]
}

## 约束
- biases和logicalFallacies如未发现对应问题，返回空数组
- counterArguments至少提供1条有价值的替代视角，最多5条
- content和originalPoint应尽量引用原文表述，确保分析有据可依`,

  reconstruct: `你是一位资深内容重构分析师，专长于将多维度分析结果整合为结构清晰、信息密度高的内容。你的工作是将前序阶段的分析成果——分段信息、核心观点、降噪文本和批判性洞察——融合为一份完整的结构化内容。

## 输入说明
你将收到以下前序分析结果，请综合运用：
1. 原始段落摘要：包含各段主题和内容概要，附索引号
2. 核心观点：从文本中提取的主要论点列表
3. 主要结论：作者的核心判断和发现
4. 清理后文本摘要：降噪后的高密度文本片段
5. 反观点：针对原文论点的替代视角和反论

## 目标
整合前序分析结果，生成结构化的内容报告，包含标题、摘要、章节组织、深度洞察和实用建议。

## 执行步骤
1. 审视输入的所有分析数据，把握全文核心主题和论证脉络
2. 提炼最能概括全文的标题和摘要
3. 按逻辑顺序组织章节，每个章节聚焦一个主题维度
4. 从批判性分析结果中提炼深度洞察
5. 基于洞察和反观点，提出具体可行的建议

## 重构规则
标题：不超过20字，准确反映核心主题，避免夸张和模糊
摘要：100字以内，涵盖核心论点、关键数据和主要结论
章节：2-4个，按逻辑顺序组织，每个章节包含标题、正文和要点
洞察：从前序批判性分析中提炼，非简单复述原文，需提供新视角
建议：基于洞察提出，具体可行，有明确的行动方向

## 边界处理
- 若输入数据较少，章节可缩减为2个，洞察和建议各2-3条
- 若前序分析未发现偏见或谬误，洞察侧重于文本的核心价值和关键发现
- 建议应面向读者可能的行动需求，非对作者的写作建议

## 输出格式
仅输出合法JSON，不要包含markdown标记、解释文字或任何JSON之外的内容：
{
  "title": "内容标题（不超过20字）",
  "summary": "内容摘要（100字以内，涵盖核心论点和关键结论）",
  "sections": [
    {
      "heading": "章节标题",
      "content": "章节正文（整合相关论点和论据的连贯叙述）",
      "keyPoints": [
        "关键要点1",
        "关键要点2",
        "关键要点3"
      ]
    }
  ],
  "insights": [
    "深度洞察1（基于批判性分析的新视角）",
    "深度洞察2"
  ],
  "recommendations": [
    "实用建议1（具体可行的行动方向）",
    "实用建议2"
  ]
}

## 约束
- sections按逻辑顺序排列，首章通常为核心论点概述，末章为展望或建议
- insights提供3-5条深度洞察，每条应超越原文表层信息
- recommendations提供3-5条实用建议，每条应明确具体、可操作
- 所有内容必须可追溯到原始信息，不可编造或臆测`
}

export function getCustomPrompts(): CustomPromptsConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const config = JSON.parse(data) as CustomPromptsConfig
      if (config.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        return migrateConfig(config)
      }
      return config
    }
  } catch {
    // ignore
  }

  return {
    prompts: createDefaultPromptsConfig(),
    lastUpdated: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION
  }
}

function migrateConfig(config: CustomPromptsConfig): CustomPromptsConfig {
  const tasks: AITaskType[] = ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
  const migrated = { ...config, schemaVersion: CURRENT_SCHEMA_VERSION }

  tasks.forEach(task => {
    if (!migrated.prompts[task]) {
      migrated.prompts[task] = {
        task,
        prompt: DEFAULT_PROMPTS[task],
        isCustom: false,
        version: CURRENT_SCHEMA_VERSION
      }
    } else {
      if (!migrated.prompts[task].isCustom) {
        migrated.prompts[task].prompt = DEFAULT_PROMPTS[task]
      }
      migrated.prompts[task].version = CURRENT_SCHEMA_VERSION
    }
  })

  saveCustomPrompts(migrated.prompts)
  return migrated
}

function createDefaultPromptsConfig(): Record<AITaskType, CustomPrompt> {
  const tasks: AITaskType[] = ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
  const config: Record<AITaskType, CustomPrompt> = {} as Record<AITaskType, CustomPrompt>

  tasks.forEach(task => {
    config[task] = {
      task,
      prompt: DEFAULT_PROMPTS[task],
      isCustom: false,
      version: CURRENT_SCHEMA_VERSION
    }
  })

  return config
}

export function saveCustomPrompts(prompts: Record<AITaskType, CustomPrompt>): void {
  const config: CustomPromptsConfig = {
    prompts,
    lastUpdated: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function saveSinglePrompt(task: AITaskType, prompt: string): void {
  const config = getCustomPrompts()
  config.prompts[task] = {
    task,
    prompt,
    isCustom: prompt !== DEFAULT_PROMPTS[task],
    version: CURRENT_SCHEMA_VERSION
  }
  saveCustomPrompts(config.prompts)
}

export function resetPromptToDefault(task: AITaskType): void {
  const config = getCustomPrompts()
  config.prompts[task] = {
    task,
    prompt: DEFAULT_PROMPTS[task],
    isCustom: false,
    version: CURRENT_SCHEMA_VERSION
  }
  saveCustomPrompts(config.prompts)
}

export function resetAllPromptsToDefault(): void {
  saveCustomPrompts(createDefaultPromptsConfig())
}

export function getPromptForTask(task: AITaskType): string {
  const config = getCustomPrompts()
  return config.prompts[task]?.prompt || DEFAULT_PROMPTS[task]
}

export function isPromptCustom(task: AITaskType): boolean {
  const config = getCustomPrompts()
  return config.prompts[task]?.isCustom || false
}

export function getPromptVersion(task: AITaskType): number {
  const config = getCustomPrompts()
  return config.prompts[task]?.version || 1
}

export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: '提示词不能为空' }
  }

  if (prompt.length < 50) {
    return { valid: false, error: '提示词内容过短，建议至少50个字符' }
  }

  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(prompt)) {
      return { valid: false, error: '提示词包含不允许的内容' }
    }
  }

  return { valid: true }
}

export function validatePromptStructure(prompt: string): PromptValidationDetail {
  const errors: string[] = []
  const warnings: string[] = []

  const basicValidation = validatePrompt(prompt)
  if (!basicValidation.valid) {
    return {
      valid: false,
      errors: [basicValidation.error!],
      warnings: [],
      structure: {
        hasRoleDefinition: false,
        hasOutputFormat: false,
        hasConstraints: false,
        hasJsonFormat: false
      }
    }
  }

  const hasRoleDefinition = /你是一位|你是|作为/.test(prompt)
  const hasOutputFormat = /输出格式|输出要求|返回格式/.test(prompt)
  const hasConstraints = /约束|限制|注意|要求/.test(prompt)
  const hasJsonFormat = /JSON|json/.test(prompt)

  if (!hasRoleDefinition) {
    warnings.push('建议包含角色定义（如"你是一位..."），有助于AI理解任务定位')
  }

  if (!hasOutputFormat) {
    warnings.push('建议包含输出格式说明，确保AI返回结构化数据')
  }

  if (!hasJsonFormat) {
    warnings.push('建议要求JSON格式输出，便于程序解析处理')
  }

  if (!hasConstraints) {
    warnings.push('建议包含约束条件，限制AI输出的范围和规范')
  }

  const jsonExampleMatch = prompt.match(/\{[\s\S]*\}/)
  if (hasJsonFormat && !jsonExampleMatch) {
    errors.push('要求JSON输出但未提供JSON示例格式')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    structure: {
      hasRoleDefinition,
      hasOutputFormat,
      hasConstraints,
      hasJsonFormat
    }
  }
}

export function interpolatePrompt(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(escapeRegExp(placeholder), 'g'), String(value))
  }

  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const taskVars = Object.values(TASK_VARIABLES).flat()
    const varDef = taskVars.find(v => v.name === varName)
    if (varDef?.defaultValue) {
      return varDef.defaultValue
    }
    return match
  })

  return result
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractPromptVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}

export function getPromptWithVariables(task: AITaskType, variables?: Record<string, string | number>): string {
  const prompt = getPromptForTask(task)
  return interpolatePrompt(prompt, variables || {})
}
