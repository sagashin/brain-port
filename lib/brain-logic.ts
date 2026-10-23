export interface RadarStats {
  calculation: number; // 計算力 (0-100)
  memory: number;      // 記憶力 (0-100)
  attention: number;   // 注意力 (0-100)
  vocabulary: number;  // 漢字・語彙 (0-100)
  knowledge: number;   // 教養・知識 (0-100)
}

export interface ScoreHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  mode: string;
  score: number;
  comboMax: number;
}

export interface KanjiQuestion {
  id: string;
  category: '難読漢字の読み' | '四字熟語の穴埋め' | '同音異義語の使い分け';
  prompt: string;
  targetWord: string;
  reading?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  example: string;
  isAiGenerated?: boolean;
}

export interface TriviaQuestion {
  id: string;
  genre: '科学' | '歴史' | '日常の豆知識' | 'IT' | '文化';
  question: string;
  title: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  column: string;
  isAiGenerated?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  url: string;
  keyword: string;
  distractors: string[];
}

export interface NewsClozeQuestion {
  articleId: string;
  maskedTitle: string;
  originalTitle: string;
  summary: string;
  url: string;
  category: string;
  publishedAt: string;
  correctKeyword: string;
  options: string[];
  correctIndex: number;
}

export interface UserSaveData {
  streak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
  completedDates: string[]; // list of YYYY-MM-DD when Daily Course or any training was completed
  dailyStampDates: string[]; // list of YYYY-MM-DD when Daily 5-Min Course was completed
  stats: RadarStats;
  unlockedKanjiIds: string[];
  unlockedTriviaIds: string[];
  customKanjiQuestions: KanjiQuestion[];
  customTriviaQuestions: TriviaQuestion[];
  scoreHistory: ScoreHistoryEntry[];
  soundEnabled: boolean;
}

export const INITIAL_SAVE_DATA: UserSaveData = {
  streak: 3,
  lastPlayedDate: null,
  completedDates: [],
  dailyStampDates: [],
  stats: {
    calculation: 54,
    memory: 58,
    attention: 52,
    vocabulary: 62,
    knowledge: 60,
  },
  unlockedKanjiIds: ['kanji-1', 'kanji-2'],
  unlockedTriviaIds: ['trivia-1', 'trivia-2'],
  customKanjiQuestions: [],
  customTriviaQuestions: [],
  scoreHistory: [],
  soundEnabled: true,
};

/**
 * Formats a Date object as local YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates combo multiplier from current consecutive correct count.
 * 0-1: 1.0x, 2-3: 1.2x, 4-5: 1.5x, 6-8: 2.0x, 9+: 2.5x
 */
export function getComboMultiplier(combo: number): number {
  if (combo >= 9) return 2.5;
  if (combo >= 6) return 2.0;
  if (combo >= 4) return 1.5;
  if (combo >= 2) return 1.2;
  return 1.0;
}

/**
 * Calculates points earned for a single correct answer given base points, combo, and remaining time bonus.
 */
export function calculateAnswerScore(basePoints: number, combo: number, speedBonus = 0): number {
  const mult = getComboMultiplier(combo);
  return Math.round((basePoints + Math.max(0, speedBonus)) * mult);
}

/**
 * Updates radar stats clamping between 15 and 100
 */
export function updateRadarStat(
  stats: RadarStats,
  key: keyof RadarStats,
  delta: number
): RadarStats {
  const nextVal = Math.max(15, Math.min(100, Math.round(stats[key] + delta)));
  return {
    ...stats,
    [key]: nextVal,
  };
}

/**
 * Updates streak and completedDates when a session is finished on `todayKey` (YYYY-MM-DD).
 */
export function recordDailyActivity(
  data: UserSaveData,
  todayKey: string,
  isDailyCourse: boolean
): UserSaveData {
  const completedDates = data.completedDates.includes(todayKey)
    ? data.completedDates
    : [...data.completedDates, todayKey];

  const dailyStampDates =
    isDailyCourse && !data.dailyStampDates.includes(todayKey)
      ? [...data.dailyStampDates, todayKey]
      : data.dailyStampDates;

  let nextStreak = data.streak;
  if (data.lastPlayedDate !== todayKey) {
    if (!data.lastPlayedDate) {
      nextStreak = Math.max(1, data.streak + 1);
    } else {
      const last = new Date(`${data.lastPlayedDate}T00:00:00`);
      const curr = new Date(`${todayKey}T00:00:00`);
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        nextStreak = data.streak + 1;
      } else if (diffDays > 1) {
        nextStreak = 1;
      }
    }
  }

  return {
    ...data,
    streak: nextStreak,
    lastPlayedDate: todayKey,
    completedDates,
    dailyStampDates,
  };
}

