export interface EmojiCategory {
  category: string;
  emojis: string[];
}

export const EMOJI_POOL: EmojiCategory[] = [
  {
    category: 'Work',
    emojis: ['💼', '📊', '📈', '🎯', '💡', '⚡', '🔧', '📋'],
  },
  {
    category: 'Creative',
    emojis: ['🎨', '✏️', '🎬', '📷', '🎵', '🎭'],
  },
  {
    category: 'Tech',
    emojis: ['💻', '🖥️', '🤖', '🧪', '🔬', '⚙️'],
  },
  {
    category: 'Nature',
    emojis: ['🌱', '🌊', '🏔️', '🌙', '☀️', '🌿'],
  },
  {
    category: 'Objects',
    emojis: ['📚', '🏠', '✈️', '🚀', '💎', '🎁', '🔑'],
  },
  {
    category: 'Symbols',
    emojis: ['⭐', '❤️', '🔥', '✅', '🏁', '🎲', '🎈'],
  },
  {
    category: 'Animals',
    emojis: ['🐛', '🦊', '🐙', '🦋', '🐝'],
  },
];

export const ALL_EMOJIS: string[] = EMOJI_POOL.flatMap((c) => c.emojis);

const EMOJI_KEYWORDS: Record<string, string[]> = {
  '💼': ['briefcase', 'work', 'business'],
  '📊': ['chart', 'bar', 'stats', 'analytics'],
  '📈': ['graph', 'growth', 'trending', 'up'],
  '🎯': ['target', 'goal', 'dart', 'focus'],
  '💡': ['bulb', 'idea', 'light', 'insight'],
  '⚡': ['lightning', 'bolt', 'fast', 'energy', 'power'],
  '🔧': ['wrench', 'tool', 'fix', 'repair'],
  '📋': ['clipboard', 'list', 'tasks', 'plan'],
  '🎨': ['art', 'palette', 'paint', 'design', 'creative'],
  '✏️': ['pencil', 'write', 'edit', 'draw'],
  '🎬': ['film', 'movie', 'video', 'clapper'],
  '📷': ['camera', 'photo', 'picture', 'snap'],
  '🎵': ['music', 'note', 'song', 'audio'],
  '🎭': ['theater', 'drama', 'mask', 'performance'],
  '💻': ['laptop', 'computer', 'code', 'dev'],
  '🖥️': ['desktop', 'monitor', 'screen', 'display'],
  '🤖': ['robot', 'ai', 'bot', 'automation'],
  '🧪': ['test', 'tube', 'experiment', 'lab', 'science'],
  '🔬': ['microscope', 'research', 'science', 'study'],
  '⚙️': ['gear', 'settings', 'config', 'engine'],
  '🌱': ['seedling', 'plant', 'grow', 'green', 'nature'],
  '🌊': ['wave', 'ocean', 'water', 'sea'],
  '🏔️': ['mountain', 'peak', 'summit', 'climb'],
  '🌙': ['moon', 'night', 'crescent', 'sleep'],
  '☀️': ['sun', 'sunny', 'bright', 'day'],
  '🌿': ['herb', 'leaf', 'green', 'nature'],
  '📚': ['books', 'library', 'read', 'study', 'docs'],
  '🏠': ['house', 'home', 'building'],
  '✈️': ['plane', 'travel', 'flight', 'trip'],
  '🚀': ['rocket', 'launch', 'ship', 'fast', 'startup'],
  '💎': ['gem', 'diamond', 'precious', 'quality'],
  '🎁': ['gift', 'present', 'surprise', 'reward'],
  '🔑': ['key', 'lock', 'access', 'secret', 'auth'],
  '⭐': ['star', 'favorite', 'rating', 'important'],
  '❤️': ['heart', 'love', 'favorite', 'health'],
  '🔥': ['fire', 'hot', 'trending', 'popular', 'urgent'],
  '✅': ['check', 'done', 'complete', 'approved'],
  '🏁': ['flag', 'finish', 'race', 'milestone', 'end'],
  '🎲': ['dice', 'game', 'random', 'luck'],
  '🎈': ['balloon', 'party', 'celebration', 'fun'],
  '🐛': ['bug', 'insect', 'debug', 'issue'],
  '🦊': ['fox', 'clever', 'cunning'],
  '🐙': ['octopus', 'tentacle', 'github'],
  '🦋': ['butterfly', 'transform', 'change', 'pretty'],
  '🐝': ['bee', 'busy', 'honey', 'buzz'],
};

export function getRandomEmoji(): string {
  return ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
}

export function searchEmojis(query: string): string[] {
  if (!query.trim()) return ALL_EMOJIS;
  const q = query.toLowerCase().trim();
  return ALL_EMOJIS.filter((emoji) => {
    const keywords = EMOJI_KEYWORDS[emoji] ?? [];
    return keywords.some((kw) => kw.includes(q));
  });
}
