import { NextResponse } from 'next/server';
import { FALLBACK_NEWS_ARTICLES } from '@/lib/initial-data';
import { NewsArticle } from '@/lib/brain-logic';

const DEFAULT_DISTRACTORS = [
  'デジタル庁',
  '量子コンピュータ',
  '再生可能エネルギー',
  '自律走行システム',
  '半導体サプライチェーン',
  '宇宙ステーション',
  'カーボンニュートラル',
  '次世代通信規格',
];

function extractKeywordFromTitle(title: string): string {
  // 「...」で囲まれた語があれば優先抽出
  const bracketMatch = title.match(/「([^」]{2,10})」/);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1];
  }
  // 漢字・カタカナの連続する3〜7文字の重要語を抽出
  const wordMatches = title.match(/[一-龠々ァ-ヶー]{3,7}/g);
  if (wordMatches && wordMatches.length > 0) {
    // 最も特徴的な長めの単語を選択
    const sorted = [...wordMatches].sort((a, b) => b.length - a.length);
    return sorted[0];
  }
  return title.slice(0, Math.min(4, title.length));
}

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://www3.nhk.or.jp/rss/news/cat0.xml', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyDailyBrainPortal/1.0)',
      },
      next: { revalidate: 900 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`RSS status ${res.status}`);
    }

    const xml = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const articles: NewsArticle[] = [];
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null && articles.length < 5) {
      const block = match[1];
      const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const descMatch = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
      const linkMatch = block.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);

      const rawTitle = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
      const rawDesc = (descMatch?.[1] || descMatch?.[2] || '').trim();
      const rawLink = (linkMatch?.[1] || 'https://www3.nhk.or.jp/news/').trim();
      const rawDate = (pubDateMatch?.[1] || '最新配信').trim();

      if (rawTitle && rawTitle.length >= 10) {
        const keyword = extractKeywordFromTitle(rawTitle);
        const distractors = DEFAULT_DISTRACTORS.filter((d) => d !== keyword).slice(
          articles.length,
          articles.length + 3
        );
        articles.push({
          id: `rss-${articles.length + 1}-${Date.now()}`,
          title: rawTitle,
          summary: rawDesc || 'NHKニュースの最新ヘッドライン記事です。',
          category: 'NHK主要ニュース',
          publishedAt: rawDate.slice(0, 16),
          url: rawLink,
          keyword,
          distractors: distractors.length >= 3 ? distractors : ['次世代技術', '経済対策', '国際会議'],
        });
      }
    }

    if (articles.length >= 3) {
      return NextResponse.json({
        source: 'live-rss',
        articles,
      });
    }

    return NextResponse.json({
      source: 'curated-fallback',
      articles: FALLBACK_NEWS_ARTICLES,
    });
  } catch {
    return NextResponse.json({
      source: 'curated-fallback',
      articles: FALLBACK_NEWS_ARTICLES,
    });
  }
}
