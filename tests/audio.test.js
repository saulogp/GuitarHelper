'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Tunings, GuitarAudio } = require('./setup.js');

const SAMPLE_RATE = 48000;

// Frequência medida por autocorrelação, com interpolação parabólica do pico.
function measure(samples, expected) {
  const segment = samples.subarray(Math.round(SAMPLE_RATE * 0.2), Math.round(SAMPLE_RATE * 0.7));
  const correlation = (lag) => {
    let sum = 0;
    for (let i = 0; i + lag < segment.length; i++) sum += segment[i] * segment[i + lag];
    return sum;
  };
  const period = SAMPLE_RATE / expected;
  let bestLag = 0;
  let best = -Infinity;
  for (let lag = Math.floor(period * 0.9); lag <= Math.ceil(period * 1.1); lag++) {
    const value = correlation(lag);
    if (value > best) {
      best = value;
      bestLag = lag;
    }
  }
  const [a, b, c] = [correlation(bestLag - 1), best, correlation(bestLag + 1)];
  return SAMPLE_RATE / (bestLag + (0.5 * (a - c)) / (a - 2 * b + c));
}

test('a corda sintetizada soa na frequência da nota (até 1 centésimo de semitom)', () => {
  for (const instrument of GuitarAudio.INSTRUMENTS) {
    // Da corda mais grave do Drop C (C2) à casa 22 da corda 1 (D6).
    for (const midi of [36, 40, 45, 50, 55, 59, 64, 69, 76, 86]) {
      const expected = Tunings.midiFrequency(midi);
      const samples = GuitarAudio.renderString(expected, SAMPLE_RATE, instrument.pluck, 0.8, midi);
      const cents = 1200 * Math.log2(measure(samples, expected) / expected);
      assert.ok(Math.abs(cents) < 1, `${instrument.id} MIDI ${midi}: ${cents.toFixed(2)} cents`);
    }
  }
});

test('a nota decai como uma corda, sem estourar a saída', () => {
  const pluck = GuitarAudio.INSTRUMENTS[0].pluck;
  const samples = GuitarAudio.renderString(110, SAMPLE_RATE, pluck, 3, 1);
  const rms = (from, to) => {
    let sum = 0;
    for (let i = from; i < to; i++) sum += samples[i] ** 2;
    return Math.sqrt(sum / (to - from));
  };
  const start = rms(0, SAMPLE_RATE * 0.2);
  const later = rms(SAMPLE_RATE * 2, SAMPLE_RATE * 2.2);
  assert.ok(later < start * 0.5, 'perde energia com o tempo');
  const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  assert.ok(peak <= pluck.level + 1e-6, 'pico normalizado');
  assert.equal(samples.at(-1), 0, 'termina em silêncio, sem estalo');
});
