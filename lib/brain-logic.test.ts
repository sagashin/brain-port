import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getComboMultiplier,
  calculateAnswerScore,
  updateRadarStat,
  recordDailyActivity,
  generateStroopRound,
  generateIzakayaRound,
  verifyIzakayaSelection,
  generateChangeCalcRound,
  buildNewsClozeQuestions,
  INITIAL_SAVE_DATA,
} from './brain-logic';

test('combo multiplier scales properly with consecutive correct answers', () => {
  assert.equal(getComboMultiplier(0), 1.0);
  assert.equal(getComboMultiplier(2), 1.2);
  assert.equal(getComboMultiplier(4), 1.5);
  assert.equal(getComboMultiplier(6), 2.0);
  assert.equal(getComboMultiplier(10), 2.5);
});

test('calculateAnswerScore applies combo multiplier and speed bonus', () => {
  assert.equal(calculateAnswerScore(100, 0, 20), 120);
  assert.equal(calculateAnswerScore(100, 4, 0), 150);
  assert.equal(calculateAnswerScore(100, 6, 50), 300);
});

test('updateRadarStat clamps between 15 and 100', () => {
  const base = INITIAL_SAVE_DATA.stats;
  const increased = updateRadarStat(base, 'calculation', 80);
  assert.equal(increased.calculation, 100);
  const decreased = updateRadarStat(base, 'attention', -90);
  assert.equal(decreased.attention, 15);
});

test('recordDailyActivity increments streak on consecutive day and records daily stamp', () => {
  const start = {
    ...INITIAL_SAVE_DATA,
    streak: 3,
    lastPlayedDate: '2026-10-22',
    completedDates: ['2026-10-22'],
    dailyStampDates: [],
  };
  const updated = recordDailyActivity(start, '2026-10-23', true);
  assert.equal(updated.streak, 4);
  assert.equal(updated.lastPlayedDate, '2026-10-23');
  assert.ok(updated.completedDates.includes('2026-10-23'));
  assert.ok(updated.dailyStampDates.includes('2026-10-23'));
});

test('generateStroopRound enforces Stroop mismatch between word meaning and ink color', () => {
  for (let i = 0; i < 20; i++) {
    const round = generateStroopRound();
    assert.notEqual(round.wordItem.id, round.inkItem.id);
    if (round.mode === 'MEANING') {
      assert.equal(round.correctColorId, round.wordItem.id);
    } else {
      assert.equal(round.correctColorId, round.inkItem.id);
    }
  }
});

test('generateIzakayaRound and verifyIzakayaSelection validate exact menu orders', () => {
  const round = generateIzakayaRound(1);
  assert.equal(round.orderCount, 3);
  assert.equal(round.targetIds.length, 3);
  assert.equal(verifyIzakayaSelection(round.targetIds, [...round.targetIds].reverse()), true);
  assert.equal(verifyIzakayaSelection(round.targetIds, [round.targetIds[0]]), false);
});

test('generateChangeCalcRound produces exact change and 4 valid sorted options', () => {
  for (let i = 0; i < 20; i++) {
    const round = generateChangeCalcRound(2);
    assert.ok(round.paid > round.price);
    assert.equal(round.correctChange, round.paid - round.price);
    assert.equal(round.options.length, 4);
    assert.equal(round.options[round.correctIndex], round.correctChange);
  }
});

test('buildNewsClozeQuestions masks keyword with 【 〇〇 】 and includes 4 options', () => {
  const sampleArticles = [
    {
      id: 'n1',
      title: '次世代ペロブスカイト太陽電池の量産化に向けた実証実験が開始',
      summary: '薄くて曲げられる次世代型太陽電池の実証実験が始まりました。',
      category: '科学・技術',
      publishedAt: '2026-10-23',
      url: 'https://www3.nhk.or.jp/news/',
      keyword: 'ペロブスカイト',
      distractors: ['シリコン結晶', 'カーボンナノ', '超電導コイル'],
    },
  ];
  const questions = buildNewsClozeQuestions(sampleArticles);
  assert.equal(questions.length, 1);
  assert.ok(questions[0].maskedTitle.includes('【 〇〇 】'));
  assert.equal(questions[0].options.length, 4);
  assert.equal(questions[0].options[questions[0].correctIndex], 'ペロブスカイト');
});
