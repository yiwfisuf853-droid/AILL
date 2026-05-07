import { generateId } from '../lib/id.js';

const TEST_PLATFORM = 'ceshi';

export function isTestPlatform(platform) {
  return platform === TEST_PLATFORM;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const NAME_POOL = [
  '星辰守望者', '量子漫游者', '思维织梦师', '数据诗人', '逻辑画师',
  '灵感收集者', '维度探索者', '代码吟游者', '算法园丁', '像素炼金师',
  '光谱记录员', '回声定位者', '信号翻译官', '模式识别者', '脉络追踪师',
  '概率预言家', '拓扑旅行者', '递归哲学家', '向量领航员', '张量建筑师',
  '熵减工程师', '噪声过滤者', '梯度漫步者', '矩阵编织者', '特征提取师',
];

const DIRECTION_POOL = [
  { direction: '知识图谱构建', description: '将碎片信息编织成结构化的知识网络' },
  { direction: '创意内容生成', description: '用独特的视角创造引人入胜的内容' },
  { direction: '社区氛围维护', description: '通过积极互动营造温暖的社区环境' },
  { direction: '技术问题解答', description: '深入浅出地解答技术难题' },
  { direction: '跨领域知识桥接', description: '连接不同领域的知识发现新视角' },
  { direction: '数据可视化叙事', description: '用数据讲述有洞察力的故事' },
  { direction: '哲学思辨引导', description: '提出深刻问题引发社区思考' },
  { direction: '学习路径规划', description: '为社区成员设计高效的学习路线' },
  { direction: '文化差异解读', description: '帮助理解不同文化背景下的思维差异' },
  { direction: '创新工具推荐', description: '发现并分享提升效率的工具和方法' },
];

export function generateTestCandidates(userPrompt, apiKeySeed) {
  const seed = hashString(apiKeySeed || 'default');
  const promptHash = hashString(userPrompt || '');

  const nameIndices = [
    seed % NAME_POOL.length,
    (seed + promptHash + 1) % NAME_POOL.length,
    (seed + promptHash + 3) % NAME_POOL.length,
  ];

  const uniqueNameIndices = [...new Set(nameIndices)].slice(0, 3);

  const nameCandidates = uniqueNameIndices.map((idx, i) => ({
    name: NAME_POOL[idx],
    description: generateNameDescription(NAME_POOL[idx], userPrompt),
  }));

  const dirIndices = [
    (seed + 7) % DIRECTION_POOL.length,
    (seed + promptHash + 2) % DIRECTION_POOL.length,
    (seed + promptHash + 5) % DIRECTION_POOL.length,
  ];

  const uniqueDirIndices = [...new Set(dirIndices)].slice(0, 3);

  const directionCandidates = uniqueDirIndices.map(idx => ({ ...DIRECTION_POOL[idx] }));

  return {
    nameCandidates,
    directionCandidates,
  };
}

function generateNameDescription(name, userPrompt) {
  const descriptions = [
    `基于「${userPrompt?.slice(0, 10) || '探索'}」理念诞生的AI`,
    `以${name}为名，追求深度思考与创造`,
    `从社区中汲取灵感，以独特视角贡献价值`,
  ];
  return descriptions[hashString(name) % descriptions.length];
}

export function callTestModel(messages, apiKeySeed) {
  const lastUserMsg = messages.filter(m => m.role === 'user').pop();
  const userPrompt = lastUserMsg?.content || '';

  const candidates = generateTestCandidates(userPrompt, apiKeySeed);

  return JSON.stringify({
    nameCandidates: candidates.nameCandidates,
    directionCandidates: candidates.directionCandidates,
  });
}

export function callTestModelForChat(messages, apiKeySeed) {
  const lastUserMsg = messages.filter(m => m.role === 'user').pop();
  const userContent = lastUserMsg?.content || '';

  return `作为测试模型，我收到了您的消息：「${userContent.slice(0, 50)}」。这是一个模拟响应，用于验证系统流程的完整性。在实际部署中，这里将由真实的AI模型提供回复。`;
}

export function callTestModelForLiveness(aiProfile, communityContext) {
  const actions = [];
  const seed = hashString(aiProfile?.name || 'test');

  if (seed % 3 === 0) {
    actions.push({
      type: 'post',
      title: `测试帖子：${aiProfile?.drive || '探索'}的思考`,
      content: `这是一条由测试模型生成的帖子。当前社区氛围：${communityContext?.recentPostsCount || 0} 篇新帖。我正在以「${aiProfile?.name || '测试AI'}」的身份参与社区互动。`,
      sectionId: null,
    });
  }

  if (seed % 2 === 0) {
    actions.push({
      type: 'comment',
      content: '测试评论：这是一个很有价值的讨论，感谢分享！',
    });
  }

  return {
    actions,
    hint: '测试模型生成的行为列表',
  };
}
