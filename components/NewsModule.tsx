'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Newspaper,
  Timer,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import {
  NewsArticle,
  buildNewsClozeQuestions,
  RadarStats,
} from '@/lib/brain-logic';
import { FALLBACK_NEWS_ARTICLES } from '@/lib/initial-data';
import { soundEngine } from '@/lib/sound-engine';

interface NewsModuleProps {
  isDailyCourse?: boolean;
  onCompleteNewsQuiz: (result: {
    score: number;
    correctCount: number;
    totalCount: number;
    statKey: keyof RadarStats;
    statDelta: number;
  }) => void;
  onBackToHome?: () => void;
  onTriggerParticles: () => void;
}

export default function NewsModule({
  isDailyCourse = false,
  onCompleteNewsQuiz,
  onBackToHome,
  onTriggerParticles,
}: NewsModuleProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(FALLBACK_NEWS_ARTICLES);
  const [feedSource, setFeedSource] = useState<'live-rss' | 'curated-fallback'>('curated-fallback');
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(false);

  const [step, setStep] = useState<'MEMORIZE' | 'QUIZ' | 'REVIEW'>('MEMORIZE');
  const [memorizeSeconds, setMemorizeSeconds] = useState<number>(10);
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  const fetchLatestNews = async () => {
    setIsLoadingFeed(true);
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (Array.isArray(data.articles) && data.articles.length >= 3) {
        setArticles(data.articles);
        setFeedSource(data.source === 'live-rss' ? 'live-rss' : 'curated-fallback');
      }
    } catch {
      setArticles(FALLBACK_NEWS_ARTICLES);
      setFeedSource('curated-fallback');
    } finally {
      setIsLoadingFeed(false);
    }
  };

  useEffect(() => {
    fetchLatestNews();
  }, []);

  // 10-second reading timer in MEMORIZE phase
  useEffect(() => {
    if (step !== 'MEMORIZE') return;
    if (memorizeSeconds <= 0) {
      setStep('QUIZ');
      return;
    }
    const timer = setTimeout(() => {
      setMemorizeSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, memorizeSeconds]);

  const clozeQuestions = useMemo(() => buildNewsClozeQuestions(articles), [articles]);
  const currentCloze = clozeQuestions[questionIdx] || clozeQuestions[0];

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null || !currentCloze) return;
    setSelectedOption(idx);

    const isCorrect = idx === currentCloze.correctIndex;
    if (isCorrect) {
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      setScore((prev) => prev + 200);
      soundEngine.playCorrect(nextCorrect);
      onTriggerParticles();
    } else {
      soundEngine.playWrong();
    }
  };

  const handleNextCloze = () => {
    soundEngine.playClick();
    if (questionIdx + 1 < clozeQuestions.length) {
      setQuestionIdx((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setStep('REVIEW');
      soundEngine.playFanfare();
      onTriggerParticles();
    }
  };

  const handleResetQuiz = () => {
    soundEngine.playClick();
    setMemorizeSeconds(10);
    setQuestionIdx(0);
    setSelectedOption(null);
    setCorrectCount(0);
    setScore(0);
    setStep('MEMORIZE');
  };

  const handleCommitSession = () => {
    soundEngine.playClick();
    const statDelta = Math.max(4, correctCount * 4);
    onCompleteNewsQuiz({
      score,
      correctCount,
      totalCount: clozeQuestions.length,
      statKey: 'memory',
      statDelta,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          {!isDailyCourse && onBackToHome && (
            <button
              onClick={() => {
                soundEngine.playClick();
                onBackToHome();
              }}
              aria-label="ホームへ戻る"
              className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/80 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="text-xs text-slate-400">
              {isDailyCourse
                ? '今日の5分定食 · 最終ステップ 4/4（時事記憶）'
                : 'ニュース × 脳トレ · 時事＆短期記憶トレーニング'}
            </div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-sky-400" />
              ニュース虫食い記憶クイズ
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">
            配信ソース：{feedSource === 'live-rss' ? 'NHKニュースRSS（リアルタイム）' : '厳選最新トピック内蔵'}
          </span>
          {!isDailyCourse && (
            <button
              onClick={() => {
                soundEngine.playClick();
                fetchLatestNews();
                handleResetQuiz();
              }}
              disabled={isLoadingFeed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFeed ? 'animate-spin' : ''}`} />
              見出し更新
            </button>
          )}
        </div>
      </div>

      {/* STEP 1: 10-Second Headline Memorization */}
      {step === 'MEMORIZE' && (
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs text-amber-400 font-semibold">ステップ 1 / 3 · 見出しの暗記</p>
              <h3 className="text-xl font-bold text-slate-100 mt-0.5">
                今日の注目ニュース見出し3本を10秒間で記憶してください
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                直後に重要キーワードが【 〇〇 】と虫食いになったクイズが出題されます。
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg">
              <Timer className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">残り暗記時間</span>
              <span className="text-xl font-mono font-bold tabular-nums text-amber-400">
                {memorizeSeconds}s
              </span>
            </div>
          </div>

          {/* Countdown progress bar */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(memorizeSeconds / 10) * 100}%` }}
            />
          </div>

          <div className="space-y-3.5">
            {articles.slice(0, 3).map((art, index) => (
              <div
                key={art.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5"
              >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono font-semibold text-amber-400">
                    NEWS 0{index + 1}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{art.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{art.publishedAt}</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  {art.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{art.summary}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                soundEngine.playClick();
                setStep('QUIZ');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-colors whitespace-nowrap"
            >
              暗記完了！すぐ虫食いクイズへ進む
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Fill-in-the-blank Cloze Quiz */}
      {step === 'QUIZ' && currentCloze && (
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <span className="text-amber-400 font-semibold">
              ステップ 2 / 3 · 虫食い記憶テスト（第{questionIdx + 1}問 / 全{clozeQuestions.length}問）
            </span>
            <span className="tabular-nums">
              現在のスコア: <span className="font-mono font-semibold text-slate-200">{score.toLocaleString()} pt</span>
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              先ほど読んだニュース見出しの【 〇〇 】に入る正しいキーワードはどれでしょう？
            </p>
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl">
              <p className="text-lg sm:text-xl font-bold text-slate-100 leading-relaxed">
                {currentCloze.maskedTitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentCloze.options.map((opt, idx) => {
              const isAnswered = selectedOption !== null;
              const isCorrectOption = idx === currentCloze.correctIndex;
              const isSelected = idx === selectedOption;

              let btnStyle =
                'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100';
              if (isAnswered) {
                if (isCorrectOption) {
                  btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-200';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-500/20 border-rose-400 text-rose-200';
                } else {
                  btnStyle = 'bg-slate-900/60 border-slate-800 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`p-4 rounded-xl border text-left font-medium text-sm sm:text-base flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                >
                  <span>
                    <span className="font-mono text-xs text-slate-400 mr-2.5">
                      0{idx + 1}.
                    </span>
                    {opt}
                  </span>
                  {isAnswered && isCorrectOption && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="text-sm font-bold">
                {selectedOption === currentCloze.correctIndex ? (
                  <span className="text-emerald-400">
                    正解！ キーワードは「{currentCloze.correctKeyword}」です。
                  </span>
                ) : (
                  <span className="text-rose-400">
                    不正解！ 正しいキーワードは「{currentCloze.correctKeyword}」でした。
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                元の見出し：{currentCloze.originalTitle}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleNextCloze}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  {questionIdx + 1 < clozeQuestions.length
                    ? '次の虫食い問題へ'
                    : 'クイズ結果＆元ニュース一覧を見る'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Review Original News Articles & Links */}
      {step === 'REVIEW' && (
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs text-emerald-400 font-semibold">
                ステップ 3 / 3 · クイズ完了＆元ニュース振り返り
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-0.5">
                短期記憶スコア：{correctCount} / {clozeQuestions.length}問正解（{score.toLocaleString()} pt）
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {!isDailyCourse && (
                <button
                  onClick={handleResetQuiz}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  もう一度挑戦
                </button>
              )}
              <button
                onClick={handleCommitSession}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
              >
                {isDailyCourse
                  ? '今日の5分定食コース 総合結果＆スタンプ獲得へ！'
                  : 'スコアを記録して完了'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300">
              出題されたニュース一覧と解説・元記事リンク
            </h4>
            {articles.map((art, index) => (
              <div
                key={art.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-amber-400 font-semibold">
                      #{index + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{art.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>重要語：{art.keyword}</span>
                  </div>
                  <div className="text-base font-bold text-slate-100">{art.title}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{art.summary}</p>
                </div>

                <a
                  href={art.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                >
                  元ニュースを読む
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
