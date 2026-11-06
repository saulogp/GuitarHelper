'use strict';

const FRET_COUNT = 22;
const MARKED_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21];

// Da corda 1 (mais aguda, no topo) até a corda 6.
const STRINGS = [
  { name: 'E', pc: 4, thickness: 1 },
  { name: 'B', pc: 11, thickness: 1.3 },
  { name: 'G', pc: 7, thickness: 1.7 },
  { name: 'D', pc: 2, thickness: 2.1 },
  { name: 'A', pc: 9, thickness: 2.6 },
  { name: 'E', pc: 4, thickness: 3.2 },
];

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
const SOLFEGE = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' };
const INTERVALS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

const SCALE_GROUPS = [
  {
    label: 'Sem escala',
    scales: [
      { id: 'none', label: 'Nenhuma (só seleção manual)', degrees: [] },
      { id: 'note', label: 'Apenas a nota escolhida', degrees: ['1'] },
      { id: 'chromatic', label: 'Cromática (todas as notas)', degrees: INTERVALS },
    ],
  },
  {
    label: 'Maiores e menores',
    scales: [
      { id: 'major', label: 'Maior', degrees: ['1', '2', '3', '4', '5', '6', '7'] },
      { id: 'minor', label: 'Menor natural', degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
      { id: 'harmonic', label: 'Menor harmônica', degrees: ['1', '2', 'b3', '4', '5', 'b6', '7'] },
      { id: 'melodic', label: 'Menor melódica', degrees: ['1', '2', 'b3', '4', '5', '6', '7'] },
    ],
  },
  {
    label: 'Pentatônicas e blues',
    scales: [
      { id: 'pent-major', label: 'Pentatônica maior', degrees: ['1', '2', '3', '5', '6'] },
      { id: 'pent-minor', label: 'Pentatônica menor', degrees: ['1', 'b3', '4', '5', 'b7'] },
      { id: 'blues', label: 'Blues', degrees: ['1', 'b3', '4', 'b5', '5', 'b7'] },
    ],
  },
  {
    label: 'Modos',
    scales: [
      { id: 'dorian', label: 'Dórico', degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
      { id: 'phrygian', label: 'Frígio', degrees: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] },
      { id: 'lydian', label: 'Lídio', degrees: ['1', '2', '3', '#4', '5', '6', '7'] },
      { id: 'mixolydian', label: 'Mixolídio', degrees: ['1', '2', '3', '4', '5', '6', 'b7'] },
      { id: 'locrian', label: 'Lócrio', degrees: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'] },
    ],
  },
];

const SCALES = new Map(SCALE_GROUPS.flatMap((group) => group.scales).map((scale) => [scale.id, scale]));

const CHORD_GROUPS = [
  {
    label: 'Tríades',
    chords: [
      { id: 'maj', symbol: '', label: 'Maior', degrees: ['1', '3', '5'] },
      { id: 'min', symbol: 'm', label: 'Menor', degrees: ['1', 'b3', '5'] },
      { id: 'dim', symbol: 'dim', label: 'Diminuto', degrees: ['1', 'b3', 'b5'] },
      { id: 'aug', symbol: 'aug', label: 'Aumentado', degrees: ['1', '3', '#5'] },
      { id: 'sus2', symbol: 'sus2', label: 'Suspenso com 2ª', degrees: ['1', '2', '5'] },
      { id: 'sus4', symbol: 'sus4', label: 'Suspenso com 4ª', degrees: ['1', '4', '5'] },
      { id: 'power', symbol: '5', label: 'Power chord', degrees: ['1', '5'], maxStrings: 3 },
    ],
  },
  {
    label: 'Sétimas e sextas',
    chords: [
      { id: '7', symbol: '7', label: 'Com sétima', degrees: ['1', '3', '5', 'b7'] },
      { id: 'maj7', symbol: 'maj7', label: 'Com sétima maior', degrees: ['1', '3', '5', '7'] },
      { id: 'm7', symbol: 'm7', label: 'Menor com sétima', degrees: ['1', 'b3', '5', 'b7'] },
      { id: 'm7b5', symbol: 'm7(b5)', label: 'Meio diminuto', degrees: ['1', 'b3', 'b5', 'b7'] },
      { id: 'dim7', symbol: 'dim7', label: 'Diminuto com sétima', degrees: ['1', 'b3', 'b5', 'bb7'] },
      { id: '7sus4', symbol: '7sus4', label: 'Com sétima e 4ª suspensa', degrees: ['1', '4', '5', 'b7'] },
      { id: '6', symbol: '6', label: 'Com sexta', degrees: ['1', '3', '5', '6'] },
      { id: 'm6', symbol: 'm6', label: 'Menor com sexta', degrees: ['1', 'b3', '5', '6'] },
    ],
  },
  {
    label: 'Com nona',
    chords: [
      { id: 'add9', symbol: 'add9', label: 'Com nona adicionada', degrees: ['1', '3', '5', '9'] },
      { id: '9', symbol: '9', label: 'Com sétima e nona', degrees: ['1', '3', '5', 'b7', '9'] },
      { id: 'm9', symbol: 'm9', label: 'Menor com sétima e nona', degrees: ['1', 'b3', '5', 'b7', '9'] },
    ],
  },
];

const CHORDS = new Map(CHORD_GROUPS.flatMap((group) => group.chords).map((chord) => [chord.id, chord]));

const MAX_FRET_SPAN = 3; // distância máxima entre casas pressionadas numa mesma forma
const MAX_FINGERS = 4;
const OPEN_POSITION_MAX_FRET = 3; // formas com cordas soltas só pressionam até esta casa

const BPM_MIN = 30;
const BPM_MAX = 240;
const BEATS_PER_BAR = 4;
const SCHEDULE_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;

const state = {
  mode: 'scales', // 'scales', 'chords' ou 'training'
  root: 'C',
  scale: 'major',
  chord: 'maj',
  voicing: 0, // índice da variação; -1 mostra todas as notas do acorde
  bpm: 80,
  rampEnabled: false,
  rampEvery: 4, // quantos loops tocar antes de aumentar o BPM
  rampStep: 10,
  trainingItems: [], // [{ root, chord, voicing }], na ordem em que foram adicionados
  trainingOrder: 'sequence', // 'sequence' ou 'random'
  trainingUnit: 'loops', // 'loops' ou 'beats'
  trainingLoops: 1,
  trainingBeats: 4,
  notation: 'letters',
  selected: [], // [{ string, fret }], a mais recente primeiro
};

const el = {
  rootOptions: document.getElementById('root-options'),
  scaleSelect: document.getElementById('scale-select'),
  scaleControl: document.getElementById('scale-control'),
  chordSelect: document.getElementById('chord-select'),
  chordControl: document.getElementById('chord-control'),
  rootControl: document.getElementById('root-control'),
  training: document.getElementById('training'),
  trainingSetup: document.getElementById('training-setup'),
  trainingStage: document.getElementById('training-stage'),
  trainingAdd: document.getElementById('training-add'),
  trainingEmpty: document.getElementById('training-empty'),
  trainingList: document.getElementById('training-list'),
  trainingLoops: document.getElementById('training-loops'),
  trainingLoopsField: document.getElementById('training-loops-field'),
  trainingBeats: document.getElementById('training-beats'),
  trainingBeatsField: document.getElementById('training-beats-field'),
  trainingStart: document.getElementById('training-start'),
  trainingStop: document.getElementById('training-stop'),
  trainingCurrentName: document.getElementById('training-current-name'),
  trainingCurrentTab: document.getElementById('training-current-tab'),
  trainingDiagram: document.getElementById('training-diagram'),
  trainingCountdown: document.getElementById('training-countdown'),
  trainingNextName: document.getElementById('training-next-name'),
  trainingNextTab: document.getElementById('training-next-tab'),
  voicingsPanel: document.getElementById('voicings-panel'),
  voicings: document.getElementById('voicings'),
  legendScale: document.getElementById('legend-scale'),
  legendMuted: document.getElementById('legend-muted'),
  metronomeToggle: document.getElementById('metronome-toggle'),
  bpmNumber: document.getElementById('bpm-number'),
  bpmRange: document.getElementById('bpm-range'),
  beats: document.getElementById('beats'),
  rampEnabled: document.getElementById('ramp-enabled'),
  rampEvery: document.getElementById('ramp-every'),
  rampStep: document.getElementById('ramp-step'),
  loopStatus: document.getElementById('loop-status'),
  scaleTitle: document.getElementById('scale-title'),
  scaleNotes: document.getElementById('scale-notes'),
  neck: document.getElementById('neck'),
  cards: document.getElementById('cards'),
  empty: document.getElementById('empty'),
  clear: document.getElementById('clear'),
};

const positions = []; // positions[corda][casa] = { button, note }
let scaleNotes = new Map(); // classe de altura → { name, degree }
let voicings = []; // formas do acorde atual: [{ frets, bassString }]

const training = {
  running: false,
  index: 0, // acorde atual em state.trainingItems
  next: 0,
  beat: 0, // batida atual desde a última troca
  metronomeWasRunning: false,
};

function usesChords() {
  return state.mode !== 'scales';
}

/* Teoria musical */

function pitchClass(name) {
  const natural = NATURAL_PCS[LETTERS.indexOf(name[0])];
  const accidental = name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0;
  return (natural + accidental + 12) % 12;
}

function degreeSemitones(degree) {
  const number = Number(degree.at(-1));
  const flats = degree.split('b').length - 1;
  const accidental = degree[0] === '#' ? 1 : -flats;
  return NATURAL_PCS[(number - 1) % 7] + accidental;
}

function usesFlats(root) {
  return root.includes('b') || root === 'F';
}

function plainName(pc, root) {
  return (usesFlats(root) ? FLAT_NAMES : SHARP_NAMES)[pc];
}

// Grafia correta pelo grau: em Fá maior o 4º grau é Bb, não A#.
// Dobrados (Bbb) viram a forma simples equivalente, que é o que se lê na prática.
function spellDegree(root, degree) {
  const pc = (pitchClass(root) + degreeSemitones(degree) + 12) % 12;
  const number = Number(degree.at(-1));
  const letterIndex = (LETTERS.indexOf(root[0]) + number - 1) % 7;
  const difference = ((pc - NATURAL_PCS[letterIndex] + 18) % 12) - 6;

  if (Math.abs(difference) > 1) return { pc, name: plainName(pc, root) };

  const accidental = difference === 1 ? '#' : difference === -1 ? 'b' : '';
  return { pc, name: LETTERS[letterIndex] + accidental };
}

function buildScaleNotes() {
  const notes = new Map();
  const { degrees } = usesChords() ? CHORDS.get(state.chord) : SCALES.get(state.scale);
  for (const degree of degrees) {
    const { pc, name } = spellDegree(state.root, degree);
    notes.set(pc, { name, degree });
  }
  return notes;
}

function noteAt(string, fret) {
  const pc = (STRINGS[string].pc + fret) % 12;
  const rootPc = pitchClass(state.root);
  const inScale = scaleNotes.get(pc);

  return {
    pc,
    name: inScale ? inScale.name : plainName(pc, state.root),
    degree: inScale ? inScale.degree : INTERVALS[(pc - rootPc + 12) % 12],
    inScale: Boolean(inScale),
    isRoot: pc === rootPc,
  };
}

/* Formas de acorde */

// Dedos necessários, ou Infinity se a forma não couber na mão. A casa mais baixa pode
// ser feita com pestana, desde que nenhuma corda solta ou abafada fique sob ela.
function fingersNeeded(frets) {
  const pressed = frets.map((fret, string) => ({ fret, string })).filter(({ fret }) => fret > 0);
  if (pressed.length === 0) return 0;

  const lowest = Math.min(...pressed.map(({ fret }) => fret));
  const barreStrings = pressed.filter(({ fret }) => fret === lowest).map(({ string }) => string);
  const canBarre = frets
    .slice(Math.min(...barreStrings), Math.max(...barreStrings) + 1)
    .every((fret) => fret > 0);

  return pressed.length - (canBarre ? barreStrings.length - 1 : 0);
}

function heardTones(frets) {
  return new Set(frets.flatMap((fret, string) => (
    fret === null ? [] : [(STRINGS[string].pc + fret) % 12]
  )));
}

function voicingScore(frets, tones) {
  const sounding = frets.filter((fret) => fret !== null);
  const pressed = sounding.filter((fret) => fret > 0);
  const span = pressed.length ? Math.max(...pressed) - Math.min(...pressed) : 0;
  return sounding.length * 3 - fingersNeeded(frets) * 2 - span + (heardTones(frets).size === tones.size ? 2 : 0);
}

// Procura, para cada tônica no baixo (cordas 6, 5 e 4, dentro de uma oitava), a melhor
// forma fechada e a melhor forma com cordas soltas. Sem abafar cordas no meio da forma.
function findVoicings(root, chord) {
  const rootPc = pitchClass(root);
  const toneOf = (degree) => (rootPc + degreeSemitones(degree) + 12) % 12;
  const tones = new Set(chord.degrees.map(toneOf));
  // A quinta é a nota dispensável em acordes de quatro ou mais notas.
  const required = chord.degrees.filter((degree) => chord.degrees.length < 4 || degree !== '5').map(toneOf);
  const maxStrings = chord.maxStrings ?? STRINGS.length;
  const minStrings = chord.maxStrings ? 2 : 4;
  const best = new Map();

  function consider(frets, bassString) {
    const sounding = frets.filter((fret) => fret !== null).length;
    if (sounding < minStrings || sounding > maxStrings) return;
    const heard = heardTones(frets);
    if (!required.every((tone) => heard.has(tone))) return;
    if (fingersNeeded(frets) > MAX_FINGERS) return;
    if (frets.includes(0) && Math.max(...frets) > OPEN_POSITION_MAX_FRET) return;
    // Corda solta logo acima de um baixo pressionado costuma gerar formas pouco naturais.
    if (frets[bassString] > 0 && frets[bassString - 1] === 0) return;

    const score = voicingScore(frets, tones);
    const key = `${bassString}-${frets[bassString]}-${frets.includes(0)}`;
    if (!best.has(key) || score > best.get(key).score) {
      best.set(key, { frets: [...frets], bassString, score });
    }
  }

  function extend(frets, string, bassString) {
    if (string < 0) {
      consider(frets, bassString);
      return;
    }

    // Abafar esta corda significa abafar também todas as mais agudas.
    consider(frets, bassString);

    const bassFret = frets[bassString];
    const pressed = frets.filter((fret) => fret > 0);
    const low = Math.min(...pressed, Infinity);
    const high = Math.max(...pressed, -Infinity);

    if (bassFret <= OPEN_POSITION_MAX_FRET && tones.has(STRINGS[string].pc)) {
      frets[string] = 0;
      extend(frets, string - 1, bassString);
      frets[string] = null;
    }

    const first = Math.max(1, high - MAX_FRET_SPAN);
    const last = Math.min(FRET_COUNT, low + MAX_FRET_SPAN);
    for (let fret = first; fret <= last; fret++) {
      if (!tones.has((STRINGS[string].pc + fret) % 12)) continue;
      frets[string] = fret;
      extend(frets, string - 1, bassString);
      frets[string] = null;
    }
  }

  for (const bassString of [5, 4, 3]) {
    for (let fret = 0; fret < 12; fret++) {
      if ((STRINGS[bassString].pc + fret) % 12 !== rootPc) continue;
      const frets = Array(STRINGS.length).fill(null);
      frets[bassString] = fret;
      extend(frets, bassString - 1, bassString);
    }
  }

  return [...best.values()].sort((a, b) => lowestFret(a.frets) - lowestFret(b.frets) || b.bassString - a.bassString);
}

function lowestFret(frets) {
  const pressed = frets.filter((fret) => fret > 0);
  return pressed.length ? Math.min(...pressed) : 0;
}

/* Formatação */

function textName(name) {
  return state.notation === 'solfege' ? SOLFEGE[name[0]] + name.slice(1) : name;
}

function scaleTitle() {
  const root = textName(state.root);
  if (usesChords()) {
    const chord = CHORDS.get(state.chord);
    return `${root}${chord.symbol} (${chord.label.toLowerCase()})`;
  }
  if (state.scale === 'none') return 'Sem escala';
  if (state.scale === 'note') return `Todas as notas ${root}`;
  return `${root} ${SCALES.get(state.scale).label.replace(/ \(.*\)/, '').toLowerCase()}`;
}

function positionLabel({ string, fret }) {
  const stringName = textName(STRINGS[string].name);
  const place = fret === 0 ? 'corda solta' : `casa ${fret}`;
  return `Corda ${string + 1} (${stringName}), ${place}`;
}

function enharmonic(note) {
  const alternative = [SHARP_NAMES[note.pc], FLAT_NAMES[note.pc]].find((name) => name !== note.name);
  return alternative ? textName(alternative) : '';
}

function relationText(note) {
  const root = textName(state.root);
  if (state.mode === 'scales' && (state.scale === 'none' || state.scale === 'note')) {
    return note.isRoot ? `Mesma nota que ${root}` : `Intervalo ${note.degree} a partir de ${root}`;
  }
  return note.inScale ? `Grau ${note.degree} em ${scaleTitle()}` : `Fora de ${scaleTitle()}`;
}

/* Construção da página */

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildRootOptions() {
  for (const root of ROOTS) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'root';
    input.value = root;
    input.checked = root === state.root;
    label.append(input, document.createElement('span'));
    el.rootOptions.append(label);
  }
}

function buildSelect(select, groups, itemsKey, selectedId) {
  for (const group of groups) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    for (const item of group[itemsKey]) {
      optgroup.append(new Option(item.label, item.id, false, item.id === selectedId));
    }
    select.append(optgroup);
  }
}

