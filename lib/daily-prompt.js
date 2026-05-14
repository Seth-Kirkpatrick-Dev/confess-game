const PROMPT_CATEGORIES = [
  'Workplace', 'Family', 'School', 'Travel', 'Relationships',
  'Embarrassing', 'Childhood', 'Money', 'Friendship', 'Pet Peeves',
];

const PROMPT_EMOJIS = {
  Workplace: '💼', Family: '🏠', School: '📚', Travel: '✈️', Relationships: '💕',
  Embarrassing: '😳', Childhood: '🧸', Money: '💰', Friendship: '🤝', 'Pet Peeves': '😤',
};

export function getTodayPrompt() {
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const category = PROMPT_CATEGORIES[daysSinceEpoch % PROMPT_CATEGORIES.length];
  return { category, emoji: PROMPT_EMOJIS[category] };
}
