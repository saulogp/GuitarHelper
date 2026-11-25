'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Theory, Tunings, Fretboard, ChordShapes, PentatonicShapes } = require('./setup.js');

const FRETS = 22;
const standard = Tunings.strings('standard');

test('afinação padrão: notas e frequências das cordas soltas', () => {
  // Da corda 6 para a 1.
  const table = [['E', 2, 82.41], ['A', 2, 110.0], ['D', 3, 146.83], ['G', 3, 196.0], ['B', 3, 246.94], ['E', 4, 329.63]];
  [...standard].reverse().forEach((string, i) => {
    assert.equal(string.name, table[i][0]);
    assert.equal(string.octave, table[i][1]);
    assert.ok(Math.abs(string.frequency - table[i][2]) < 0.005, `${string.name}${string.octave}: ${string.frequency}`);
  });
});

test('frequência de cada casa: f = f₀ × 2^(n/12)', () => {
  for (const tuning of Tunings.LIST) {
    for (const string of Tunings.strings(tuning.id)) {
      for (let fret = 0; fret <= FRETS; fret++) {
        const byFret = Tunings.fretFrequency(string.frequency, fret);
        const byMidi = Tunings.midiFrequency(string.midi + fret);
        assert.ok(Math.abs(byFret - byMidi) < 1e-9);
      }
    }
  }
  // Casa 12 = uma oitava; casa 5 da corda 6 = Lá 110 Hz.
  assert.ok(Math.abs(Tunings.fretFrequency(standard[5].frequency, 12) - 164.81) < 0.01);
  assert.ok(Math.abs(Tunings.fretFrequency(standard[5].frequency, 5) - 110) < 1e-9);
});

test('afinações alternativas', () => {
  const notes = (id) => [...Tunings.strings(id)].reverse().map((s) => `${s.name}${s.octave}`).join(' ');
  assert.equal(notes('drop-d'), 'D2 A2 D3 G3 B3 E4');
  assert.equal(notes('eb-standard'), 'Eb2 Ab2 Db3 Gb3 Bb3 Eb4');
  assert.equal(notes('d-standard'), 'D2 G2 C3 F3 A3 D4');
  assert.equal(notes('drop-c'), 'C2 G2 C3 F3 A3 D4');
  // Eb Standard: tudo meio tom abaixo do padrão.
  Tunings.strings('eb-standard').forEach((string, i) => assert.equal(string.midi, standard[i].midi - 1));
});

test('oitava de notas grafadas com acidente', () => {
  assert.equal(Tunings.octaveOf('Cb', 59), 4);
  assert.equal(Tunings.octaveOf('B#', 60), 3);
  assert.equal(Tunings.octaveOf('A', 57), 3);
});

test('posições de uma nota no braço', () => {
  const positions = Fretboard.positionsOfPc(standard, Theory.pitchClass('C'), FRETS);
  assert.ok(positions.every(({ string, fret }) => Fretboard.pcAt(standard, string, fret) === 0));
  assert.deepEqual(positions[0], { string: 1, fret: 1 });
});

// Casas de cada corda, da 6 para a 1: "5,8 5,7 5,7 5,7 5,8 5,8".
function drawing(instance) {
  return [5, 4, 3, 2, 1, 0]
    .map((string) => instance.notes.filter((note) => note.string === string).map((note) => note.fret).join(','))
    .join(' ');
}

test('cinco shapes da pentatônica menor de Lá (padrão)', () => {
  const shapes = PentatonicShapes.compute('A', Theory.SCALES.get('pent-minor').degrees, standard, FRETS);
  const first = shapes.map((shape) => drawing(shape.instances.find((instance) => instance.minFret > 1)));
  assert.deepEqual(first, [
    '5,8 5,7 5,7 5,7 5,8 5,8',
    '8,10 7,10 7,10 7,9 8,10 8,10',
    '10,12 10,12 10,12 9,12 10,13 10,12',
    '12,15 12,15 12,14 12,14 13,15 12,15',
    '3,5 3,5 2,5 2,5 3,5 3,5',
  ]);
});