function buildBeats() {
  for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
    el.beats.append(createElement('li', beat === 0 ? 'beat beat-accent' : 'beat'));
  }
}

function placeOnGrid(node, row, column) {
  node.style.gridRow = row;
  node.style.gridColumn = column;
  return node;
}

function buildNeck() {
  // As casas encolhem em direção ao corpo, como numa guitarra real, mas de forma
  // atenuada para que as notas caibam nas casas mais agudas.
  const fretWidths = Array.from({ length: FRET_COUNT }, (_, i) => `${2 ** (-(i + 1) / 24)}fr`);
  el.neck.style.gridTemplateColumns = `56px ${fretWidths.join(' ')}`;

  el.neck.append(createElement('div', 'wood'), createElement('div', 'nut'));

  for (let fret = 1; fret <= FRET_COUNT; fret++) {
    const column = fret + 1;
    el.neck.append(placeOnGrid(createElement('div', 'fret'), '1 / 7', column));

    if (MARKED_FRETS.includes(fret)) {
      const inlay = createElement('div', fret === 12 ? 'inlay double' : 'inlay');
      el.neck.append(placeOnGrid(inlay, '1 / 7', column));
    }
  }

  for (let fret = 0; fret <= FRET_COUNT; fret++) {
    const number = createElement('div', MARKED_FRETS.includes(fret) ? 'fret-number marked' : 'fret-number', fret);
    el.neck.append(placeOnGrid(number, 7, fret + 1));
  }

  STRINGS.forEach((string, stringIndex) => {
    const line = placeOnGrid(createElement('div', 'string'), stringIndex + 1, '1 / -1');
    line.style.height = `${string.thickness}px`;
    el.neck.append(line);

    positions[stringIndex] = [];
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const button = placeOnGrid(createElement('button', 'pos'), stringIndex + 1, fret + 1);
      button.type = 'button';
      button.dataset.string = stringIndex;
      button.dataset.fret = fret;
      button.tabIndex = -1;
      const note = createElement('span', 'note');
      button.append(note);
      el.neck.append(button);
      positions[stringIndex][fret] = { button, note };
    }
  });

  positions[0][0].button.tabIndex = 0;
}

