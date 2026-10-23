'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Palette,
  UtensilsCrossed,
  Coins,
  Timer,
  Flame,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import {
  StroopRound,
  generateStroopRound,
  IzakayaRound,
  generateIzakayaRound,
  verifyIzakayaSelection,
  ChangeCalcRound,
  generateChangeCalcRound,
  getComboMultiplier,
  calculateAnswerScore,
  RadarStats,
} from '@/lib/brain-logic';
import { soundEngine } from '@/lib/sound-engine';

export type BrainGameType = 'stroop' | 'izakaya' | 'change';

interface BrainGamesModuleProps {
  initialGame?: BrainGameType | null;
  isDailyCourse?: boolean;
  onCompleteGame: (result: {
    gameType: BrainGameType;
    score: number;
    maxCombo: number;
    correctCount: number;
    statKey: keyof RadarStats;
    statDelta: number;
  }) => void;
  onBackToHome?: () => void;
  onTriggerParticles: () => void;
}

const GAME_META: Record<
  BrainGameType,
  {
    title: string;
    subtitle: string;
    statLabel: string;
    statKey: keyof RadarStats;
    durationSec: number;
    rules: string;
  }
> = {
  stroop: {
    title: '色彩ストループ脳トレ',
    subtitle: '前頭葉の注意制御・抑制機能を鍛える瞬発テスト',
    statLabel: '注意力',
    statKey: 'attention',
    durationSec: 35,
    rules: '表示された文字の「意味」または「塗られている色」のうち、指示された方を4択から瞬時に選んでください。',
  },
  izakaya: {
    title: '居酒屋の注文フラッシュ暗記',
    subtitle: '短期記憶（ワーキングメモリ）を限界まで引き出す暗記ゲーム',
    statLabel: '記憶力',
    statKey: 'memory',
    durationSec: 45,
    rules: 'お客さんが注文したメニュー（3〜6品）が3秒間だけ表示されます。隠れた後に正しい料理をすべて選んでください。',
  },
  change: {
    title: 'お釣りフラッシュ計算',
    subtitle: '端数合わせの支払いから瞬時にお釣りを導く実用暗算',
    statLabel: '計算力',
    statKey: 'calculation',
    durationSec: 35,
    rules: '「商品価格」と「お預かり金額（端数出し含む）」を見て、正しいお釣りの金額を4択から素早く選んでください。',
  },
};

