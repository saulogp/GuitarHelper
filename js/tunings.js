'use strict';

/*
  Afinações e frequências: a única referência de altura do app. O braço, os acordes,
  os shapes e o som leem daqui a nota (e a oitava) de cada corda solta, então o que
  se vê e o que se ouve nunca divergem.

  As cordas vão da 1 (mais aguda, índice 0) até a 6 (índice 5), como no braço.
*/
const Tunings = (() => {
  const A4_MIDI = 69;
  const A4_FREQUENCY = 440;

  // Da corda 6 para a 1, como se costuma escrever uma afinação.
  const LIST = [
    { id: 'standard', label: 'Padrão', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    { id: 'drop-d', label: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    { id: 'eb-standard', label: 'Eb Standard', notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
    { id: 'd-standard', label: 'D Standard', notes: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
    { id: 'drop-c', label: 'Drop C', notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  ];

  const LETTER_PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // "Eb2" → { name: 'Eb', octave: 2, pc: 3, midi: 39 }. Dó central (C4) é o MIDI 60.
  function parseNote(text) {
    const match = /^([A-G])([#b]*)(-?\d)$/.exec(text);
    const [, letter, signs, octaveText] = match;
    const accidental = [...signs].reduce((sum, sign) => sum + (sign === '#' ? 1 : -1), 0);
    const octave = Number(octaveText);
    const midi = (octave + 1) * 12 + LETTER_PCS[letter] + accidental;
    return { name: letter + signs, octave, pc: ((midi % 12) + 12) % 12, midi };
  }

  function get(id) {
    return LIST.find((tuning) => tuning.id === id) ?? LIST[0];
  }

  // Cordas da afinação, da 1 (índice 0) até a 6, com nota, classe de altura, MIDI e
  // frequência da corda solta.
  function strings(id) {
    return [...get(id).notes].reverse().map((text, index) => {
      const note = parseNote(text);
      return { number: index + 1, ...note, frequency: midiFrequency(note.midi) };
    });
  }

  // Temperamento igual com Lá 440 Hz.
  function midiFrequency(midi) {
    return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12);
  }

  // f = f₀ × 2^(n/12): a corda solta (f₀) sobe um semitom por casa (n casas).
  function fretFrequency(openFrequency, fret) {
    return openFrequency * 2 ** (fret / 12);
  }

  // Oitava de uma nota já grafada: Cb4 soa como B3, e B#3 soa como C4.
  function octaveOf(name, midi) {
    const natural = midi - [...name.slice(1)].reduce((sum, sign) => sum + (sign === '#' ? 1 : -1), 0);
    return Math.floor(natural / 12) - 1;
  }

  function describeTuning(id) {
    return get(id).notes.map((text) => parseNote(text).name).join(' ');
  }

  return {
    LIST,
    get,
    strings,
    parseNote,
    midiFrequency,
    fretFrequency,
    octaveOf,
    describeTuning,
  };
})();

/*
  Geometria do braço: onde cada altura aparece. Funções puras, que recebem as cordas
  da afinação atual (Tunings.strings).
*/
const Fretboard = (() => {
  function midiAt(strings, string, fret) {
    return strings[string].midi + fret;
  }

  function pcAt(strings, string, fret) {
    return (strings[string].pc + fret) % 12;
  }

  // Todas as posições de uma classe de altura, da casa mais baixa para a mais alta e,
  // na mesma casa, da corda mais grave para a mais aguda.
  function positionsOfPc(strings, pc, fretCount) {
    const found = [];
    for (let fret = 0; fret <= fretCount; fret++) {
      for (let string = strings.length - 1; string >= 0; string--) {
        if (pcAt(strings, string, fret) === pc) found.push({ string, fret });
      }
    }
    return found;
  }

  function positionsOfMidi(strings, midi, fretCount) {
    return strings.flatMap((open, string) => {
      const fret = midi - open.midi;
      return fret >= 0 && fret <= fretCount ? [{ string, fret }] : [];
    });
  }

  // Escolhe onde tocar cada altura de uma sequência perto de uma região da mão
  // (anchor = casa do indicador), como um guitarrista faria: fica na região, prefere
  // não pular de corda à toa e só sai da região quando a nota não cabe nela.
  function findPath(strings, midis, { anchor, fretCount }) {
    const path = [];
    let previous = null;
    for (const midi of midis) {
      const options = positionsOfMidi(strings, midi, fretCount);
      if (options.length === 0) return null;
      const cost = ({ string, fret }) => {
        const low = anchor - 1;
        const high = anchor + 4;
        const outside = fret === 0 && anchor <= 2 ? 0 : fret < low ? low - fret : fret > high ? fret - high : 0;
        const jump = previous ? Math.abs(string - previous.string) : 0;
        const backwards = previous && midi > previous.midi && string > previous.string ? 2 : 0;
        return outside * 4 + jump + backwards;
      };
      const best = options.reduce((a, b) => (cost(b) < cost(a) ? b : a));
      previous = { ...best, midi };
      path.push(previous);
    }
    return path;
  }

  return { midiAt, pcAt, positionsOfPc, positionsOfMidi, findPath };
})();

if (typeof module === 'object' && module.exports) module.exports = { Tunings, Fretboard };
