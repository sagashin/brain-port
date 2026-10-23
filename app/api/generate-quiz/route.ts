import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { KanjiQuestion, TriviaQuestion } from '@/lib/brain-logic';

const EXTRA_KANJI_BANK: KanjiQuestion[] = [
  {
    id: 'ai-kanji-101',
    category: '難読漢字の読み',
    prompt: '次の漢字の正しい読み方はどれでしょう？',
    targetWord: '時雨',
    reading: 'しぐれ',
    options: ['しぐれ', 'さみだれ', 'ゆうだち', 'こさめ'],
    correctIndex: 0,
    explanation: '「時雨（しぐれ）」は、秋の終わりから冬の初めにかけて、降ったり止んだりする通り雨のことです。',
    example: '京都の石畳が北山時雨にしっとりと濡れる。',
    isAiGenerated: true,
  },
  {
    id: 'ai-kanji-102',
    category: '四字熟語の穴埋め',
    prompt: '【 〇 】に入る正しい漢字を選んで四字熟語を完成させてください。',
    targetWord: '捲土【 〇 】来',
    reading: 'けんどちょうらい',
    options: ['重', '再', '強', '飛'],
    correctIndex: 0,
    explanation: '「捲土重来（けんどちょうらい）」は、一度敗れた者が再び勢いを盛り返して巻き返すこと。土煙を巻き上げて再び攻め寄せるさまに由来します。',
    example: '昨年の雪辱を果たすべく捲土重来を期す。',
    isAiGenerated: true,
  },
  {
    id: 'ai-kanji-103',
    category: '同音異義語の使い分け',
    prompt: '文脈に最も適した「추い（すい）こう」の漢字を選んでください。',
    targetWord: '書き上げた原稿を何度も【 すいこう 】して表現を磨く。',
    reading: 'すいこう（推敲）',
    options: ['推敲', '遂行', '趨向', '崇高'],
    correctIndex: 0,
    explanation: '「推敲（すいこう）」は文章や詩の字句を何度も練り直すこと。唐の詩人・賈島が「推す」にするか「敲く」にするか迷った故事に由来します。',
    example: '締め切りギリギリまで論文の推敲を重ねた。',
    isAiGenerated: true,
  },
];