export default function BrainGamesModule({
  initialGame = null,
  isDailyCourse = false,
  onCompleteGame,
  onBackToHome,
  onTriggerParticles,
}: BrainGamesModuleProps) {
  const [selectedGame, setSelectedGame] = useState<BrainGameType | null>(
    initialGame || (isDailyCourse ? 'stroop' : null)
  );
  const [phase, setPhase] = useState<'READY' | 'PLAYING' | 'RESULT'>('READY');
  const [timeLeft, setTimeLeft] = useState<number>(35);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'correct' | 'wrong';
    text: string;
  } | null>(null);

  // Game-specific state
  const [stroopRound, setStroopRound] = useState<StroopRound>(() => generateStroopRound());
  const [izakayaRound, setIzakayaRound] = useState<IzakayaRound>(() => generateIzakayaRound(1));
  const [izakayaMemorizing, setIzakayaMemorizing] = useState<boolean>(true);
  const [izakayaSelected, setIzakayaSelected] = useState<string[]>([]);
  const [changeRound, setChangeRound] = useState<ChangeCalcRound>(() => generateChangeCalcRound(1));

  const finishGame = useCallback(
    (finalScore: number, finalMaxCombo: number, finalCorrect: number, gameType: BrainGameType) => {
      setPhase('RESULT');
      soundEngine.playFanfare();
      onTriggerParticles();
      if (isDailyCourse) {
        // In Daily Course, user clicks "次のステップ（漢字道場）へ" on the result screen
      }
      return { finalScore, finalMaxCombo, finalCorrect, gameType };
    },
    [isDailyCourse, onTriggerParticles]
  );

  // Start a specific game
  const startGame = (game: BrainGameType) => {
    soundEngine.playClick();
    const meta = GAME_META[game];
    setSelectedGame(game);
    setTimeLeft(meta.durationSec);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setFeedbackBanner(null);

    if (game === 'stroop') {
      setStroopRound(generateStroopRound());
    } else if (game === 'izakaya') {
      setIzakayaRound(generateIzakayaRound(1));
      setIzakayaMemorizing(true);
      setIzakayaSelected([]);
    } else if (game === 'change') {
      setChangeRound(generateChangeCalcRound(1));
    }

    setPhase('PLAYING');
  };

  // Main countdown timer
  useEffect(() => {
    if (phase !== 'PLAYING' || !selectedGame) return;
    if (timeLeft <= 0) {
      finishGame(score, maxCombo, correctCount, selectedGame);
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft, selectedGame, score, maxCombo, correctCount, finishGame]);

  // Izakaya 3-second flash timer
  useEffect(() => {
    if (phase !== 'PLAYING' || selectedGame !== 'izakaya' || !izakayaMemorizing) return;
    const flashTimer = setTimeout(() => {
      setIzakayaMemorizing(false);
    }, 3000);
    return () => clearTimeout(flashTimer);
  }, [phase, selectedGame, izakayaMemorizing, izakayaRound]);

  const registerAnswer = (isCorrect: boolean, basePoints: number) => {
    if (isCorrect) {
      const nextCombo = combo + 1;
      const nextMax = Math.max(maxCombo, nextCombo);
      const nextCorrect = correctCount + 1;
      const gained = calculateAnswerScore(basePoints, nextCombo, Math.floor(timeLeft / 3));
      const nextScore = score + gained;

      setCombo(nextCombo);
      setMaxCombo(nextMax);
      setCorrectCount(nextCorrect);
      setScore(nextScore);
      soundEngine.playCorrect(nextCombo);
      onTriggerParticles();
      setFeedbackBanner({
        type: 'correct',
        text: `正解！ +${gained} pt (${getComboMultiplier(nextCombo).toFixed(1)}x コンボ)`,
      });
      return { nextScore, nextMax, nextCorrect };
    } else {
      setCombo(0);
      soundEngine.playWrong();
      setFeedbackBanner({
        type: 'wrong',
        text: 'ミス！ コンボがリセットされました',
      });
      return { nextScore: score, nextMax: maxCombo, nextCorrect: correctCount };
    }
  };

  const handleStroopAnswer = (colorId: StroopRound['correctColorId']) => {
    if (phase !== 'PLAYING') return;
    const isCorrect = colorId === stroopRound.correctColorId;
    registerAnswer(isCorrect, 120);
    setStroopRound(generateStroopRound());
  };

  const handleIzakayaToggleItem = (itemId: string) => {
    if (phase !== 'PLAYING' || izakayaMemorizing) return;
    soundEngine.playClick();

    const exists = izakayaSelected.includes(itemId);
    const updated = exists
      ? izakayaSelected.filter((id) => id !== itemId)
      : [...izakayaSelected, itemId];

    setIzakayaSelected(updated);

    if (updated.length === izakayaRound.orderCount) {
      const isCorrect = verifyIzakayaSelection(izakayaRound.targetIds, updated);
      const { nextCorrect } = registerAnswer(isCorrect, 220);
      const nextLevel = nextCorrect + 1;
      setIzakayaRound(generateIzakayaRound(nextLevel));
      setIzakayaSelected([]);
      setIzakayaMemorizing(true);
    }
  };

  const handleChangeAnswer = (amount: number) => {
    if (phase !== 'PLAYING') return;
    const isCorrect = amount === changeRound.correctChange;
    const { nextCorrect } = registerAnswer(isCorrect, 150);
    setChangeRound(generateChangeCalcRound(nextCorrect + 1));
  };

  const handleCommitResult = () => {
    if (!selectedGame) return;
    soundEngine.playClick();
    const meta = GAME_META[selectedGame];
    const statDelta = Math.max(3, Math.min(14, Math.round(correctCount * 1.8 + maxCombo * 0.8)));
    onCompleteGame({
      gameType: selectedGame,
      score,
      maxCombo,
      correctCount,
      statKey: meta.statKey,
      statDelta,
    });
  };

  // Game Selector View (when in Free Play and no game chosen yet)
  if (!selectedGame) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">脳トレミニゲーム アリーナ</h2>
            <p className="text-sm text-slate-400 mt-1">
              制限時間35〜45秒でコンボをつなぐ3種の瞬発トレーニング。連続正解で音程とスコア倍率が上昇します。
            </p>
          </div>
          {onBackToHome && (
            <button
              onClick={() => {
                soundEngine.playClick();
                onBackToHome();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              ホームへ戻る
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['stroop', 'izakaya', 'change'] as BrainGameType[]).map((key) => {
            const item = GAME_META[key];
            return (
              <div
                key={key}
                className="flex flex-col justify-between p-6 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-amber-500/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>鍛える能力：{item.statLabel}</span>
                    <span className="tabular-nums">制限時間 <span className="font-mono">{item.durationSec}</span>秒</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    {key === 'stroop' && <Palette className="w-5 h-5 text-amber-400 shrink-0" />}
                    {key === 'izakaya' && <UtensilsCrossed className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {key === 'change' && <Coins className="w-5 h-5 text-sky-400 shrink-0" />}
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.rules}</p>
                </div>

                <button
                  onClick={() => startGame(key)}
                  className="mt-6 w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  {item.title} を開始
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentMeta = GAME_META[selectedGame];
  const multiplier = getComboMultiplier(combo);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Game HUD */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          {!isDailyCourse && (
            <button
              onClick={() => {
                soundEngine.playClick();
                setSelectedGame(null);
                setPhase('READY');
              }}
              aria-label="ゲーム選択一覧へ戻る"
              className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/80 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="text-xs text-slate-400">
              {isDailyCourse ? '今日の5分定食 · ステップ 1/4' : `脳トレ · ${currentMeta.statLabel}強化`}
            </div>
            <h2 className="text-lg font-bold text-slate-100">{currentMeta.title}</h2>
          </div>
        </div>

        {/* Live Telemetry Readouts */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              残り時間
            </div>
            <div
              className={`text-xl font-mono font-bold tabular-nums ${
                timeLeft <= 8 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {timeLeft}s
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              コンボ倍率
            </div>
            <div className="text-xl font-bold text-amber-400">
              <span className="font-mono tabular-nums">{combo}</span>連鎖{' '}
              <span className="font-mono tabular-nums">({multiplier.toFixed(1)}x)</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">スコア</div>
            <div className="text-xl font-mono font-bold tabular-nums text-emerald-400">
              {score.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* READY SCREEN */}
      {phase === 'READY' && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-amber-400 font-medium">
              鍛えられる能力：{currentMeta.statLabel} · 制限時間 {currentMeta.durationSec}秒
            </p>
            <h3 className="text-2xl font-bold text-slate-100">{currentMeta.title}</h3>
            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              {currentMeta.rules}
            </p>
          </div>

          {isDailyCourse && (
            <div className="flex items-center justify-center gap-2">
              {(['stroop', 'izakaya', 'change'] as BrainGameType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedGame(g);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    selectedGame === g
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {GAME_META[g].title}
                </button>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => startGame(selectedGame)}
              data-start="true"
              className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base rounded-xl transition-colors whitespace-nowrap"
            >
              トレーニング開始（スタート）
            </button>
          </div>
        </div>
      )}

      {/* PLAYING SCREEN */}
      {phase === 'PLAYING' && (
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
          {/* Feedback Bar */}
          <div className="h-7 flex items-center justify-between">
            {feedbackBanner ? (
              <span
                className={`text-xs font-semibold ${
                  feedbackBanner.type === 'correct' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {feedbackBanner.text}
              </span>
            ) : (
              <span className="text-xs text-slate-400">素早く正確にタップしてコンボを繋げましょう！</span>
            )}
            <button
              onClick={() => finishGame(score, maxCombo, correctCount, selectedGame)}
              className="text-xs text-slate-400 hover:text-slate-200 underline whitespace-nowrap"
            >
              プレイを完了して結果へ
            </button>
          </div>

          {/* 1. STROOP GAME */}
          {selectedGame === 'stroop' && (
            <div className="space-y-8 text-center py-4">
              <div className="inline-block px-5 py-2 rounded-lg bg-slate-800 border border-slate-700">
                <span className="text-sm text-slate-300">質問：この文字の </span>
                <span className="text-lg font-bold text-amber-400 underline underline-offset-4">
                  {stroopRound.mode === 'MEANING' ? '「文字の意味」' : '「塗られている色」'}
                </span>
                <span className="text-sm text-slate-300"> はどれ？</span>
              </div>

              <motion.div
                key={`${stroopRound.wordItem.id}-${stroopRound.inkItem.id}-${stroopRound.mode}-${correctCount}`}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="py-8 bg-slate-950/90 border border-slate-800/80 rounded-xl"
              >
                <span
                  className="text-6xl sm:text-7xl font-extrabold tracking-wider select-none"
                  style={{ color: stroopRound.inkItem.hex }}
                >
                  {stroopRound.wordItem.label}
                </span>
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {stroopRound.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleStroopAnswer(opt.id)}
                    className="py-4 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center gap-1.5 transition-all"
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-white/20"
                      style={{ backgroundColor: opt.hex }}
                    />
                    <span className="text-base font-bold text-slate-100">
                      {opt.label}（{opt.kanjiLabel}）
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. IZAKAYA FLASH MEMORY GAME */}
          {selectedGame === 'izakaya' && (
            <div className="space-y-6">
              {izakayaMemorizing ? (
                <div className="text-center space-y-6 py-6">
                  <div className="space-y-1">
                    <p className="text-xs text-amber-400 font-semibold">
                      3秒間で注文の品（{izakayaRound.orderCount}品）を暗記してください！
                    </p>
                    <h3 className="text-xl font-bold text-slate-100">
                      「すいません！こちらの{izakayaRound.orderCount}品をお願いします！」
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    {izakayaRound.targetItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl flex items-center gap-3"
                      >
                        <span className="text-3xl">{item.emoji}</span>
                        <div className="text-left">
                          <div className="text-xs text-slate-400">{item.category}</div>
                          <div className="text-base font-bold text-slate-100">{item.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setIzakayaMemorizing(false);
                      }}
                      className="px-5 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors"
                    >
                      覚えた！すぐ注文パネルを開く
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-100">
                      注文された {izakayaRound.orderCount}品 をすべて選んでください
                    </h3>
                    <span className="text-xs tabular-nums text-amber-400">
                      選択中: <span className="font-mono font-bold">{izakayaSelected.length} / {izakayaRound.orderCount}</span>品
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {izakayaRound.panelItems.map((item) => {
                      const isPicked = izakayaSelected.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleIzakayaToggleItem(item.id)}
                          className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                            isPicked
                              ? 'bg-amber-500/20 border-amber-400 text-slate-100'
                              : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-2xl shrink-0">{item.emoji}</span>
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-400 truncate">{item.category}</div>
                            <div className="text-sm font-bold truncate">{item.name}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. CHANGE FLASH CALCULATION GAME */}
          {selectedGame === 'change' && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                <div className="text-xs text-slate-400 text-center">
                  お買い上げ商品：{changeRound.itemName}
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400">商品価格</div>
                    <div className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-100 mt-1">
                      <span className="font-mono">{changeRound.price.toLocaleString()}</span>
                      <span className="text-sm font-normal text-slate-400 ml-1">円</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-xs text-amber-400">お預かり金額</div>
                    <div className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-400 mt-1">
                      <span className="font-mono">{changeRound.paid.toLocaleString()}</span>
                      <span className="text-sm font-normal text-amber-300/80 ml-1">円</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-center text-slate-300">
                  お釣りはいくらになりますか？
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {changeRound.options.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleChangeAnswer(amt)}
                      className="py-4 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xl font-bold tabular-nums text-slate-100 transition-colors"
                    >
                      <span className="font-mono">{amt.toLocaleString()}</span>円
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULT SCREEN */}
      {phase === 'RESULT' && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-emerald-400 font-semibold">トレーニング完了！</p>
            <h3 className="text-2xl font-bold text-slate-100">{currentMeta.title} 結果</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">獲得スコア</div>
              <div className="text-2xl font-mono font-bold tabular-nums text-amber-400 mt-1">
                {score.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">正解数</div>
              <div className="text-2xl font-bold tabular-nums text-slate-100 mt-1">
                <span className="font-mono">{correctCount}</span>問
              </div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">最大コンボ</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-400 mt-1">
                <span className="font-mono">{maxCombo}</span>連鎖
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!isDailyCourse && (
              <button
                onClick={() => startGame(selectedGame)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度挑戦する
              </button>
            )}
            <button
              onClick={handleCommitResult}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              {isDailyCourse ? 'スコアを記録して「② 漢字道場」へ進む' : 'スコアを記録して完了'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