// ==========================================
// 1. 色彩ストループ脳トレ (Stroop Attention Game)
// ==========================================
export interface StroopColorItem {
  id: 'red' | 'blue' | 'green' | 'yellow';
  label: string;      // ひらがな表記
  kanjiLabel: string; // 漢字表記
  hex: string;        // 表示カラー
}

export const STROOP_COLORS: StroopColorItem[] = [
  { id: 'red', label: 'あか', kanjiLabel: '赤', hex: '#EF4444' },
  { id: 'blue', label: 'あお', kanjiLabel: '青', hex: '#3B82F6' },
  { id: 'green', label: 'みどり', kanjiLabel: '緑', hex: '#10B981' },
  { id: 'yellow', label: 'きいろ', kanjiLabel: '黄', hex: '#F59E0B' },
];

export interface StroopRound {
  mode: 'MEANING' | 'COLOR'; // MEANING = 文字の意味, COLOR = 文字の色
  wordItem: StroopColorItem; // 文字そのもの
  inkItem: StroopColorItem;  // 塗られている色
  correctColorId: StroopColorItem['id'];
  options: StroopColorItem[];
}

export function generateStroopRound(randomFn: () => number = Math.random): StroopRound {
  const mode: 'MEANING' | 'COLOR' = randomFn() < 0.5 ? 'MEANING' : 'COLOR';
  const wordIdx = Math.floor(randomFn() * STROOP_COLORS.length);
  // 必ず文字の意味と異なる色にする（ストループ効果）
  let inkIdx = Math.floor(randomFn() * (STROOP_COLORS.length - 1));
  if (inkIdx >= wordIdx) inkIdx += 1;

  const wordItem = STROOP_COLORS[wordIdx];
  const inkItem = STROOP_COLORS[inkIdx];

  return {
    mode,
    wordItem,
    inkItem,
    correctColorId: mode === 'MEANING' ? wordItem.id : inkItem.id,
    options: STROOP_COLORS,
  };
}

// ==========================================
// 2. 居酒屋の注文フラッシュ暗記 (Izakaya Order Memory)
// ==========================================
export interface IzakayaMenuItem {
  id: string;
  emoji: string;
  name: string;
  category: string;
}

export const IZAKAYA_MENU: IzakayaMenuItem[] = [
  { id: 'edamame', emoji: '🫛', name: '塩ゆで枝豆', category: 'スピード' },
  { id: 'yakitori', emoji: '🍢', name: '炭火焼き鳥', category: '串焼き' },
  { id: 'karaage', emoji: '🍗', name: '若鶏の唐揚げ', category: '揚げ物' },
  { id: 'sashimi', emoji: '🐟', name: '本マグロ造り', category: '鮮魚' },
  { id: 'tamagoyaki', emoji: '🍳', name: '出汁巻き玉子', category: '逸品' },
  { id: 'gyoza', emoji: '🥟', name: '黒豚鉄鍋餃子', category: '点心' },
  { id: 'potato', emoji: '🍟', name: '明太ポテト', category: '揚げ物' },
  { id: 'tako', emoji: '🐙', name: 'たこわさび', category: '珍味' },
  { id: 'ochazuke', emoji: '🍚', name: '鮭茶漬け', category: '〆もの' },
  { id: 'beer', emoji: '🍺', name: '生ビール中ジョッキ', category: 'ドリンク' },
  { id: 'highball', emoji: '🥃', name: '角ハイボール', category: 'ドリンク' },
  { id: 'salad', emoji: '🥗', name: '海鮮シーザーサラダ', category: '野菜' },
];

export interface IzakayaRound {
  level: number;
  orderCount: number; // 3〜6品
  targetIds: string[];
  targetItems: IzakayaMenuItem[];
  panelItems: IzakayaMenuItem[]; // 9品または12品の選択肢パネル
}

export function generateIzakayaRound(level: number, randomFn: () => number = Math.random): IzakayaRound {
  const orderCount = Math.min(6, Math.max(3, 3 + Math.floor((level - 1) / 2)));
  const shuffled = [...IZAKAYA_MENU].sort(() => randomFn() - 0.5);
  const targetItems = shuffled.slice(0, orderCount);
  const distractorCount = Math.min(IZAKAYA_MENU.length - orderCount, Math.max(6, orderCount + 4));
  const distractors = shuffled.slice(orderCount, orderCount + distractorCount);
  const panelItems = [...targetItems, ...distractors].sort(() => randomFn() - 0.5);

  return {
    level,
    orderCount,
    targetIds: targetItems.map((item) => item.id),
    targetItems,
    panelItems,
  };
}

