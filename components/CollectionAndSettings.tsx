'use client';

import React, { useState } from 'react';
import {
  Library,
  Search,
  Lock,
  BookOpen,
  Lightbulb,
  Volume2,
  VolumeX,
  Sparkles,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { KanjiQuestion, TriviaQuestion } from '@/lib/brain-logic';
import { soundEngine } from '@/lib/sound-engine';

interface CollectionViewProps {
  kanjiQuestions: KanjiQuestion[];
  triviaQuestions: TriviaQuestion[];
  unlockedKanjiIds: string[];
  unlockedTriviaIds: string[];
}

export function CollectionView({
  kanjiQuestions,
  triviaQuestions,
  unlockedKanjiIds,
  unlockedTriviaIds,
}: CollectionViewProps) {
  const [activeTab, setActiveTab] = useState<'kanji' | 'trivia'>('kanji');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState<boolean>(false);

  const filteredKanji = kanjiQuestions.filter((item) => {
    const isUnlocked = unlockedKanjiIds.includes(item.id);
    if (showUnlockedOnly && !isUnlocked) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.targetWord.toLowerCase().includes(q) ||
      (item.reading && item.reading.toLowerCase().includes(q)) ||
      item.explanation.toLowerCase().includes(q)
    );
  });

  const filteredTrivia = triviaQuestions.filter((item) => {
    const isUnlocked = unlockedTriviaIds.includes(item.id);
    if (showUnlockedOnly && !isUnlocked) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.question.toLowerCase().includes(q) ||
      item.explanation.toLowerCase().includes(q)
    );
  });

  const kanjiRate = Math.round((unlockedKanjiIds.length / Math.max(1, kanjiQuestions.length)) * 100);
  const triviaRate = Math.round((unlockedTriviaIds.length / Math.max(1, triviaQuestions.length)) * 100);

  return (
    <div className="space-y-6">
      {/* Header & Progress */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
            <Library className="w-4 h-4" />
            知識アーカイブ · マイ図鑑
          </div>
          <h2 className="text-2xl font-bold text-slate-100">
            獲得した漢字・語彙＆雑学コレクション
          </h2>
          <p className="text-sm text-slate-400">
            クイズに解答するたびに図鑑が解放され、いつでも解説や豆知識コラムを見返せます。
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-400">漢字・語彙 解放率</div>
            <div className="text-xl font-mono font-bold tabular-nums text-amber-400">
              {unlockedKanjiIds.length} / {kanjiQuestions.length} ({kanjiRate}%)
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">雑学カード 解放率</div>
            <div className="text-xl font-mono font-bold tabular-nums text-emerald-400">
              {unlockedTriviaIds.length} / {triviaQuestions.length} ({triviaRate}%)
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('kanji');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'kanji'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            漢字・四字熟語 ({unlockedKanjiIds.length}/{kanjiQuestions.length})
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('trivia');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'trivia'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            雑学カード ({unlockedTriviaIds.length}/{triviaQuestions.length})
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1 sm:flex-initial justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードで図鑑を検索..."
              aria-label="マイ図鑑を検索"
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              setShowUnlockedOnly((prev) => !prev);
            }}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              showUnlockedOnly
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            獲得済みのみ表示
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {activeTab === 'kanji' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredKanji.map((item) => {
            const isUnlocked = unlockedKanjiIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`p-5 rounded-xl border transition-colors ${
                  isUnlocked
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-900/40 border-slate-800/60 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>
                    {item.category}
                    {item.isAiGenerated ? ' · AI生成' : ''}
                  </span>
                  {isUnlocked ? (
                    <span className="text-emerald-400 font-medium">獲得済</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Lock className="w-3 h-3" />
                      未解放
                    </span>
                  )}
                </div>

                {isUnlocked ? (
                  <div className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xl font-bold text-slate-100">{item.targetWord}</h3>
                      <span className="text-xs font-semibold text-amber-400">
                        答え：{item.options[item.correctIndex]}（{item.reading}）
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.explanation}</p>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      用例：{item.example}
                    </p>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-1">
                    <div className="text-base font-bold text-slate-400">{item.targetWord}</div>
                    <p className="text-xs text-slate-500">
                      「漢字・語彙道場」または「今日の5分定食」でこの問題を解くと解説が解放されます。
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTrivia.map((item) => {
            const isUnlocked = unlockedTriviaIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`p-5 rounded-xl border transition-colors ${
                  isUnlocked
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-900/40 border-slate-800/60 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>
                    ジャンル：{item.genre}
                    {item.isAiGenerated ? ' · AI生成' : ''}
                  </span>
                  {isUnlocked ? (
                    <span className="text-emerald-400 font-medium">獲得済</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Lock className="w-3 h-3" />
                      未解放
                    </span>
                  )}
                </div>

                {isUnlocked ? (
                  <div className="space-y-2.5">
                    <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.explanation}</p>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 leading-relaxed">
                      <span className="text-amber-400 font-semibold mr-1">コラム:</span>
                      {item.column}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-1">
                    <div className="text-sm font-bold text-slate-400">{item.title}</div>
                    <p className="text-xs text-slate-500">
                      「教養・雑学クイズ」または「今日の5分定食」でこの問題を解くとコラムが解放されます。
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onAddAiQuestions: (
    mode: 'kanji' | 'trivia',
    items: KanjiQuestion[] | TriviaQuestion[]
  ) => void;
  onResetData: () => void;
  onClose: () => void;
}

export function SettingsModal({
  isOpen,
  soundEnabled,
  onToggleSound,
  onAddAiQuestions,
  onResetData,
  onClose,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<'kanji' | 'trivia' | null>(null);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateFromModal = async (type: 'kanji' | 'trivia') => {
    soundEngine.playClick();
    setIsGenerating(type);
    setGenMessage(null);
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        onAddAiQuestions(type, data.items);
        setGenMessage(
          `${type === 'kanji' ? '漢字・語彙' : '教養・雑学'}の新問題を ${data.items.length}問 追加しました！`
        );
        soundEngine.playCorrect(3);
      }
    } catch {
      setGenMessage('問題の追加に失敗しました。');
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 id="settings-modal-title" className="text-lg font-bold text-slate-100">
            ポータル設定 ＆ AI問題生成
          </h2>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="設定を閉じる"
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Web Audio Sound Synthesis Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-amber-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                Web Audio シンセサイザー効果音
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                外部音源を使わずブラウザ内蔵シンセで正解コンボ音やファンファーレを合成します。
              </p>
            </div>
            <button
              onClick={() => {
                const next = !soundEnabled;
                onToggleSound(next);
                if (next) {
                  setTimeout(() => soundEngine.playCorrect(2), 50);
                }
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                soundEnabled
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {soundEnabled ? '効果音 ON' : '効果音 OFF'}
            </button>
          </div>

          {soundEnabled && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => soundEngine.playCorrect(4)}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              >
                コンボ正解音を試聴
              </button>
              <button
                onClick={() => soundEngine.playFanfare()}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              >
                クリアファンファーレを試聴
              </button>
            </div>
          )}
        </div>

        {/* 2. Server-Side Gemini AI Question Generator */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Gemini AI 無限問題ジェネレーター（サーバー連携済）
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI StudioのサーバーサイドGemini連携により、ボタンひとつで新しい漢字クイズ・雑学クイズをオンデマンド生成して問題バンクとマイ図鑑に追加できます。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleGenerateFromModal('kanji')}
              disabled={isGenerating !== null}
              className="py-2.5 px-4 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isGenerating === 'kanji' ? '漢字問題を生成中...' : '+ AIで漢字問題を生成追加'}
            </button>
            <button
              onClick={() => handleGenerateFromModal('trivia')}
              disabled={isGenerating !== null}
              className="py-2.5 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isGenerating === 'trivia' ? '雑学問題を生成中...' : '+ AIで雑学問題を生成追加'}
            </button>
          </div>

          {genMessage && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{genMessage}</span>
            </div>
          )}
        </div>

        {/* 3. Save Data Reset */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            セーブデータの初期化
          </div>
          {!confirmReset ? (
            <button
              onClick={() => {
                soundEngine.playClick();
                setConfirmReset(true);
              }}
              className="px-4 py-2 text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg transition-colors"
            >
              セーブデータをリセットする
            </button>
          ) : (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-3">
              <p className="text-xs text-rose-200">
                連続達成日数・レーダーステータス・マイ図鑑の解放状況を初期状態に戻します。よろしいですか？
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundEngine.playWrong();
                    onResetData();
                    setConfirmReset(false);
                    onClose();
                  }}
                  className="px-4 py-1.5 text-xs font-bold bg-rose-500 hover:bg-rose-400 text-slate-950 rounded-lg transition-colors"
                >
                  はい、初期化する
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setConfirmReset(false);
                  }}
                  className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
