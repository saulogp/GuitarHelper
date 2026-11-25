'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Theory } = require('./setup.js');

const names = (field) => field.chords.map((chord) => chord.name);

test('grafia das notas pelo grau', () => {
  const spell = (root, id) => Theory.SCALES.get(id).degrees.map((degree) => Theory.spellDegree(root, degree).name);
  assert.deepEqual(spell('F', 'major'), ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
  assert.deepEqual(spell('E', 'major'), ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#']);
  assert.deepEqual(spell('Eb', 'minor'), ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db']);
  assert.deepEqual(spell('A', 'pent-minor'), ['A', 'C', 'D', 'E', 'G']);
  assert.deepEqual(spell('C', 'pent-major'), ['C', 'D', 'E', 'G', 'A']);
});

test('dobrados: simplificados nas cifras, mantidos na tonalidade', () => {
  assert.equal(Theory.spellDegree('C', 'bb7').name, 'A');
  assert.equal(Theory.spellDegree('G#', '7', { doubles: true }).name, 'F##');
});

test('acordes reconhecidos pelos intervalos', () => {
  assert.equal(Theory.chordFromSemitones([0, 4, 7]).id, 'maj');
  assert.equal(Theory.chordFromSemitones([0, 3, 7]).id, 'min');
  assert.equal(Theory.chordFromSemitones([0, 3, 6]).id, 'dim');
  assert.equal(Theory.chordFromSemitones([0, 4, 8]).id, 'aug');
  assert.equal(Theory.chordFromSemitones([0, 4, 7, 10]).id, '7');
  assert.equal(Theory.chordFromSemitones([0, 3, 6, 10]).id, 'm7b5');
  assert.equal(Theory.chordFromSemitones([0, 3, 6, 9]).id, 'dim7');
});

test('campos harmônicos maiores', () => {
  assert.deepEqual(names(Theory.harmonicField('C', 'major')), ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
  assert.deepEqual(names(Theory.harmonicField('G', 'major')), ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
  assert.deepEqual(names(Theory.harmonicField('D', 'major')), ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim']);
  assert.deepEqual(names(Theory.harmonicField('F', 'major')), ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim']);
  assert.deepEqual(
    names(Theory.harmonicField('C', 'major', 'tetrads')),
    ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7(b5)'],
  );
});

test('campos harmônicos menores', () => {
  assert.deepEqual(names(Theory.harmonicField('A', 'minor')), ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  assert.deepEqual(names(Theory.harmonicField('A', 'harmonic')), ['Am', 'Bdim', 'Caug', 'Dm', 'E', 'F', 'G#dim']);
  assert.deepEqual(
    names(Theory.harmonicField('A', 'harmonic', 'tetrads')),
    ['Am(maj7)', 'Bm7(b5)', 'Cmaj7(#5)', 'Dm7', 'E7', 'Fmaj7', 'G#dim7'],
  );
});

test('graus, numerais e funções', () => {
  const major = Theory.harmonicField('C', 'major');
  assert.deepEqual(major.chords.map((chord) => chord.numeral), ['I', 'IIm', 'IIIm', 'IV', 'V', 'VIm', 'VII°']);
  assert.deepEqual(major.chords.map((chord) => chord.function), [
    'Tônica', 'Subdominante', 'Tônica', 'Subdominante', 'Dominante', 'Tônica', 'Dominante',
  ]);
  const minor = Theory.harmonicField('A', 'minor');
  assert.deepEqual(minor.chords.map((chord) => chord.numeral), ['Im', 'II°', 'bIII', 'IVm', 'Vm', 'bVI', 'bVII']);
  assert.equal(major.chords[1].spoken, 'Ré menor');
  assert.equal(major.chords[6].spoken, 'Si diminuto');
  assert.deepEqual(major.chords[1].formula, ['1', 'b3', '5']);
  assert.deepEqual(major.chords[1].tones.map((tone) => tone.name), ['D', 'F', 'A']);
});

test('tonalidade escrita com menos acidentes', () => {
  assert.equal(Theory.harmonicField('C#', 'major').key, 'Db');
  assert.equal(Theory.harmonicField('Ab', 'minor').key, 'G#');
  assert.equal(Theory.harmonicField('Ab', 'harmonic').key, 'G#');
  assert.equal(Theory.harmonicField('F#', 'major').key, 'F#');
  // G# menor harmônica tem F## como sensível: V = D#, VII = F##dim.
  const field = Theory.harmonicField('Ab', 'harmonic');
  assert.deepEqual(field.chords[4].tones.map((tone) => tone.name), ['D#', 'F##', 'A#']);
  assert.equal(field.chords[6].name, 'F##dim');
});

test('todos os campos têm 7 acordes reconhecidos e notas da escala', () => {
  for (const root of Theory.ROOTS) {
    for (const mode of Theory.FIELD_MODES) {
      for (const size of ['triads', 'tetrads']) {
        const field = Theory.harmonicField(root, mode.id, size);
        assert.equal(field.chords.length, 7);
        const scalePcs = new Set(field.notes.map((note) => note.pc));
        for (const chord of field.chords) {
          assert.ok(chord.chord, `${root} ${mode.id} ${size} grau ${chord.index + 1}`);
          for (const tone of chord.tones) assert.ok(scalePcs.has(tone.pc));
          // Letras em terças: cada nota do acorde pula uma letra.
          const letters = chord.tones.map((tone) => Theory.LETTERS.indexOf(tone.name[0]));
          letters.slice(1).forEach((letter, i) => assert.equal((letter - letters[i] + 7) % 7, 2));
        }
      }
    }
  }
});
