'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookmarkCheck,
  RotateCcw,
} from 'lucide-react';
import { KanjiQuestion, TriviaQuestion, RadarStats } from '@/lib/brain-logic';
import { soundEngine } from '@/lib/sound-engine';

interface QuizModuleProps {
  mode: 'kanji' | 'trivia';
  kanjiQuestions: KanjiQuestion[];
  triviaQuestions: TriviaQuestion[];
  unlockedIds: string[];
  isDailyCourse?: boolean;
  onUnlockItem: (id: string, mode: 'kanji' | 'trivia') => void;
  onAddAiQuestions: (
    mode: 'kanji' | 'trivia',
    items: KanjiQuestion[] | TriviaQuestion[]
  ) => void;
  onCompleteQuizSession: (result: {
    mode: 'kanji' | 'trivia';
    score: number;
    correctCount: number;
    totalCount: number;
    statKey: keyof RadarStats;
    statDelta: number;
  }) => void;
  onBackToHome?: () => void;
  onTriggerParticles: () => void;
}

export default function QuizModule({
  mode,
  kanjiQuestions,
  triviaQuestions,
  unlockedIds,
  isDailyCourse = false,
  onUnlockItem,
  onAddAiQuestions,
  onCompleteQuizSession,
  onBackToHome,
  onTriggerParticles,
}: QuizModuleProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (mode === 'kanji') {
      return ['すべて', '難読漢字の読み', '四字熟語の穴埋め', '同音異義語の使い分け'];
    }
    return ['すべて', '科学', '歴史', '日常の豆知識', 'IT', '文化'];
  }, [mode]);

  const activePool = useMemo(() => {
    if (mode === 'kanji') {
      const filtered =
        selectedCategory === 'すべて'
          ? kanjiQuestions
          : kanjiQuestions.filter((q) => q.category === selectedCategory);
      return isDailyCourse ? filtered.slice(0, 3) : filtered;
    } else {
      const filtered =
        selectedCategory === 'すべて'
          ? triviaQuestions
          : triviaQuestions.filter((q) => q.genre === selectedCategory);
      return isDailyCourse ? filtered.slice(0, 3) : filtered;
    }
  }, [mode, kanjiQuestions, triviaQuestions, selectedCategory, isDailyCourse]);

  const currentQuestion = activePool[currentIndex] || activePool[0];
  const totalInSession = isDailyCourse ? Math.min(3, activePool.length) : activePool.length;

  const handleSelectOption = (optIndex: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    setSelectedOption(optIndex);

    const isCorrect = optIndex === currentQuestion.correctIndex;
    if (isCorrect) {
      const nextCombo = combo + 1;
      const gained = 150 + nextCombo * 30;
      setCombo(nextCombo);
      setCorrectCount((prev) => prev + 1);
      setScore((prev) => prev + gained);
      soundEngine.playCorrect(nextCombo);
      onTriggerParticles();
      onUnlockItem(currentQuestion.id, mode);
    } else {
      setCombo(0);
      soundEngine.playWrong();
      // Even when wrong, studying the explanation unlocks it in the collection so they can review
      onUnlockItem(currentQuestion.id, mode);
    }
  };

  const handleNextQuestion = () => {
    soundEngine.playClick();
    if (currentIndex + 1 < totalInSession) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setIsCompleted(true);
      soundEngine.playFanfare();
      onTriggerParticles();
    }
  };

  const handleGenerateAiQuestions = async () => {
    if (isGeneratingAi) return;
    soundEngine.playClick();
    setIsGeneratingAi(true);
    setAiStatusMessage(null);

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode }),
      });
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        onAddAiQuestions(mode, data.items);
        setSelectedCategory('すべて');
        setIsCompleted(false);
        setSelectedOption(null);
        setCurrentIndex(
          mode === 'kanji' ? kanjiQuestions.length : triviaQuestions.length
        );
        setAiStatusMessage(`新しい${mode === 'kanji' ? '漢字・語彙' : '教養・雑学'}問題を ${data.items.length}問 追加しました！`);
        soundEngine.playCorrect(2);
      }
    } catch {
      setAiStatusMessage('問題の生成に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleFinishSession = () => {
    soundEngine.playClick();
    const statKey: keyof RadarStats = mode === 'kanji' ? 'vocabulary' : 'knowledge';
    const statDelta = Math.max(3, correctCount * 3);
    onCompleteQuizSession({
      mode,
      score,
      correctCount,
      totalCount: totalInSession,
      statKey,
      statDelta,
    });
  };

  const handleRestartSession = () => {
    soundEngine.playClick();
    setCurrentIndex(0);
    setSelectedOption(null);
    setCorrectCount(0);
    setCombo(0);
    setScore(0);
    setIsCompleted(false);
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
                ? mode === 'kanji'
                  ? '今日の5分定食 · ステップ 2/4（3問）'
                  : '今日の5分定食 · ステップ 3/4（3問）'
                : mode === 'kanji'
                ? '漢字・語彙道場 · マイ図鑑連携'
                : '教養・雑学クイズ · 豆知識コラム連携'}
            </div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              {mode === 'kanji' ? (
                <>
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  漢字・語彙道場
                </>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5 text-emerald-400" />
                  教養・雑学クイズ
                </>
              )}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isDailyCourse && (
            <button
              onClick={handleGenerateAiQuestions}
              disabled={isGeneratingAi}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGeneratingAi ? 'AIで問題を生成中...' : 'AIで新しい問題を生成'}
            </button>
          )}
          <div className="text-right">
            <div className="text-xs text-slate-400">進捗</div>
            <div className="text-base font-bold tabular-nums text-slate-100">
              <span className="font-mono">{Math.min(currentIndex + 1, totalInSession)} / {totalInSession}</span>問
            </div>
          </div>
        </div>
      </div>

      {aiStatusMessage && (
        <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center justify-between">
          <span>{aiStatusMessage}</span>
          <button
            onClick={() => setAiStatusMessage(null)}
            className="text-amber-400 hover:underline ml-4 whitespace-nowrap"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Filter Tabs (Free Play Only) */}
      {!isDailyCourse && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                soundEngine.playClick();
                setSelectedCategory(cat);
                setCurrentIndex(0);
                setSelectedOption(null);
                setIsCompleted(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Active Question View */}
      {!isCompleted && currentQuestion && (
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
          {/* Metadata row (unboxed per Zero-Pill rule) */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-medium">
                {mode === 'kanji'
                  ? (currentQuestion as KanjiQuestion).category
                  : (currentQuestion as TriviaQuestion).genre}
              </span>
              <span aria-hidden="true">·</span>
              <span>問題 {currentIndex + 1}</span>
              {currentQuestion.isAiGenerated && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-400">AI追加問題</span>
                </>
              )}
            </div>
            {unlockedIds.includes(currentQuestion.id) && (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <BookmarkCheck className="w-3.5 h-3.5" />
                マイ図鑑登録済
              </span>
            )}
          </div>

          {/* Question Body */}
          {mode === 'kanji' ? (
            <div className="space-y-4 text-center py-2">
              <p className="text-sm text-slate-300">
                {(currentQuestion as KanjiQuestion).prompt}
              </p>
              <div className="py-6 px-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-3xl sm:text-4xl font-bold tracking-wide text-slate-100">
                  {(currentQuestion as KanjiQuestion).targetWord}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-emerald-400 font-medium">
                テーマ：{(currentQuestion as TriviaQuestion).title}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100 leading-relaxed">
                {(currentQuestion as TriviaQuestion).question}
              </h3>
            </div>
          )}

          {/* 4 Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentQuestion.options.map((opt, idx) => {
              const isAnswered = selectedOption !== null;
              const isCorrectOption = idx === currentQuestion.correctIndex;
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

          {/* Explanation & Trivia Column Drawer */}
          {selectedOption !== null && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedOption === currentQuestion.correctIndex ? (
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      正解！ マイ図鑑にコレクションされました
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" />
                      惜しい！ 正解は「{currentQuestion.options[currentQuestion.correctIndex]}」
                    </span>
                  )}
                </div>
                {mode === 'kanji' && (currentQuestion as KanjiQuestion).reading && (
                  <span className="text-xs text-amber-400 font-medium">
                    読み：{(currentQuestion as KanjiQuestion).reading}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-200 leading-relaxed">
                {currentQuestion.explanation}
              </p>

              {mode === 'kanji' ? (
                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  用例：<span className="text-slate-300">{(currentQuestion as KanjiQuestion).example}</span>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800/90 text-xs text-slate-300 leading-relaxed">
                  <div className="font-semibold text-amber-400 mb-1">深掘り豆知識コラム</div>
                  {(currentQuestion as TriviaQuestion).column}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleNextQuestion}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  {currentIndex + 1 < totalInSession ? '次の問題へ進む' : '結果を確認する'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed Summary View */}
      {isCompleted && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-emerald-400 font-semibold">セクション達成！</p>
            <h3 className="text-2xl font-bold text-slate-100">
              {mode === 'kanji' ? '漢字・語彙道場' : '教養・雑学クイズ'} 完了
            </h3>
            <p className="text-sm text-slate-400">
              解答したすべての知識カードが「マイ図鑑」に記録されました。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">正解数</div>
              <div className="text-2xl font-bold tabular-nums text-slate-100 mt-1">
                <span className="font-mono">{correctCount} / {totalInSession}</span>問
              </div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">獲得スコア</div>
              <div className="text-2xl font-mono font-bold tabular-nums text-amber-400 mt-1">
                {score.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!isDailyCourse && (
              <button
                onClick={handleRestartSession}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度解く
              </button>
            )}
            <button
              onClick={handleFinishSession}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              {isDailyCourse
                ? mode === 'kanji'
                  ? '次へ：「③ 教養・雑学クイズ」へ進む'
                  : '次へ：「④ ニュース虫食い記憶クイズ」へ進む'
                : 'ステータスに反映して戻る'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