/* Renderização */

function renderRootOptions() {
  for (const label of el.rootOptions.children) {
    label.querySelector('span').textContent = textName(label.querySelector('input').value);
  }
}

function renderSummary() {
  el.scaleTitle.textContent = scaleTitle();
  el.scaleNotes.replaceChildren(
    ...[...scaleNotes.values()].map(({ name, degree }) => {
      const item = createElement('li', '', textName(name));
      item.append(createElement('small', '', degree));
      return item;
    }),
  );
}

function renderNeck() {
  const selected = new Set(state.selected.map(({ string, fret }) => `${string}-${fret}`));
  const voicing = usesChords() ? voicings[state.voicing] : undefined;

  positions.forEach((frets, string) => {
    frets.forEach(({ button, note: noteNode }, fret) => {
      const note = noteAt(string, fret);
      const isSelected = selected.has(`${string}-${fret}`);
      const isVisible = voicing ? voicing.frets[string] === fret : note.inScale;
      const showTonic = note.isRoot && isVisible;
      const isMuted = fret === 0 && voicing?.frets[string] === null && !isSelected;

      button.classList.toggle('is-scale', isVisible);
      button.classList.toggle('is-muted', isMuted);
      button.classList.toggle('is-tonic', showTonic);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected);
      button.setAttribute(
        'aria-label',
        `${positionLabel({ string, fret })}: ${textName(note.name)}${isMuted ? ' (não tocar nesta forma)' : ''}`,
      );
      noteNode.textContent = isMuted ? '×' : state.notation === 'degrees' ? note.degree : textName(note.name);
    });
  });
}

