/** 行业 / 赛道 mock 选项（项目创建 & 项目设置面板共用） */
export const industryOptions = [
  "AI 大模型 / Agent 应用",
  "SaaS / 企业服务",
  "半导体 / 算力基础设施",
  "新能源 / 储能",
  "医疗健康 / 创新药",
  "消费零售 / 新品牌",
  "金融科技",
  "先进制造 / 机器人",
  "物流供应链",
  "跨境出海 / 全球化",
] as const;

export type IndustryOption = (typeof industryOptions)[number];