export function verifyIzakayaSelection(targetIds: string[], selectedIds: string[]): boolean {
  if (targetIds.length !== selectedIds.length) return false;
  const targetSet = new Set(targetIds);
  return selectedIds.every((id) => targetSet.has(id));
}

// ==========================================
// 3. お釣りフラッシュ計算 (Change Flash Calculation)
// ==========================================
export interface ChangeCalcRound {
  itemName: string;
  price: number;
  paid: number;
  correctChange: number;
  options: number[];
  correctIndex: number;
}

const SHOP_ITEMS = [
  '特製幕の内弁当',
  '深煎りドリップ珈琲セット',
  '有機抹茶ロールケーキ',
  '職人仕込みカツサンド',
  '季節のフルーツタルト',
  '文庫本ベストセラー2冊',
  '北海道産クラフトチーズ',
  '焼き立てクロワッサンセット',
];

export function generateChangeCalcRound(level: number, randomFn: () => number = Math.random): ChangeCalcRound {
  const itemName = SHOP_ITEMS[Math.floor(randomFn() * SHOP_ITEMS.length)];
  // 価格は 230円 〜 1,890円 (10円単位、高レベルは端数5円も混ぜる)
  const step = level >= 4 ? 5 : 10;
  const minSteps = Math.floor(240 / step);
  const maxSteps = Math.floor(1480 / step);
  const price = (minSteps + Math.floor(randomFn() * (maxSteps - minSteps))) * step;

  // 支払い方法は「1000円/2000円札のみ」または「端数合わせ（例: 680円に対して 1,030円や1,180円を出す）」
  const smartPayType = randomFn();
  let paid = 1000;
  if (price > 1000) {
    paid = 2000;
  }
  const remainder100 = price % 100;
  if (smartPayType < 0.65 && remainder100 > 0) {
    // 小銭を足してキリよくお釣りをもらうリアルな支払い
    if (randomFn() < 0.5 || remainder100 >= 50) {
      paid = Math.ceil(price / 500) * 500 + remainder100;
      if (paid <= price) paid += 500;
    } else {
      paid = Math.ceil(price / 1000) * 1000 + (price % 50);
      if (paid <= price) paid += 500;
    }
  } else {
    paid = price >= 1000 ? (randomFn() < 0.5 ? 1500 : 2000) : 1000;
    if (paid <= price) paid = Math.ceil((price + 100) / 500) * 500;
  }

  const correctChange = paid - price;

  // ダミー選択肢（±10, ±50, ±100, ±150などリアルに迷う金額）
  const deltas = [-100, -50, -20, -10, 10, 20, 50, 100, 150];
  const wrongSet = new Set<number>();
  for (const d of deltas.sort(() => randomFn() - 0.5)) {
    const candidate = correctChange + d;
    if (candidate > 0 && candidate !== correctChange) {
      wrongSet.add(candidate);
    }
    if (wrongSet.size >= 3) break;
  }
  let fallbackAdd = 10;
  while (wrongSet.size < 3) {
    wrongSet.add(correctChange + fallbackAdd);
    fallbackAdd += 10;
  }

  const options = [correctChange, ...Array.from(wrongSet)].sort((a, b) => a - b);
  const correctIndex = options.indexOf(correctChange);

  return {
    itemName,
    price,
    paid,
    correctChange,
    options,
    correctIndex,
  };
}

// ==========================================
// 4. ニュース虫食い記憶クイズ生成 (News Cloze Builder)
// ==========================================
export function buildNewsClozeQuestions(articles: NewsArticle[]): NewsClozeQuestion[] {
  return articles.slice(0, 3).map((article) => {
    const maskedTitle = article.title.includes(article.keyword)
      ? article.title.replace(article.keyword, '【 〇〇 】')
      : `${article.title}（注目語：【 〇〇 】）`;

    const uniqueDistractors = Array.from(new Set(article.distractors)).filter(
      (d) => d !== article.keyword
    );
    const rawOptions = [article.keyword, ...uniqueDistractors.slice(0, 3)];
    // Deterministic sort based on string code so options don't jump unexpectedly on re-render
    const options = [...rawOptions].sort((a, b) => a.localeCompare(b, 'ja'));
    const correctIndex = options.indexOf(article.keyword);

    return {
      articleId: article.id,
      maskedTitle,
      originalTitle: article.title,
      summary: article.summary,
      url: article.url,
      category: article.category,
      publishedAt: article.publishedAt,
      correctKeyword: article.keyword,
      options,
      correctIndex,
    };
  });
}