function svgElement(tag, attributes) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

// Diagrama vertical tradicional: corda 6 à esquerda, pestana do braço no topo.
function chordDiagram({ frets }) {
  const rootPc = pitchClass(state.root);
  const rows = MAX_FRET_SPAN + 1;
  const gap = 14;
  const left = 28;
  const top = 22;
  const width = left + gap * (STRINGS.length - 1) + 8;
  const height = top + gap * rows + 6;
  const highest = Math.max(...frets);
  const firstFret = highest <= rows ? 1 : lowestFret(frets);
  const xOf = (string) => left + gap * (STRINGS.length - 1 - string);
  const svg = svgElement('svg', { viewBox: `0 0 ${width} ${height}`, class: 'diagram', 'aria-hidden': 'true' });

  for (let row = 0; row <= rows; row++) {
    const y = top + gap * row;
    const isNut = row === 0 && firstFret === 1;
    svg.append(svgElement('line', {
      x1: left, x2: xOf(0), y1: y, y2: y, class: isNut ? 'diagram-nut' : 'diagram-line',
    }));
  }

  if (firstFret > 1) {
    const label = svgElement('text', { x: left - 8, y: top + gap / 2 + 4, class: 'diagram-fret' });
    label.textContent = firstFret;
    svg.append(label);
  }

  frets.forEach((fret, string) => {
    const x = xOf(string);
    const isRoot = fret !== null && (STRINGS[string].pc + fret) % 12 === rootPc;
    svg.append(svgElement('line', { x1: x, x2: x, y1: top, y2: top + gap * rows, class: 'diagram-line' }));

    if (fret === null) {
      const mute = svgElement('text', { x, y: top - 7, class: 'diagram-mute' });
      mute.textContent = '×';
      svg.append(mute);
    } else if (fret === 0) {
      svg.append(svgElement('circle', {
        cx: x, cy: top - 10, r: 4, class: isRoot ? 'diagram-open is-root' : 'diagram-open',
      }));
    } else {
      svg.append(svgElement('circle', {
        cx: x,
        cy: top + gap * (fret - firstFret + 0.5),
        r: 5.5,
        class: isRoot ? 'diagram-dot is-root' : 'diagram-dot',
      }));
    }
  });

  return svg;
}

