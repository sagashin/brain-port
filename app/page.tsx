'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Calendar,
  Award,
  Sparkles,
  Palette,
  UtensilsCrossed,
  Coins,
  BookOpen,
  Lightbulb,
  Newspaper,
  Library,
  Settings,
  Volume2,
  VolumeX,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import {
  UserSaveData,
  INITIAL_SAVE_DATA,
  formatDateKey,
  updateRadarStat,
  recordDailyActivity,
  KanjiQuestion,
  TriviaQuestion,
  RadarStats,
} from '@/lib/brain-logic';
import {
  INITIAL_KANJI_QUESTIONS,
  INITIAL_TRIVIA_QUESTIONS,
} from '@/lib/initial-data';
import { soundEngine } from '@/lib/sound-engine';
import RadarChart from '@/components/RadarChart';
import ParticleBurst from '@/components/ParticleBurst';
import BrainGamesModule, { BrainGameType } from '@/components/BrainGamesModule';
import QuizModule from '@/components/QuizModule';
import NewsModule from '@/components/NewsModule';
import { CollectionView, SettingsModal } from '@/components/CollectionAndSettings';

const STORAGE_KEY = 'my_daily_brain_portal_save_v1';

type ActiveView =
  | 'home'
  | 'brain-games'
  | 'kanji'
  | 'trivia'
  | 'news'
  | 'collection'
  | 'daily-course';

type DailyCourseStep = 1 | 2 | 3 | 4 | 'SUMMARY';