test('shapes: notas da escala, tônica e encaixe entre vizinhos', () => {
  for (const [root, id] of [['A', 'pent-minor'], ['E', 'pent-minor'], ['C', 'pent-major'], ['G', 'pent-major']]) {
    const degrees = Theory.SCALES.get(id).degrees;
    const rootPc = Theory.pitchClass(root);
    const scalePcs = new Set(degrees.map((degree) => (rootPc + Theory.degreeSemitones(degree)) % 12));
    const shapes = PentatonicShapes.compute(root, degrees, standard, FRETS);
    assert.equal(shapes.length, 5);
    for (const shape of shapes) {
      assert.ok(shape.instances.length >= 1);
      for (const instance of shape.instances) {
        assert.equal(instance.notes.length, 12);
        for (const note of instance.notes) {
          assert.ok(scalePcs.has(note.pc));
          assert.equal(Fretboard.pcAt(standard, note.string, note.fret), note.pc);
          assert.equal(note.isRoot, note.pc === rootPc);
          assert.ok(note.finger >= 0 && note.finger <= 4);
        }
        // O shape N começa no grau N, então o shape 1 começa na tônica.
        assert.equal(instance.first.degree, degrees[shape.shape]);
        assert.ok(instance.maxFret - instance.minFret <= 4);
      }
    }
    // O fim de cada shape (notas mais agudas de cada corda) é o começo do seguinte.
    for (let i = 0; i < 4; i++) {
      const current = shapes[i].instances[0];
      const next = shapes[i + 1].instances.find((instance) => instance.minFret >= current.minFret);
      if (!next) continue;
      for (let string = 0; string < 6; string++) {
        const top = current.notes.filter((note) => note.string === string).at(-1);
        const bottom = next.notes.find((note) => note.string === string);
        assert.equal(top.fret, bottom.fret, `${root} ${id} shape ${i + 1}→${i + 2} corda ${string + 1}`);
      }
    }
  }
});

test('shapes acompanham a afinação', () => {
  const dropD = Tunings.strings('drop-d');
  const shape = PentatonicShapes.compute('A', Theory.SCALES.get('pent-minor').degrees, dropD, FRETS)[0];
  // Em Drop D, só a corda 6 muda: as notas sobem duas casas nela.
  assert.equal(drawing(shape.instances[0]), '7,10 5,7 5,7 5,7 5,8 5,8');
});

test('formas de acorde: notas corretas e cordas abafadas', () => {
  for (const id of ['maj', 'min', '7', 'm7', 'dim', 'maj7']) {
    const chord = Theory.CHORDS.get(id);
    for (const root of ['C', 'E', 'G', 'A', 'Bb', 'F#']) {
      const tones = new Set(chord.degrees.map((degree) => (Theory.pitchClass(root) + Theory.degreeSemitones(degree) + 12) % 12));
      const voicings = ChordShapes.find(root, chord, standard, FRETS);
      assert.ok(voicings.length > 0, `${root}${chord.symbol}`);
      for (const voicing of voicings) {
        voicing.frets.forEach((fret, string) => {
          if (fret !== null) assert.ok(tones.has(Fretboard.pcAt(standard, string, fret)));
        });
        // O baixo é a tônica.
        const bass = voicing.frets[voicing.bassString];
        assert.equal(Fretboard.pcAt(standard, voicing.bassString, bass), Theory.pitchClass(root));
      }
    }
  }
  const c = ChordShapes.find('C', Theory.CHORDS.get('maj'), standard, FRETS)[0];
  assert.equal(ChordShapes.tabText(c), 'x-3-2-0-1-0');
  // Ordem da palhetada: da corda mais grave para a mais aguda, sem a abafada.
  assert.deepEqual(ChordShapes.soundingPositions(c).map(({ string }) => string), [4, 3, 2, 1, 0]);
});