// Da corda 6 para a 1, como se lê uma cifra: x-3-2-0-1-0.
function tabText({ frets }) {
  return [...frets].reverse().map((fret) => (fret === null ? 'x' : fret)).join('-');
}

function voicingTitle({ frets }) {
  return frets.includes(0) ? 'Forma aberta' : `Casa ${lowestFret(frets)}`;
}

function voicingButton(index, children, label) {
  const item = createElement('li');
  const button = createElement('button', 'voicing');
  button.type = 'button';
  button.dataset.voicing = index;
  button.setAttribute('aria-pressed', index === state.voicing);
  button.setAttribute('aria-label', label);
  button.append(...children);
  item.append(button);
  return item;
}

function renderVoicings() {
  el.voicingsPanel.hidden = !usesChords() || training.running;
  if (el.voicingsPanel.hidden) return;

  el.voicings.replaceChildren(
    ...voicings.map((voicing, index) => voicingButton(
      index,
      [
        chordDiagram(voicing),
        createElement('strong', '', voicingTitle(voicing)),
        createElement('small', '', `Tônica na corda ${voicing.bassString + 1}`),
        createElement('code', '', tabText(voicing)),
      ],
      `Variação ${index + 1}: ${voicingTitle(voicing)}, tônica na corda ${voicing.bassString + 1}, ${tabText(voicing)}`,
    )),
  );

  // O treino sempre usa uma forma específica, então só o modo Acordes mostra o braço inteiro.
  if (state.mode === 'chords') {
    el.voicings.append(voicingButton(
      -1,
      [
        createElement('strong', '', 'Todas as notas'),
        createElement('small', '', 'Em todo o braço'),
      ],
      'Mostrar todas as notas do acorde em todo o braço',
    ));
  }
}