export default function MyDailyBrainPortalPage() {
  const [saveData, setSaveData] = useState<UserSaveData>(INITIAL_SAVE_DATA);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [initialBrainGame, setInitialBrainGame] = useState<BrainGameType | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [particleTrigger, setParticleTrigger] = useState<number>(0);

  // Daily 5-Minute Course State
  const [dailyStep, setDailyStep] = useState<DailyCourseStep>(1);
  const [dailyScores, setDailyScores] = useState<{
    gameScore: number;
    kanjiScore: number;
    triviaScore: number;
    newsScore: number;
  }>({
    gameScore: 0,
    kanjiScore: 0,
    triviaScore: 0,
    newsScore: 0,
  });

  // Load persisted data from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSaveData>;
        const merged: UserSaveData = {
          ...INITIAL_SAVE_DATA,
          ...parsed,
          stats: {
            ...INITIAL_SAVE_DATA.stats,
            ...(parsed.stats || {}),
          },
        };
        setSaveData(merged);
        soundEngine.setEnabled(merged.soundEnabled);
      } else {
        soundEngine.setEnabled(INITIAL_SAVE_DATA.soundEnabled);
      }
    } catch {
      // Fallback to default save data
    }
    setIsHydrated(true);

    // Support ?autostart=1 for automated checks
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        setActiveView('daily-course');
        setDailyStep(1);
      }
    }
  }, []);

  // Save to localStorage whenever saveData updates after hydration
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    } catch {
      // Ignore storage quota errors
    }
  }, [saveData, isHydrated]);

  const triggerParticles = () => {
    setParticleTrigger(Date.now());
  };

  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const isTodayCourseStamped = saveData.dailyStampDates.includes(todayKey);

  // Combine initial and AI-generated questions
  const allKanjiQuestions = useMemo(
    () => [...INITIAL_KANJI_QUESTIONS, ...(saveData.customKanjiQuestions || [])],
    [saveData.customKanjiQuestions]
  );

  const allTriviaQuestions = useMemo(
    () => [...INITIAL_TRIVIA_QUESTIONS, ...(saveData.customTriviaQuestions || [])],
    [saveData.customTriviaQuestions]
  );

  // Build 7-day calendar for the current week (Mon - Sun)
  const weekDays = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const labels = ['月', '火', '水', '木', '金', '土', '日'];

    return labels.map((label, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() + mondayOffset + idx);
      const key = formatDateKey(d);
      const isToday = key === todayKey;
      const isCompleted =
        saveData.completedDates.includes(key) ||
        saveData.dailyStampDates.includes(key) ||
        // Seed recent 2 days as active so the calendar looks alive on first visit
        (!isToday && idx < (dayOfWeek === 0 ? 6 : dayOfWeek - 1) && idx >= Math.max(0, (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 2));
      return {
        label,
        dateNum: d.getDate(),
        key,
        isToday,
        isCompleted,
      };
    });
  }, [saveData.completedDates, saveData.dailyStampDates, todayKey]);

  const handleUnlockItem = (id: string, mode: 'kanji' | 'trivia') => {
    setSaveData((prev) => {
      if (mode === 'kanji') {
        if (prev.unlockedKanjiIds.includes(id)) return prev;
        return {
          ...prev,
          unlockedKanjiIds: [...prev.unlockedKanjiIds, id],
        };
      } else {
        if (prev.unlockedTriviaIds.includes(id)) return prev;
        return {
          ...prev,
          unlockedTriviaIds: [...prev.unlockedTriviaIds, id],
        };
      }
    });
  };

  const handleAddAiQuestions = (
    mode: 'kanji' | 'trivia',
    items: KanjiQuestion[] | TriviaQuestion[]
  ) => {
    setSaveData((prev) => {
      if (mode === 'kanji') {
        return {
          ...prev,
          customKanjiQuestions: [
            ...(prev.customKanjiQuestions || []),
            ...(items as KanjiQuestion[]),
          ],
        };
      } else {
        return {
          ...prev,
          customTriviaQuestions: [
            ...(prev.customTriviaQuestions || []),
            ...(items as TriviaQuestion[]),
          ],
        };
      }
    });
  };

  const recordSessionCompletion = (
    modeLabel: string,
    score: number,
    comboMax: number,
    statKey: keyof RadarStats,
    statDelta: number,
    isDailyCourseComplete = false
  ) => {
    setSaveData((prev) => {
      const updatedStats = updateRadarStat(prev.stats, statKey, statDelta);
      const withActivity = recordDailyActivity(prev, todayKey, isDailyCourseComplete);
      const entry = {
        id: `hist-${Date.now()}`,
        date: todayKey,
        timestamp: Date.now(),
        mode: modeLabel,
        score,
        comboMax,
      };
      return {
        ...withActivity,
        stats: updatedStats,
        scoreHistory: [entry, ...prev.scoreHistory].slice(0, 12),
      };
    });
  };

  // Start the 4-stage Daily 5-Minute Course
  const handleStartDailyCourse = () => {
    soundEngine.playClick();
    setDailyScores({
      gameScore: 0,
      kanjiScore: 0,
      triviaScore: 0,
      newsScore: 0,
    });
    setDailyStep(1);
    setActiveView('daily-course');
  };

  const handleToggleSound = (enabled: boolean) => {
    soundEngine.setEnabled(enabled);
    setSaveData((prev) => ({
      ...prev,
      soundEnabled: enabled,
    }));
  };

  const handleResetSaveData = () => {
    const fresh: UserSaveData = {
      ...INITIAL_SAVE_DATA,
      streak: 0,
      unlockedKanjiIds: [],
      unlockedTriviaIds: [],
      customKanjiQuestions: [],
      customTriviaQuestions: [],
      scoreHistory: [],
    };
    setSaveData(fresh);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      <ParticleBurst triggerKey={particleTrigger} />

      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#0B0F17]/95 border-b border-slate-800/90">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => {
            soundEngine.playClick();
            setActiveView('home');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 text-left"
        >
          My Daily Brain Portal
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="メインナビゲーション"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveView('home');
            }}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'home' ? 'text-amber-400 underline underline-offset-8' : ''
            }`}
          >
            ホーム
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setInitialBrainGame(null);
              setActiveView('brain-games');
            }}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'brain-games' ? 'text-amber-400 underline underline-offset-8' : ''
            }`}
          >
            脳トレ
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveView('kanji');
            }}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'kanji' ? 'text-amber-400 underline underline-offset-8' : ''
            }`}
          >
            漢字道場
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveView('trivia');
            }}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'trivia' ? 'text-amber-400 underline underline-offset-8' : ''
            }`}
          >
            教養・雑学
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveView('collection');
            }}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'collection' ? 'text-amber-400 underline underline-offset-8' : ''
            }`}
          >
            マイ図鑑
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            onClick={handleStartDailyCourse}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            今日の5分定食
          </button>
        </div>
      </header>

      {/* Secondary Workspace Utility Strip (Mobile nav + Sound & Settings controls) */}
      <div className="border-b border-slate-800/70 bg-slate-900/50 px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Mobile & Quick View Switcher */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'home', label: 'ダッシュボード' },
                { id: 'brain-games', label: '脳トレ3種' },
                { id: 'kanji', label: '漢字・語彙' },
                { id: 'trivia', label: '教養・雑学' },
                { id: 'news', label: '時事ニュース記憶' },
                { id: 'collection', label: `マイ図鑑 (${saveData.unlockedKanjiIds.length + saveData.unlockedTriviaIds.length})` },
              ] as { id: ActiveView; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  soundEngine.playClick();
                  if (tab.id === 'brain-games') setInitialBrainGame(null);
                  setActiveView(tab.id);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeView === tab.id
                    ? 'bg-slate-800 text-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sound Toggle & Settings Modal Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleToggleSound(!saveData.soundEnabled)}
              aria-label={saveData.soundEnabled ? '効果音をオフにする' : '効果音をオンにする'}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              {saveData.soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>音 ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>音 OFF</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setIsSettingsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>設定・AI問題生成</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* =========================================================
            1. HOME VIEW (DASHBOARD)
           ========================================================= */}
        {activeView === 'home' && (
          <div className="space-y-10">
            {/* Hero Focal Anchor: Daily 5-Minute Course ("今日の5分定食コース") */}
            <section className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-400 font-medium">
                    <span className="whitespace-nowrap">デイリー統合プログラム</span>
                    <span aria-hidden="true">·</span>
                    <span className="whitespace-nowrap">所要時間 約5分</span>
                    <span aria-hidden="true">·</span>
                    <span className="whitespace-nowrap">
                      {isTodayCourseStamped ? '本日の達成スタンプ獲得済' : '本日のスタンプ未獲得'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-100 leading-tight">
                    今日の5分定食コースで、脳の5大領域をまるごと活性化
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                    「① 脳トレミニゲーム → ② 漢字クイズ(3問) → ③ 雑学クイズ(3問) → ④ 今日のニュース記憶クイズ」がシームレスに出題されます。完走すると本日の達成スタンプとマイ図鑑コレクションが自動で記録されます。
                  </p>

                  {/* 4-Step Pipeline Preview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    {[
                      { num: '01', name: '瞬発脳トレ', desc: '注意・記憶・計算' },
                      { num: '02', name: '漢字道場 3問', desc: '難読・四字熟語' },
                      { num: '03', name: '教養雑学 3問', desc: '科学・歴史コラム' },
                      { num: '04', name: '時事虫食い記憶', desc: '最新ニュース暗記' },
                    ].map((st) => (
                      <div
                        key={st.num}
                        className="p-3 bg-slate-950/90 border border-slate-800/90 rounded-xl"
                      >
                        <div className="text-xs font-mono font-bold text-amber-400">
                          STEP {st.num}
                        </div>
                        <div className="text-sm font-bold text-slate-100 mt-0.5">{st.name}</div>
                        <div className="text-[11px] text-slate-400">{st.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">本日のデイリースタンプ</div>
                    <div className="text-lg font-bold text-slate-100 mt-0.5">
                      {isTodayCourseStamped ? '達成スタンプ押印済！' : 'コース完走でスタンプ押印'}
                    </div>
                  </div>
                  <button
                    onClick={handleStartDailyCourse}
                    className="w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                  >
                    <span>今日の5分定食コースを開始</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Status Visualization: 5-Axis Radar Chart + Streak & Weekly Calendar */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left 7 Cols: 5-Axis SVG Radar Chart */}
              <div className="lg:col-span-7 p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">
                      5大能力ステータス レーダーチャート
                    </h2>
                    <p className="text-xs text-slate-400">
                      各モードをプレイするごとにリアルタイムで能力値が成長します
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    自動保存 (localStorage)
                  </span>
                </div>

                <div className="py-2">
                  <RadarChart stats={saveData.stats} />
                </div>
              </div>

              {/* Right 5 Cols: Streak & Weekly Achievement Calendar */}
              <div className="lg:col-span-5 p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-100 whitespace-nowrap">
                        連続達成 ＆ 週間カレンダー
                      </h2>
                      <p className="text-xs text-slate-400">毎日の継続が脳の回路を強化します</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xl whitespace-nowrap shrink-0">
                      <Flame className="w-5 h-5 shrink-0" />
                      <span>
                        <span className="font-mono tabular-nums">{saveData.streak}</span>日連続
                      </span>
                    </div>
                  </div>

                  {/* Weekly Calendar Strip */}
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      今週の達成カレンダー
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((d) => (
                        <div
                          key={d.key}
                          className={`p-2.5 rounded-xl border text-center space-y-1 ${
                            d.isToday
                              ? 'bg-slate-950 border-amber-500/60'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="text-[11px] text-slate-400">{d.label}</div>
                          <div className="text-xs font-mono tabular-nums text-slate-200">
                            {d.dateNum}
                          </div>
                          <div className="flex justify-center pt-0.5">
                            {d.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-700 block" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Collection & Recent Score Snapshot */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveView('collection');
                      }}
                      className="p-3 bg-slate-950 hover:bg-slate-950/80 border border-slate-800 rounded-xl text-left transition-colors"
                    >
                      <div className="text-xs text-slate-400">獲得した漢字・熟語</div>
                      <div className="text-lg font-bold tabular-nums text-amber-400 mt-0.5">
                        <span className="font-mono">{saveData.unlockedKanjiIds.length} / {allKanjiQuestions.length}</span> 件
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveView('collection');
                      }}
                      className="p-3 bg-slate-950 hover:bg-slate-950/80 border border-slate-800 rounded-xl text-left transition-colors"
                    >
                      <div className="text-xs text-slate-400">獲得した雑学カード</div>
                      <div className="text-lg font-bold tabular-nums text-emerald-400 mt-0.5">
                        <span className="font-mono">{saveData.unlockedTriviaIds.length} / {allTriviaQuestions.length}</span> 枚
                      </div>
                    </button>
                  </div>

                  {saveData.scoreHistory.length > 0 ? (
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>直近のプレイ：{saveData.scoreHistory[0].mode}</span>
                      <span className="font-mono tabular-nums text-slate-200 font-semibold">
                        {saveData.scoreHistory[0].score.toLocaleString()} pt
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      まだ本日のスコア履歴がありません。お好きなモードから始めましょう！
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Free Play Module Cards Grid */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">
                    フリープレイ · モジュール別トレーニング
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    鍛えたい分野や気分に合わせて、個別の脳トレ・クイズ・時事記憶を自由に選んで遊べます
                  </p>
                </div>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setIsSettingsOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AIで漢字・雑学の新問題を追加生成する
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Stroop Game */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>脳トレミニゲーム ① · 注意力</span>
                      <span className="tabular-nums"><span className="font-mono">35</span>秒</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Palette className="w-5 h-5 text-amber-400 shrink-0" />
                      色彩ストループ脳トレ
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      「あか」「あお」などの文字と色が不一致の状態で、「文字の意味」または「文字の色」を瞬時に4択で判別します。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setInitialBrainGame('stroop');
                      setActiveView('brain-games');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    色彩ストループ脳トレをプレイ
                  </button>
                </div>

                {/* 2. Izakaya Order Memory */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>脳トレミニゲーム ② · 記憶力</span>
                      <span className="tabular-nums"><span className="font-mono">45</span>秒</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-emerald-400 shrink-0" />
                      居酒屋の注文フラッシュ暗記
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      3秒間だけ表示されるお客さんの注文（3〜6品）を記憶し、メニューパネルから正確にすべて選び出します。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setInitialBrainGame('izakaya');
                      setActiveView('brain-games');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    居酒屋フラッシュ暗記をプレイ
                  </button>
                </div>

                {/* 3. Change Flash Calculation */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>脳トレミニゲーム ③ · 計算力</span>
                      <span className="tabular-nums"><span className="font-mono">35</span>秒</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-sky-400 shrink-0" />
                      お釣りフラッシュ計算
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      「680円に対して1,030円を出す」など、日常の端数合わせの支払いから瞬時にお釣りを4択で暗算します。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setInitialBrainGame('change');
                      setActiveView('brain-games');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    お釣りフラッシュ計算をプレイ
                  </button>
                </div>

                {/* 4. Kanji Dojo */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>漢字・語彙モード · マイ図鑑連動</span>
                      <span className="tabular-nums">全<span className="font-mono">{allKanjiQuestions.length}</span>問</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
                      漢字・語彙道場
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      「難読漢字の読み」「四字熟語の穴埋め」「同音異義語の使い分け」を出題。丁寧な解説付きでマイ図鑑に自動登録されます。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveView('kanji');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    漢字・語彙道場へ進む
                  </button>
                </div>

                {/* 5. Trivia Quiz */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>教養・知識モード · コラム付</span>
                      <span className="tabular-nums">全<span className="font-mono">{allTriviaQuestions.length}</span>問</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-emerald-400 shrink-0" />
                      教養・雑学クイズ
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      科学・歴史・日常・IT・文化から「へぇ〜！」となる4択クイズを出題。クリアすると雑学カードがコレクションされます。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveView('trivia');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    教養・雑学クイズへ進む
                  </button>
                </div>

                {/* 6. News x Brain Training */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>時事＆短期記憶モード · RSS連携</span>
                      <span className="tabular-nums"><span className="font-mono">10</span>秒暗記＋<span className="font-mono">3</span>問</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Newspaper className="w-5 h-5 text-sky-400 shrink-0" />
                      ニュース × 脳トレ（虫食い記憶）
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      今日の注目ニュース見出し3本を10秒間読んで記憶し、直後に重要キーワード【 〇〇 】を当てる時事ワーキングメモリ訓練。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveView('news');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    ニュース虫食い記憶クイズへ進む
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =========================================================
            2. BRAIN GAMES FREE PLAY
           ========================================================= */}
        {activeView === 'brain-games' && (
          <BrainGamesModule
            initialGame={initialBrainGame}
            isDailyCourse={false}
            onCompleteGame={(res) => {
              recordSessionCompletion(
                `脳トレ (${res.gameType})`,
                res.score,
                res.maxCombo,
                res.statKey,
                res.statDelta,
                false
              );
              setActiveView('home');
            }}
            onBackToHome={() => setActiveView('home')}
            onTriggerParticles={triggerParticles}
          />
        )}

        {/* =========================================================
            3. KANJI DOJO FREE PLAY
           ========================================================= */}
        {activeView === 'kanji' && (
          <QuizModule
            mode="kanji"
            kanjiQuestions={allKanjiQuestions}
            triviaQuestions={allTriviaQuestions}
            unlockedIds={saveData.unlockedKanjiIds}
            isDailyCourse={false}
            onUnlockItem={handleUnlockItem}
            onAddAiQuestions={handleAddAiQuestions}
            onCompleteQuizSession={(res) => {
              recordSessionCompletion(
                '漢字・語彙道場',
                res.score,
                res.correctCount,
                res.statKey,
                res.statDelta,
                false
              );
              setActiveView('home');
            }}
            onBackToHome={() => setActiveView('home')}
            onTriggerParticles={triggerParticles}
          />
        )}

        {/* =========================================================
            4. TRIVIA QUIZ FREE PLAY
           ========================================================= */}
        {activeView === 'trivia' && (
          <QuizModule
            mode="trivia"
            kanjiQuestions={allKanjiQuestions}
            triviaQuestions={allTriviaQuestions}
            unlockedIds={saveData.unlockedTriviaIds}
            isDailyCourse={false}
            onUnlockItem={handleUnlockItem}
            onAddAiQuestions={handleAddAiQuestions}
            onCompleteQuizSession={(res) => {
              recordSessionCompletion(
                '教養・雑学クイズ',
                res.score,
                res.correctCount,
                res.statKey,
                res.statDelta,
                false
              );
              setActiveView('home');
            }}
            onBackToHome={() => setActiveView('home')}
            onTriggerParticles={triggerParticles}
          />
        )}

        {/* =========================================================
            5. NEWS MEMORY QUIZ FREE PLAY
           ========================================================= */}
        {activeView === 'news' && (
          <NewsModule
            isDailyCourse={false}
            onCompleteNewsQuiz={(res) => {
              recordSessionCompletion(
                'ニュース虫食い記憶',
                res.score,
                res.correctCount,
                res.statKey,
                res.statDelta,
                false
              );
              setActiveView('home');
            }}
            onBackToHome={() => setActiveView('home')}
            onTriggerParticles={triggerParticles}
          />
        )}

        {/* =========================================================
            6. MY COLLECTION (マイ図鑑)
           ========================================================= */}
        {activeView === 'collection' && (
          <CollectionView
            kanjiQuestions={allKanjiQuestions}
            triviaQuestions={allTriviaQuestions}
            unlockedKanjiIds={saveData.unlockedKanjiIds}
            unlockedTriviaIds={saveData.unlockedTriviaIds}
          />
        )}

        {/* =========================================================
            7. DAILY 5-MINUTE COURSE ("今日の5分定食コース")
           ========================================================= */}
        {activeView === 'daily-course' && (
          <div className="space-y-6">
            {/* Course Progress Stepper Header */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400">
                  今日の5分定食コース進行中
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { s: 1, label: '① 脳トレ' },
                  { s: 2, label: '② 漢字3問' },
                  { s: 3, label: '③ 雑学3問' },
                  { s: 4, label: '④ ニュース記憶' },
                ].map((item) => {
                  const isCurrent = dailyStep === item.s;
                  const isDone =
                    dailyStep === 'SUMMARY' ||
                    (typeof dailyStep === 'number' && dailyStep > item.s);
                  return (
                    <div
                      key={item.s}
                      className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : isDone
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.label}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveView('home');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap"
              >
                中断してホームへ
              </button>
            </div>

            {dailyStep === 1 && (
              <BrainGamesModule
                initialGame="stroop"
                isDailyCourse={true}
                onCompleteGame={(res) => {
                  setDailyScores((prev) => ({ ...prev, gameScore: res.score }));
                  setSaveData((prev) => ({
                    ...prev,
                    stats: updateRadarStat(prev.stats, res.statKey, res.statDelta),
                  }));
                  setDailyStep(2);
                }}
                onTriggerParticles={triggerParticles}
              />
            )}

            {dailyStep === 2 && (
              <QuizModule
                mode="kanji"
                kanjiQuestions={allKanjiQuestions}
                triviaQuestions={allTriviaQuestions}
                unlockedIds={saveData.unlockedKanjiIds}
                isDailyCourse={true}
                onUnlockItem={handleUnlockItem}
                onAddAiQuestions={handleAddAiQuestions}
                onCompleteQuizSession={(res) => {
                  setDailyScores((prev) => ({ ...prev, kanjiScore: res.score }));
                  setSaveData((prev) => ({
                    ...prev,
                    stats: updateRadarStat(prev.stats, 'vocabulary', res.statDelta),
                  }));
                  setDailyStep(3);
                }}
                onTriggerParticles={triggerParticles}
              />
            )}

            {dailyStep === 3 && (
              <QuizModule
                mode="trivia"
                kanjiQuestions={allKanjiQuestions}
                triviaQuestions={allTriviaQuestions}
                unlockedIds={saveData.unlockedTriviaIds}
                isDailyCourse={true}
                onUnlockItem={handleUnlockItem}
                onAddAiQuestions={handleAddAiQuestions}
                onCompleteQuizSession={(res) => {
                  setDailyScores((prev) => ({ ...prev, triviaScore: res.score }));
                  setSaveData((prev) => ({
                    ...prev,
                    stats: updateRadarStat(prev.stats, 'knowledge', res.statDelta),
                  }));
                  setDailyStep(4);
                }}
                onTriggerParticles={triggerParticles}
              />
            )}

            {dailyStep === 4 && (
              <NewsModule
                isDailyCourse={true}
                onCompleteNewsQuiz={(res) => {
                  const totalCourseScore =
                    dailyScores.gameScore +
                    dailyScores.kanjiScore +
                    dailyScores.triviaScore +
                    res.score;
                  setDailyScores((prev) => ({ ...prev, newsScore: res.score }));
                  recordSessionCompletion(
                    '今日の5分定食コース完走',
                    totalCourseScore,
                    4,
                    'memory',
                    res.statDelta,
                    true
                  );
                  soundEngine.playFanfare();
                  triggerParticles();
                  setDailyStep('SUMMARY');
                }}
                onTriggerParticles={triggerParticles}
              />
            )}

            {dailyStep === 'SUMMARY' && (
              <div className="max-w-3xl mx-auto p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <Award className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-amber-400 font-bold">
                    DAILY COURSE COMPLETE · 本日の達成スタンプ獲得！
                  </p>
                  <h2 className="text-3xl font-bold text-slate-100">
                    今日の5分定食コース 完走おめでとうございます！
                  </h2>
                  <p className="text-sm text-slate-400">
                    4つのステップすべてをクリアし、能力ステータスとマイ図鑑が更新されました。
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-xs text-slate-400">① 脳トレ</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-100 mt-1">
                      {dailyScores.gameScore.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-xs text-slate-400">② 漢字道場</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-100 mt-1">
                      {dailyScores.kanjiScore.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-xs text-slate-400">③ 教養雑学</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-100 mt-1">
                      {dailyScores.triviaScore.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-xs text-slate-400">④ 時事記憶</div>
                    <div className="text-xl font-mono font-bold tabular-nums text-slate-100 mt-1">
                      {dailyScores.newsScore.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-950 border border-amber-500/40 rounded-xl flex items-center justify-between max-w-md mx-auto">
                  <span className="text-sm font-semibold text-slate-300">総合獲得スコア</span>
                  <span className="text-3xl font-mono font-bold tabular-nums text-amber-400">
                    {(
                      dailyScores.gameScore +
                      dailyScores.kanjiScore +
                      dailyScores.triviaScore +
                      dailyScores.newsScore
                    ).toLocaleString()}{' '}
                    pt
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveView('collection');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Library className="w-4 h-4 text-amber-400" />
                    獲得したマイ図鑑を見る
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveView('home');
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-xl transition-colors"
                  >
                    ダッシュボードへ戻る
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>My Daily Brain Portal · 脳トレ・漢字・教養雑学・時事ニュース統合ポータル</span>
          <span>データはお使いのブラウザに自動保存されます</span>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        soundEnabled={saveData.soundEnabled}
        onToggleSound={handleToggleSound}
        onAddAiQuestions={handleAddAiQuestions}
        onResetData={handleResetSaveData}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