const EXTRA_TRIVIA_BANK: TriviaQuestion[] = [
  {
    id: 'ai-trivia-101',
    genre: '科学',
    title: '宇宙空間には「ラズベリーの香り」の分子が存在する',
    question: '天の川銀河の中心付近のガス雲を電波望遠鏡で分析した結果、実際に大量に発見された有機化合物はどれに似た香り成分でしょう？',
    options: [
      'ラズベリー（木苺）とラム酒の香り成分（ギ酸エチル）',
      '挽きたてのエスプレッソ豆の香り成分',
      'ヒノキの森林浴の香り成分（フィトンチッド）',
      '焼きたてのバターパンの香り成分',
    ],
    correctIndex: 0,
    explanation: 'マックス・プランク研究所などの天文学チームが銀河中心部の分子雲「いて座B2」を調査したところ、ラズベリーの風味やラム酒の香りをもたらす「ギ酸エチル」が豊富に存在することが確認されました。',
    column: '同じ分子雲からは生命の材料となるアミノ酸の一種に関連する分子も探査されており、宇宙化学のロマンとして知られています。',
    isAiGenerated: true,
  },
  {
    id: 'ai-trivia-102',
    genre: '日常の豆知識',
    title: 'トランプの「52枚」と「4つのマーク」に隠された暦の秘密',
    question: 'トランプのカードが合計52枚（＋ジョーカー）で構成され、数字をすべて足すと「365」になるのは何をモチーフにしていると言われているでしょう？',
    options: [
      '1年間の週の数（52週）と四季（4スート）、365日（太陽暦）',
      '中世ヨーロッパの52の騎士団と4大元素',
      '星座の角度と月の満ち欠けの周期',
      'ロンドンの時計塔の歯車の数',
    ],
    correctIndex: 0,
    explanation: 'トランプのスペード・ハート・ダイヤ・クラブの4つは「春・夏・秋・冬」の四季を表し、各マーク13枚は1季節＝13週、合計52枚は1年＝52週に対応しています。さらに1〜13の合計（91）×4スート＋ジョーカー1枚＝365日となります。',
    column: '赤と黒の2色は「昼（太陽）」と「夜（月）」を象徴しているという説もあり、非常に精巧なカレンダーの構造を持っています。',
    isAiGenerated: true,
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type: 'kanji' | 'trivia' = body?.type === 'trivia' ? 'trivia' : 'kanji';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Return instant curated AI expansion pack if no live key is injected
      const stamp = Date.now();
      if (type === 'kanji') {
        const items = EXTRA_KANJI_BANK.map((q, idx) => ({
          ...q,
          id: `ai-kanji-${stamp}-${idx}`,
          isAiGenerated: true,
        }));
        return NextResponse.json({ source: 'builtin-ai-pack', items });
      } else {
        const items = EXTRA_TRIVIA_BANK.map((q, idx) => ({
          ...q,
          id: `ai-trivia-${stamp}-${idx}`,
          isAiGenerated: true,
        }));
        return NextResponse.json({ source: 'builtin-ai-pack', items });
      }
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    if (type === 'kanji') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents:
          '日本の大人向け脳トレ・教養アプリ用に、質の高い漢字・語彙4択クイズを2問作成してください。1問は「難読漢字の読み」、もう1問は「四字熟語の穴埋め」または「同音異義語の使い分け」にしてください。',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  description: '難読漢字の読み | 四字熟語の穴埋め | 同音異義語の使い分け のいずれか',
                },
                prompt: { type: Type.STRING },
                targetWord: { type: Type.STRING },
                reading: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                example: { type: Type.STRING },
              },
              required: [
                'category',
                'prompt',
                'targetWord',
                'reading',
                'options',
                'correctIndex',
                'explanation',
                'example',
              ],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      const stamp = Date.now();
      const items: KanjiQuestion[] = parsed.map((item: Record<string, unknown>, idx: number) => ({
        id: `gemini-kanji-${stamp}-${idx}`,
        category:
          item.category === '四字熟語の穴埋め' || item.category === '同音異義語の使い分け'
            ? item.category
            : '難読漢字の読み',
        prompt: String(item.prompt || '次の問いに答えてください。'),
        targetWord: String(item.targetWord || ''),
        reading: String(item.reading || ''),
        options: Array.isArray(item.options) ? item.options.slice(0, 4).map(String) : ['A', 'B', 'C', 'D'],
        correctIndex: Number(item.correctIndex) >= 0 && Number(item.correctIndex) < 4 ? Number(item.correctIndex) : 0,
        explanation: String(item.explanation || ''),
        example: String(item.example || ''),
        isAiGenerated: true,
      }));

      return NextResponse.json({ source: 'gemini-live', items });
    } else {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents:
          '日本の大人向け教養アプリ用に、思わず「へぇ〜！」と唸る知的で面白い雑学4択クイズを2問作成してください。ジャンルは「科学」「歴史」「日常の豆知識」「IT」「文化」から選び、詳しい豆知識コラムも付けてください。',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                genre: {
                  type: Type.STRING,
                  description: '科学 | 歴史 | 日常の豆知識 | IT | 文化 のいずれか',
                },
                title: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                column: { type: Type.STRING },
              },
              required: ['genre', 'title', 'question', 'options', 'correctIndex', 'explanation', 'column'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      const stamp = Date.now();
      const validGenres = ['科学', '歴史', '日常の豆知識', 'IT', '文化'] as const;
      const items: TriviaQuestion[] = parsed.map((item: Record<string, unknown>, idx: number) => ({
        id: `gemini-trivia-${stamp}-${idx}`,
        genre: validGenres.includes(item.genre as typeof validGenres[number])
          ? (item.genre as TriviaQuestion['genre'])
          : '日常の豆知識',
        title: String(item.title || '最新教養コラム'),
        question: String(item.question || ''),
        options: Array.isArray(item.options) ? item.options.slice(0, 4).map(String) : ['A', 'B', 'C', 'D'],
        correctIndex: Number(item.correctIndex) >= 0 && Number(item.correctIndex) < 4 ? Number(item.correctIndex) : 0,
        explanation: String(item.explanation || ''),
        column: String(item.column || ''),
        isAiGenerated: true,
      }));

      return NextResponse.json({ source: 'gemini-live', items });
    }
  } catch {
    const stamp = Date.now();
    const items = EXTRA_KANJI_BANK.map((q, idx) => ({
      ...q,
      id: `ai-fallback-${stamp}-${idx}`,
      isAiGenerated: true,
    }));
    return NextResponse.json({ source: 'fallback', items });
  }
}