function trainingItemName({ root, chord }) {
  return textName(root) + CHORDS.get(chord).symbol;
}

function trainingItemTab({ root, chord, voicing }) {
  return tabText(findVoicings(root, CHORDS.get(chord))[voicing]);
}

function renderTrainingSetup() {
  const items = state.trainingItems;
  el.trainingAdd.textContent = `Adicionar ${trainingItemName(state)}`;
  el.trainingEmpty.hidden = items.length >= 2;
  el.trainingStart.disabled = items.length < 2;
  el.trainingLoopsField.hidden = state.trainingUnit !== 'loops';
  el.trainingBeatsField.hidden = state.trainingUnit !== 'beats';

  el.trainingList.replaceChildren(
    ...items.map((item, index) => {
      const row = createElement('li', 'training-item');
      const remove = createElement('button', 'card-remove', '×');
      remove.type = 'button';
      remove.dataset.index = index;
      remove.setAttribute('aria-label', `Remover ${trainingItemName(item)} da sequência`);
      row.append(
        createElement('strong', '', trainingItemName(item)),
        createElement('code', '', trainingItemTab(item)),
        remove,
      );
      return row;
    }),
  );
}

function renderTrainingStage() {
  const next = state.trainingItems[training.next];
  el.trainingCurrentName.textContent = trainingItemName(state);
  el.trainingCurrentTab.textContent = tabText(voicings[state.voicing]);
  el.trainingDiagram.replaceChildren(chordDiagram(voicings[state.voicing]));
  el.trainingNextName.textContent = trainingItemName(next);
  el.trainingNextTab.textContent = trainingItemTab(next);
}

function renderTraining() {
  el.training.hidden = state.mode !== 'training';
  el.trainingSetup.hidden = training.running;
  el.trainingStage.hidden = !training.running;
  if (el.training.hidden) return;

  if (training.running) renderTrainingStage();
  else renderTrainingSetup();
}

function renderSelection() {
  el.empty.hidden = state.selected.length > 0;
  el.clear.hidden = state.selected.length === 0;

  el.cards.replaceChildren(
    ...state.selected.map((position) => {
      const note = noteAt(position.string, position.fret);
      const alternative = enharmonic(note);
      const card = createElement('li', 'card');
      const info = createElement('div', 'card-info');
      const remove = createElement('button', 'card-remove', '×');

      info.append(
        createElement('strong', '', positionLabel(position)),
        createElement('span', '', relationText(note)),
      );
      if (alternative) info.append(createElement('span', '', `Equivale a ${alternative}`));

      remove.type = 'button';
      remove.dataset.string = position.string;
      remove.dataset.fret = position.fret;
      remove.setAttribute('aria-label', `Remover ${positionLabel(position)}`);

      card.append(createElement('div', 'card-note', textName(note.name)), info, remove);
      return card;
    }),
  );
}

function render() {
  const isChordMode = usesChords();
  scaleNotes = buildScaleNotes();
  voicings = isChordMode ? findVoicings(state.root, CHORDS.get(state.chord)) : [];

  el.scaleControl.hidden = isChordMode;
  el.chordControl.hidden = !isChordMode || training.running;
  el.rootControl.hidden = training.running;
  el.legendScale.textContent = isChordMode ? 'Nota do acorde' : 'Nota da escala';
  el.legendMuted.hidden = !isChordMode;

  renderRootOptions();
  renderSummary();
  renderNeck();
  renderVoicings();
  renderTraining();
  renderSelection();
}

/* Metrônomo */

const metronome = {
  context: null,
  output: null, // ganho da execução atual; desconectá-lo silencia o que já foi agendado
  timer: null,
  nextBeatTime: 0,
  beat: 0,
  loop: 0, // loop atual dentro do ciclo de aumento; 0 antes do primeiro tempo
};

function scheduleClick(time, isAccent) {
  const { context, output } = metronome;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.frequency.value = isAccent ? 1500 : 1000;
  envelope.gain.setValueAtTime(isAccent ? 0.5 : 0.3, time);
  envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  oscillator.connect(envelope).connect(output);
  oscillator.start(time);
  oscillator.stop(time + 0.05);
}

function showBeat(beat) {
  [...el.beats.children].forEach((node, index) => node.classList.toggle('is-active', index === beat));
}

// Chamada a cada primeiro tempo: o novo BPM vale a partir do início do loop seguinte.
function advanceLoop() {
  metronome.loop++;
  if (metronome.loop <= state.rampEvery) return;

  metronome.loop = 1;
  if (state.rampEnabled) {
    setBpm(state.bpm + state.rampStep);
    showBpm();
  }
}

