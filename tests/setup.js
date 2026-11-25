'use strict';

// Carrega os módulos do app no Node como no navegador: cada um vira um nome global,
// porque alguns módulos usam os outros (os shapes usam Theory, por exemplo).
const path = require('node:path');

const root = path.join(__dirname, '..', 'js');

globalThis.Theory = require(path.join(root, 'theory.js'));
const { Tunings, Fretboard } = require(path.join(root, 'tunings.js'));
globalThis.Tunings = Tunings;
globalThis.Fretboard = Fretboard;
globalThis.ChordShapes = require(path.join(root, 'chords.js'));
globalThis.PentatonicShapes = require(path.join(root, 'shapes.js'));
const { GuitarAudio } = require(path.join(root, 'audio.js'));
globalThis.GuitarAudio = GuitarAudio;

module.exports = {
  Theory: globalThis.Theory,
  Tunings,
  Fretboard,
  ChordShapes: globalThis.ChordShapes,
  PentatonicShapes: globalThis.PentatonicShapes,
  GuitarAudio,
};