function loopStatusText() {
  if (!state.rampEnabled) return '';
  if (state.bpm === BPM_MAX) return 'BPM máximo';
  return `Loop ${metronome.loop} de ${state.rampEvery}`;
}

function scheduleBeats() {
  const { context, output } = metronome;
  metronome.nextBeatTime = Math.max(metronome.nextBeatTime, context.currentTime);

  while (metronome.nextBeatTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
    const beat = metronome.beat;
    if (beat === 0) advanceLoop();
    const status = loopStatusText();
    scheduleClick(metronome.nextBeatTime, beat === 0);
    setTimeout(() => {
      if (metronome.output !== output) return;
      showBeat(beat);
      el.loopStatus.textContent = status;
      if (training.running) countTrainingBeat();
    }, (metronome.nextBeatTime - context.currentTime) * 1000);

    metronome.nextBeatTime += 60 / state.bpm;
    metronome.beat = (beat + 1) % BEATS_PER_BAR;
  }
}

function startMetronome() {
  metronome.context ??= new AudioContext();
  metronome.context.resume();
  metronome.output = metronome.context.createGain();
  metronome.output.connect(metronome.context.destination);
  metronome.nextBeatTime = metronome.context.currentTime + 0.05;
  metronome.beat = 0;
  metronome.loop = 0;
  metronome.timer = setInterval(scheduleBeats, SCHEDULE_INTERVAL_MS);
  showMetronomeState();
  scheduleBeats();
}

function stopMetronome() {
  clearInterval(metronome.timer);
  metronome.timer = null;
  metronome.output.disconnect();
  metronome.output = null;
  showBeat(-1);
  el.loopStatus.textContent = '';
  showMetronomeState();
}

function showMetronomeState() {
  const isRunning = metronome.timer !== null;
  el.metronomeToggle.textContent = isRunning ? 'Parar metrônomo' : 'Iniciar metrônomo';
  el.metronomeToggle.setAttribute('aria-pressed', isRunning);
}

function setBpm(value) {
  state.bpm = clampInteger(value, BPM_MIN, BPM_MAX);
}

function showBpm() {
  el.bpmNumber.value = state.bpm;
  el.bpmRange.value = state.bpm;
}

function clampInteger(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Valor do campo limitado aos seus min/max; se estiver vazio, mantém o atual.
function readNumberField(input, current) {
  const value = input.value === '' ? current : clampInteger(Number(input.value), Number(input.min), Number(input.max));
  input.value = value;
  return value;
}

/* Treino de troca de acordes */

function isSameChord(a, b) {
  return a.root === b.root && a.chord === b.chord && a.voicing === b.voicing;
}

function pickNextIndex(current) {
  const items = state.trainingItems;
  if (state.trainingOrder === 'sequence') return (current + 1) % items.length;

  // Na ordem aleatória, sempre sorteia um acorde diferente do atual.
  const options = items.flatMap((item, index) => (isSameChord(item, items[current]) ? [] : [index]));
  return options.length ? options[Math.floor(Math.random() * options.length)] : current;
}

function showTrainingChord(index) {
  const { root, chord, voicing } = state.trainingItems[index];
  training.index = index;
  training.next = pickNextIndex(index);
  state.root = root;
  state.chord = chord;
  state.voicing = voicing;
  el.rootOptions.querySelector(`input[value="${root}"]`).checked = true;
  el.chordSelect.value = chord;
  render();
}

function trainingCountdownText() {
  if (state.trainingUnit === 'beats') return `Batida ${training.beat} de ${state.trainingBeats}`;
  const loop = Math.ceil(training.beat / BEATS_PER_BAR);
  const beat = ((training.beat - 1) % BEATS_PER_BAR) + 1;
  return `Loop ${loop} de ${state.trainingLoops} · tempo ${beat} de ${BEATS_PER_BAR}`;
}

// Chamada a cada batida do metrônomo. O treino começa no primeiro tempo do compasso,
// então a troca por loop sempre cai em um primeiro tempo.
function countTrainingBeat() {
  const beatsPerChord = state.trainingUnit === 'beats' ? state.trainingBeats : state.trainingLoops * BEATS_PER_BAR;
  training.beat++;
  if (training.beat > beatsPerChord) {
    training.beat = 1;
    showTrainingChord(training.next);
  }
  el.trainingCountdown.textContent = trainingCountdownText();
}

function startTraining() {
  const count = state.trainingItems.length;
  training.running = true;
  training.beat = 0;
  el.trainingCountdown.textContent = '';
  showTrainingChord(state.trainingOrder === 'random' ? Math.floor(Math.random() * count) : 0);

  // Reinicia o metrônomo para a contagem começar no primeiro tempo do compasso.
  training.metronomeWasRunning = metronome.timer !== null;
  if (training.metronomeWasRunning) stopMetronome();
  startMetronome();
}

function stopTraining() {
  training.running = false;
  if (!training.metronomeWasRunning && metronome.timer !== null) stopMetronome();
  render();
}

/* Interação */

function toggleSelection(string, fret) {
  const index = state.selected.findIndex((p) => p.string === string && p.fret === fret);
  if (index >= 0) state.selected.splice(index, 1);
  else state.selected.unshift({ string, fret });
  render();
}

function moveFocus(event) {
  const moves = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  const move = moves[event.key];
  const current = event.target.closest('.pos');
  if (!move || !current) return;

  event.preventDefault();
  const string = Number(current.dataset.string) + move[0];
  const fret = Number(current.dataset.fret) + move[1];
  const next = positions[string]?.[fret];
  if (!next) return;

  current.tabIndex = -1;
  next.button.tabIndex = 0;
  next.button.focus();
}

el.rootOptions.addEventListener('change', (event) => {
  state.root = event.target.value;
  state.voicing = 0;
  render();
});

el.scaleSelect.addEventListener('change', (event) => {
  state.scale = event.target.value;
  render();
});

el.chordSelect.addEventListener('change', (event) => {
  state.chord = event.target.value;
  state.voicing = 0;
  render();
});

document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (training.running) stopTraining();
    state.mode = input.value;
    if (state.mode === 'training' && state.voicing < 0) state.voicing = 0;
    render();
  });
});

document.querySelectorAll('input[name="training-order"]').forEach((input) => {
  input.addEventListener('change', () => {
    state.trainingOrder = input.value;
  });
});

document.querySelectorAll('input[name="training-unit"]').forEach((input) => {
  input.addEventListener('change', () => {
    state.trainingUnit = input.value;
    render();
  });
});

el.trainingLoops.addEventListener('change', () => {
  state.trainingLoops = readNumberField(el.trainingLoops, state.trainingLoops);
});

el.trainingBeats.addEventListener('change', () => {
  state.trainingBeats = readNumberField(el.trainingBeats, state.trainingBeats);
});

el.trainingAdd.addEventListener('click', () => {
  const { root, chord, voicing } = state;
  state.trainingItems.push({ root, chord, voicing });
  render();
});

el.trainingList.addEventListener('click', (event) => {
  const button = event.target.closest('.card-remove');
  if (!button) return;
  state.trainingItems.splice(Number(button.dataset.index), 1);
  render();
});

el.trainingStart.addEventListener('click', () => {
  startTraining();
  el.trainingStop.focus();
});

el.trainingStop.addEventListener('click', () => {
  stopTraining();
  el.trainingStart.focus();
});

el.voicings.addEventListener('click', (event) => {
  const button = event.target.closest('.voicing');
  if (!button) return;
  state.voicing = Number(button.dataset.voicing);
  render();
  // A lista é recriada a cada renderização; devolve o foco ao botão escolhido.
  el.voicings.querySelector(`[data-voicing="${state.voicing}"]`).focus();
});

el.metronomeToggle.addEventListener('click', () => {
  if (metronome.timer === null) {
    startMetronome();
    return;
  }
  stopMetronome();
  // As trocas seguem o metrônomo, então o treino para junto.
  if (training.running) stopTraining();
});

el.bpmRange.addEventListener('input', () => {
  setBpm(Number(el.bpmRange.value));
  showBpm();
});

// Enquanto se digita, só aplica valores válidos; ao sair do campo, corrige o que sobrou.
el.bpmNumber.addEventListener('input', () => {
  const value = Number(el.bpmNumber.value);
  if (value < BPM_MIN || value > BPM_MAX) return;
  setBpm(value);
  el.bpmRange.value = state.bpm;
});

el.bpmNumber.addEventListener('change', () => {
  if (el.bpmNumber.value !== '') setBpm(Number(el.bpmNumber.value));
  showBpm();
});

el.rampEnabled.addEventListener('change', () => {
  state.rampEnabled = el.rampEnabled.checked;
  el.rampEvery.disabled = !state.rampEnabled;
  el.rampStep.disabled = !state.rampEnabled;
  metronome.loop = 0; // a contagem recomeça no próximo primeiro tempo
});

el.rampEvery.addEventListener('change', () => {
  state.rampEvery = readNumberField(el.rampEvery, state.rampEvery);
});

el.rampStep.addEventListener('change', () => {
  state.rampStep = readNumberField(el.rampStep, state.rampStep);
});

document.querySelectorAll('input[name="notation"]').forEach((input) => {
  input.addEventListener('change', () => {
    state.notation = input.value;
    render();
  });
});

el.neck.addEventListener('click', (event) => {
  const button = event.target.closest('.pos');
  if (button) toggleSelection(Number(button.dataset.string), Number(button.dataset.fret));
});

el.neck.addEventListener('keydown', moveFocus);

el.cards.addEventListener('click', (event) => {
  const button = event.target.closest('.card-remove');
  if (button) toggleSelection(Number(button.dataset.string), Number(button.dataset.fret));
});

el.clear.addEventListener('click', () => {
  state.selected = [];
  render();
});

buildRootOptions();
buildSelect(el.scaleSelect, SCALE_GROUPS, 'scales', state.scale);
buildSelect(el.chordSelect, CHORD_GROUPS, 'chords', state.chord);
buildBeats();
buildNeck();
render();
