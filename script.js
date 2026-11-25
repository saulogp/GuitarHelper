'use strict';

/*
  App: estado, renderização e interação. A teoria, as afinações, as formas de acorde,
  os shapes, o som e a montagem do braço ficam nos módulos da pasta js/ (carregados
  antes deste arquivo, na ordem do index.html).
*/

const { ROOTS, SOLFEGE, INTERVALS, SCALE_GROUPS, SCALES, CHORD_GROUPS, CHORDS, SHARP_NAMES, FLAT_NAMES } = Theory;
const { pitchClass, spellDegree, plainName, degreeSemitones } = Theory;

const FRET_COUNT = 22;
const MARKED_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
const PENTATONIC_KINDS = { 'pent-minor': 'menor', 'pent-major': 'maior' };

const BPM_MIN = 30;
const BPM_MAX = 240;
const BEATS_PER_BAR = 4;
const SCHEDULE_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;
const STRUM_GAP_SECONDS = 0.028; // intervalo entre cordas numa palhetada

const state = {
  mode: 'scales', // 'scales', 'chords', 'field' ou 'training'
  root: 'C',
  scale: 'major',
  chord: 'maj',
  voicing: 0, // índice da variação; -1 mostra todas as notas do acorde
  tuning: 'standard',
  bpm: 80,
  rampEnabled: false,
  rampStart: 80, // BPM de partida sempre que o metrônomo inicia com o aumento ligado
  rampEvery: 4, // quantos loops tocar antes de aumentar o BPM
  rampStep: 10,
  rampLimitEnabled: false,
  rampLimit: 160, // ao terminar o ciclo neste BPM, o metrônomo para
  trainingKind: 'chords', // 'chords' (troca de acordes) ou 'notes' (notas no braço)
  trainingItems: [], // [{ root, chord, voicing }], na ordem em que foram adicionados
  trainingOrder: 'sequence', // 'sequence' ou 'random'
  trainingUnit: 'loops', // 'loops' ou 'beats'
  trainingLoops: 1,
  trainingBeats: 4,
  notation: 'letters',
  selected: [], // [{ string, fret }], a mais recente primeiro
  shape: 'all', // 'all' ou o índice do shape (0 a 4)
  shapeRegion: 0, // qual ocorrência do shape, quando ele aparece mais de uma vez no braço
  showFingers: true,
  fieldMode: 'major', // 'major', 'minor' ou 'harmonic'
  fieldSize: 'triads', // 'triads' ou 'tetrads'
  fieldDegree: 0,
  fieldView: 'cards', // 'cards' ou 'table'
  arpDirection: 'up',
  arpBpm: 160,
  chordRepeat: false,
  scaleRange: 'one', // 'one', 'two' ou 'shape'
  scaleDirection: 'up', // 'up', 'down' ou 'updown'
  scaleBpm: 100,
  scaleRepeat: false,
  playOnClick: true,
};

// Preferências que valem entre visitas: afinação e som.
const PREFS_KEY = 'guitar-helper-prefs';

function loadPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {};
    if (Tunings.LIST.some((tuning) => tuning.id === prefs.tuning)) state.tuning = prefs.tuning;
    if (typeof prefs.playOnClick === 'boolean') state.playOnClick = prefs.playOnClick;
    if (prefs.instrument) GuitarAudio.setInstrument(prefs.instrument);
    if (Number.isFinite(prefs.volume)) GuitarAudio.settings.volume = Math.min(1, Math.max(0, prefs.volume));
    if (Number.isFinite(prefs.duration)) GuitarAudio.setDuration(prefs.duration);
  } catch {
    // Sem armazenamento ou dado inválido: ficam os padrões.
  }
}

function savePrefs() {
  const { instrument, volume, duration } = GuitarAudio.settings;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      tuning: state.tuning, playOnClick: state.playOnClick, instrument, volume, duration,
    }));
  } catch {
    // Sem armazenamento: valem só nesta visita.
  }
}

loadPrefs();

// Cordas da afinação atual (da 1 à 6). Única referência para o braço e para o som.
let STRINGS = Tunings.strings(state.tuning);

const el = {
  rootOptions: document.getElementById('root-options'),
  scaleSelect: document.getElementById('scale-select'),
  scaleControl: document.getElementById('scale-control'),
  chordSelect: document.getElementById('chord-select'),
  chordControl: document.getElementById('chord-control'),
  rootControl: document.getElementById('root-control'),
  fieldModeControl: document.getElementById('field-mode-control'),
  fieldModeSelect: document.getElementById('field-mode-select'),
  fieldSizeControl: document.getElementById('field-size-control'),
  trainingKindControl: document.getElementById('training-kind-control'),
  choose: document.getElementById('choose'),
  trainingSetup: document.getElementById('training-setup'),
  trainingStage: document.getElementById('training-stage'),
  trainingChords: document.getElementById('training-chords'),
  trainingNotes: document.getElementById('training-notes'),
  trainingNotesTitle: document.getElementById('training-notes-title'),
  trainingNotesInfo: document.getElementById('training-notes-info'),
  trainingAdd: document.getElementById('training-add'),
  trainingEmpty: document.getElementById('training-empty'),
  trainingList: document.getElementById('training-list'),
  trainingChordsTitle: document.getElementById('training-chords-title'),
  trainingLoops: document.getElementById('training-loops'),
  trainingBeats: document.getElementById('training-beats'),
  trainingStart: document.getElementById('training-start'),
  trainingStop: document.getElementById('training-stop'),
  trainingCurrentName: document.getElementById('training-current-name'),
  trainingCurrentDetail: document.getElementById('training-current-detail'),
  trainingDiagram: document.getElementById('training-diagram'),
  trainingCountdown: document.getElementById('training-countdown'),
  trainingNextName: document.getElementById('training-next-name'),
  trainingNextDetail: document.getElementById('training-next-detail'),
  trainingNextDiagram: document.getElementById('training-next-diagram'),
  trainingProgressBar: document.getElementById('training-progress-bar'),
  voicingsPanel: document.getElementById('voicings-panel'),
  voicingsTitle: document.getElementById('voicings-title'),
  voicings: document.getElementById('voicings'),
  chordStrum: document.getElementById('chord-strum'),
  chordArpeggio: document.getElementById('chord-arpeggio'),
  chordStop: document.getElementById('chord-stop'),
  chordRepeat: document.getElementById('chord-repeat'),
  chordHint: document.getElementById('chord-hint'),
  arpBpm: document.getElementById('arp-bpm'),
  arpBpmOut: document.getElementById('arp-bpm-out'),
  shapesPanel: document.getElementById('shapes-panel'),
  shapesTitle: document.getElementById('shapes-title'),
  shapesHint: document.getElementById('shapes-hint'),
  shapesHintMinor: document.getElementById('shapes-hint-minor'),
  shapesHintMajor: document.getElementById('shapes-hint-major'),
  shapesBody: document.getElementById('shapes-body'),
  pentKindControl: document.getElementById('pent-kind-control'),
  shapePrev: document.getElementById('shape-prev'),
  shapeNext: document.getElementById('shape-next'),
  shapeRegionControl: document.getElementById('shape-region-control'),
  shapeRegions: document.getElementById('shape-regions'),
  shapeInfo: document.getElementById('shape-info'),
  shapeFingers: document.getElementById('shape-fingers'),
  shapeFingersControl: document.getElementById('shape-fingers-control'),
  scalePlayer: document.getElementById('scale-player'),
  scaleRangeShape: document.getElementById('scale-range-shape'),
  scaleBpm: document.getElementById('scale-bpm'),
  scaleRepeat: document.getElementById('scale-repeat'),
  scalePlay: document.getElementById('scale-play'),
  scalePlayLabel: document.getElementById('scale-play-label'),
  scalePause: document.getElementById('scale-pause'),
  scaleStop: document.getElementById('scale-stop'),
  scaleStatus: document.getElementById('scale-status'),
  fieldPanel: document.getElementById('field-panel'),
  fieldTitle: document.getElementById('field-title'),
  fieldNote: document.getElementById('field-note'),
  fieldCards: document.getElementById('field-cards'),
  fieldTableWrap: document.getElementById('field-table-wrap'),
  fieldTable: document.getElementById('field-table'),
  degreePanel: document.getElementById('degree-panel'),
  degreeKicker: document.getElementById('degree-kicker'),
  degreeTitle: document.getElementById('degree-title'),
  degreeRelation: document.getElementById('degree-relation'),
  degreeFacts: document.getElementById('degree-facts'),
  degreeNotes: document.getElementById('degree-notes'),
  legendTonic: document.getElementById('legend-tonic'),
  legendScale: document.getElementById('legend-scale'),
  legendTarget: document.getElementById('legend-target'),
  legendNext: document.getElementById('legend-next'),
  legendMuted: document.getElementById('legend-muted'),
  legendOutside: document.getElementById('legend-outside'),
  legendFinger: document.getElementById('legend-finger'),
  tuningSelect: document.getElementById('tuning-select'),
  metronomeToggle: document.getElementById('metronome-toggle'),
  bpmNumber: document.getElementById('bpm-number'),
  bpmRange: document.getElementById('bpm-range'),
  beats: document.getElementById('beats'),
  rampEnabled: document.getElementById('ramp-enabled'),
  rampStart: document.getElementById('ramp-start'),
  rampEvery: document.getElementById('ramp-every'),
  rampStep: document.getElementById('ramp-step'),
  rampLimitEnabled: document.getElementById('ramp-limit-enabled'),
  rampLimit: document.getElementById('ramp-limit'),
  rampSummary: document.getElementById('ramp-summary'),
  loopStatus: document.getElementById('loop-status'),
  soundSummary: document.getElementById('sound-summary'),
  soundInstrument: document.getElementById('sound-instrument'),
  soundVolume: document.getElementById('sound-volume'),
  soundVolumeOut: document.getElementById('sound-volume-out'),
  soundDuration: document.getElementById('sound-duration'),
  soundDurationOut: document.getElementById('sound-duration-out'),
  soundOnClick: document.getElementById('sound-on-click'),
  stopSound: document.getElementById('stop-sound'),
  scaleTitle: document.getElementById('scale-title'),
  scaleNotes: document.getElementById('scale-notes'),
  neck: document.getElementById('neck'),
  cards: document.getElementById('cards'),
  empty: document.getElementById('empty'),
  clear: document.getElementById('clear'),
  themeToggle: document.getElementById('theme-toggle'),
};

let neck = null; // API do braço (Neck.build)
let focus = null; // o que o braço mostra: { root, degrees, chord?, scale?, fieldItem? }
let scaleNotes = new Map(); // classe de altura → { name, degree }
let voicings = []; // formas do acorde atual: [{ frets, bassString }]
let shapes = null; // shapes da pentatônica atual (PentatonicShapes.compute) ou null

const training = {
  running: false,
  items: [], // itens do treino em andamento: acordes ou posições, conforme state.trainingKind
  index: 0, // item atual em training.items
  next: 0,
  beat: 0, // batida atual desde a última troca
  metronomeWasRunning: false,
};

// O que o braço mostra: 'scales', 'chords', 'field' ou 'notes'. A aba Treino mostra
// acordes ou só a nota escolhida, conforme o tipo de treino.
function currentView() {
  if (state.mode !== 'training') return state.mode;
  return state.trainingKind;
}

function usesChords() {
  const view = currentView();
  return view === 'chords' || view === 'field';
}

/* Teoria aplicada ao estado */

const fieldCache = new Map();

function currentField() {
  const key = `${state.root}-${state.fieldMode}-${state.fieldSize}`;
  if (!fieldCache.has(key)) fieldCache.set(key, Theory.harmonicField(state.root, state.fieldMode, state.fieldSize));
  return fieldCache.get(key);
}

function currentFieldItem() {
  return currentField().chords[state.fieldDegree];
}

function buildFocus() {
  const view = currentView();
  if (view === 'field') {
    const item = currentFieldItem();
    return { root: item.root, chord: item.chord, degrees: item.chord.degrees, fieldItem: item };
  }
  if (view === 'chords') {
    const chord = CHORDS.get(state.chord);
    return { root: state.root, chord, degrees: chord.degrees };
  }
  const scale = SCALES.get(view === 'notes' ? 'note' : state.scale);
  return { root: state.root, scale, degrees: scale.degrees };
}

function buildScaleNotes() {
  const notes = new Map();
  // No campo harmônico, as notas vêm grafadas pela tonalidade (F## em G# menor harmônica).
  const spelled = focus.fieldItem
    ? focus.fieldItem.tones.map(({ pc, name, degree }) => ({ pc, name, degree }))
    : focus.degrees.map((degree) => ({ degree, ...spellDegree(focus.root, degree) }));
  for (const { pc, name, degree } of spelled) notes.set(pc, { name, degree });
  return notes;
}

function noteAt(string, fret) {
  const pc = Fretboard.pcAt(STRINGS, string, fret);
  const rootPc = pitchClass(focus.root);
  const inScale = scaleNotes.get(pc);
  const midi = Fretboard.midiAt(STRINGS, string, fret);
  const name = inScale ? inScale.name : plainName(pc, focus.root);

  return {
    pc,
    midi,
    name,
    octave: Tunings.octaveOf(name, midi),
    frequency: Tunings.fretFrequency(STRINGS[string].frequency, fret),
    degree: inScale ? inScale.degree : INTERVALS[(pc - rootPc + 12) % 12],
    inScale: Boolean(inScale),
    isRoot: pc === rootPc,
  };
}

const voicingCache = new Map();

// Formas de um acorde na afinação atual (guardadas: o treino as consulta a cada batida).
function findVoicings(root, chord) {
  const key = `${state.tuning}-${root}-${chord.id}`;
  if (!voicingCache.has(key)) voicingCache.set(key, ChordShapes.find(root, chord, STRINGS, FRET_COUNT));
  return voicingCache.get(key);
}

function isPentatonic() {
  return currentView() === 'scales' && Boolean(PENTATONIC_KINDS[state.scale]);
}

// Ocorrência do shape escolhido, ou null em "Todos".
function selectedShape() {
  if (!shapes || state.shape === 'all') return null;
  const { instances } = shapes[state.shape];
  return instances[Math.min(state.shapeRegion, instances.length - 1)] ?? null;
}

/* Formatação */

function textName(name) {
  return state.notation === 'solfege' ? SOLFEGE[name[0]] + name.slice(1) : name;
}

function chordLabel(root, chord) {
  return `${textName(root)}${chord.symbol} (${chord.label.toLowerCase()})`;
}

function scaleTitle() {
  if (focus.fieldItem) return `${focus.fieldItem.numeral} · ${chordLabel(focus.root, focus.chord)}`;
  if (focus.chord) return chordLabel(focus.root, focus.chord);
  const root = textName(focus.root);
  if (currentView() === 'notes' || state.scale === 'note') return `Todas as notas ${root}`;
  if (state.scale === 'none') return 'Sem escala';
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
  const root = textName(focus.root);
  const view = currentView();
  if (view === 'notes' || (view === 'scales' && (state.scale === 'none' || state.scale === 'note'))) {
    return note.isRoot ? `Mesma nota que ${root}` : `Intervalo ${note.degree} a partir de ${root}`;
  }
  const title = focus.fieldItem ? chordLabel(focus.root, focus.chord) : scaleTitle();
  return note.inScale ? `Grau ${note.degree} em ${title}` : `Fora de ${title}`;
}

function formatHz(frequency) {
  return `${frequency.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Hz`;
}

function pitchText(note) {
  return `${textName(note.name)}${note.octave} · ${formatHz(note.frequency)}`;
}

function fretRangeText({ minFret, maxFret }) {
  return `casas ${minFret} a ${maxFret}`;
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

function buildOptions(select, items, selectedId, label = (item) => item.label) {
  for (const item of items) select.append(new Option(label(item), item.id, false, item.id === selectedId));
}

function buildBeats() {
  for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
    el.beats.append(createElement('li', beat === 0 ? 'beat beat-accent' : 'beat'));
  }
}

/* Som: notas, destaque visual e reprodutores */

const sounding = new Map(); // "corda-casa" → quantas vozes soam ali
let currentSteps = new Set(); // posições do passo atual de uma sequência ("corda-casa")

function positionKey({ string, fret }) {
  return `${string}-${fret}`;
}

function markSounding(position, delta) {
  const key = positionKey(position);
  const count = (sounding.get(key) ?? 0) + delta;
  if (count > 0) sounding.set(key, count);
  else sounding.delete(key);
  const cell = neck?.positions[position.string]?.[position.fret];
  cell?.button.classList.toggle('is-sounding', count > 0);
}

// Nota de uma posição do braço, com o destaque enquanto soa.
function noteEvent(position, extra = {}) {
  return {
    midi: Fretboard.midiAt(STRINGS, position.string, position.fret),
    string: position.string,
    onStart: () => markSounding(position, 1),
    onEnd: () => markSounding(position, -1),
    ...extra,
  };
}

function playPosition(position, extra) {
  GuitarAudio.play(noteEvent(position, extra));
}

function setCurrentStep(positions) {
  for (const key of currentSteps) {
    const [string, fret] = key.split('-').map(Number);
    neck.positions[string][fret].button.classList.remove('is-current');
  }
  currentSteps = new Set(positions.map(positionKey));
  for (const { string, fret } of positions) neck.positions[string][fret].button.classList.add('is-current');
}

function showStopSound() {
  const active = GuitarAudio.isActive() || chordPlayer.status !== 'stopped' || scalePlayer.status !== 'stopped';
  el.stopSound.hidden = !active;
}

let chordSteps = [];
const chordPlayer = SequencePlayer.create({
  onStep: (index) => setCurrentStep(index >= 0 ? chordSteps[index].positions : []),
  onState: () => {
    renderChordPlayer();
    showStopSound();
  },
});

let scaleSteps = [];
const scalePlayer = SequencePlayer.create({
  onStep: (index) => {
    setCurrentStep(index >= 0 ? scaleSteps[index].positions : []);
    renderScaleStatus(index);
  },
  onState: () => {
    renderScalePlayer();
    showStopSound();
  },
});

GuitarAudio.subscribe(showStopSound);

function stopAllSound() {
  chordPlayer.stop();
  scalePlayer.stop();
  GuitarAudio.stopAll();
  setCurrentStep([]);
}

function currentVoicing() {
  return usesChords() && state.voicing >= 0 ? voicings[state.voicing] ?? null : null;
}

// Palhetada: todas as cordas da forma, da mais grave para a mais aguda, quase juntas.
function strumSteps(voicing) {
  const positions = ChordShapes.soundingPositions(voicing);
  const notes = positions.map((position, i) => noteEvent(position, {
    offset: i * STRUM_GAP_SECONDS,
    seconds: GuitarAudio.settings.duration + 0.4,
    velocity: 0.8 - i * 0.02,
  }));
  return [{ positions, notes, beats: BEATS_PER_BAR }];
}

// Arpejo: uma nota por tempo, deixando as cordas soarem juntas até o fim do arpejo.
function arpeggioSteps(voicing, direction) {
  const positions = ChordShapes.soundingPositions(voicing);
  if (direction === 'down') positions.reverse();
  const beat = 60 / state.arpBpm;
  return positions.map((position, i) => ({
    positions: [position],
    beats: i === positions.length - 1 ? 2 : 1,
    notes: [noteEvent(position, {
      seconds: (positions.length - i) * beat + GuitarAudio.settings.duration,
      velocity: 0.82,
    })],
  }));
}

function playChord(kind) {
  const voicing = currentVoicing();
  if (!voicing) return;
  scalePlayer.stop();
  chordSteps = kind === 'arpeggio' ? arpeggioSteps(voicing, state.arpDirection) : strumSteps(voicing);
  chordPlayer.play(chordSteps, { bpm: state.arpBpm, repeat: state.chordRepeat });
}

// Altura da tônica em que a escala começa: dentro do shape escolhido ou, sem shape,
// a tônica mais grave na corda 6.
function scaleStart() {
  const shape = selectedShape();
  const rootPc = pitchClass(focus.root);
  if (shape) {
    const root = shape.notes.find((note) => note.pc === rootPc);
    return { midi: root.midi, anchor: shape.minFret };
  }
  const low = STRINGS.length - 1;
  const fret = (rootPc - STRINGS[low].pc + 12) % 12;
  return { midi: STRINGS[low].midi + fret, anchor: fret };
}

// Posições da escala a tocar, em ordem ascendente.
function scalePath(range) {
  const shape = selectedShape();
  if (range === 'shape' && shape) return shape.notes.map(({ string, fret }) => ({ string, fret }));

  const semitones = [...new Set(focus.degrees.map((degree) => ((degreeSemitones(degree) % 12) + 12) % 12))]
    .sort((a, b) => a - b);
  if (semitones.length === 0) return [];
  const octaves = range === 'two' ? 2 : 1;
  const start = scaleStart();
  const midis = [];
  for (let octave = 0; octave < octaves; octave++) {
    for (const step of semitones) midis.push(start.midi + octave * 12 + step);
  }
  midis.push(start.midi + octaves * 12);
  return Fretboard.findPath(STRINGS, midis, { anchor: start.anchor, fretCount: FRET_COUNT }) ?? [];
}

function scaleSequence() {
  const ascending = scalePath(state.scaleRange === 'shape' && !selectedShape() ? 'one' : state.scaleRange);
  if (state.scaleDirection === 'down') return [...ascending].reverse();
  if (state.scaleDirection === 'updown') return [...ascending, ...[...ascending].reverse().slice(1)];
  return ascending;
}

function playScale() {
  const path = scaleSequence();
  if (path.length === 0) return;
  chordPlayer.stop();
  const beat = 60 / state.scaleBpm;
  scaleSteps = path.map((position, i) => ({
    positions: [position],
    beats: 1,
    notes: [noteEvent(position, { seconds: i === path.length - 1 ? beat * 2 : beat * 0.95 })],
  }));
  scalePlayer.play(scaleSteps, { bpm: state.scaleBpm, repeat: state.scaleRepeat });
}

// Posição de referência de uma nota (chips do título, notas do grau): a da forma
// escolhida, a do shape ou a da escala tocada em uma oitava.
function referencePosition(pc) {
  const voicing = currentVoicing();
  if (voicing) {
    const found = ChordShapes.soundingPositions(voicing).find(({ string, fret }) => Fretboard.pcAt(STRINGS, string, fret) === pc);
    if (found) return found;
  }
  const shape = selectedShape();
  const inShape = shape?.notes.find((note) => note.pc === pc);
  if (inShape) return inShape;

  const start = scaleStart();
  const midi = start.midi + ((pc - (start.midi % 12) + 12) % 12);
  return Fretboard.findPath(STRINGS, [midi], { anchor: start.anchor, fretCount: FRET_COUNT })?.[0] ?? null;
}

/* Renderização */

function renderRootOptions() {
  for (const label of el.rootOptions.children) {
    label.querySelector('span').textContent = textName(label.querySelector('input').value);
  }
}

// Notas do título: cada uma é um botão que toca a nota.
function renderSummary() {
  el.scaleTitle.textContent = scaleTitle();
  el.scaleNotes.replaceChildren(
    ...[...scaleNotes.entries()].map(([pc, { name, degree }]) => {
      const item = createElement('li');
      const button = createElement('button', 'note-chip', textName(name));
      button.type = 'button';
      button.dataset.pc = pc;
      button.setAttribute('aria-label', `Ouvir ${textName(name)} (grau ${degree})`);
      button.append(createElement('small', '', degree));
      item.append(button);
      return item;
    }),
  );
}

function renderNeck() {
  const selected = new Set(state.selected.map(positionKey));
  const voicing = usesChords() ? voicings[state.voicing] : undefined;
  const target = trainingTarget();
  const upcoming = trainingTarget('next');
  const shape = selectedShape();
  const inShape = new Map((shape?.notes ?? []).map((note) => [positionKey(note), note]));
  const showFingers = Boolean(shape) && state.showFingers;

  neck.positions.forEach((frets, string) => {
    frets.forEach(({ button, note: noteNode, finger }, fret) => {
      const key = `${string}-${fret}`;
      const note = noteAt(string, fret);
      const isSelected = selected.has(key);
      const isVisible = voicing ? voicing.frets[string] === fret : note.inScale;
      const shapeNote = inShape.get(key);
      const isOutside = Boolean(shape) && isVisible && !shapeNote;
      const showTonic = note.isRoot && isVisible;
      const isMuted = fret === 0 && voicing?.frets[string] === null && !isSelected;
      const isTarget = target?.string === string && target?.fret === fret;
      const isNext = !isTarget && upcoming?.string === string && upcoming?.fret === fret;
      const hint = isMuted ? ' (não tocar nesta forma)'
        : isTarget ? ' (tocar agora)'
          : isNext ? ' (próxima)'
            : isOutside ? ' (fora do shape)'
              : shapeNote && showFingers ? `, dedo ${shapeNote.finger}` : '';

      button.classList.toggle('is-scale', isVisible);
      button.classList.toggle('is-outside', isOutside);
      button.classList.toggle('is-muted', isMuted);
      button.classList.toggle('is-tonic', showTonic);
      button.classList.toggle('is-selected', isSelected);
      button.classList.toggle('is-target', isTarget);
      button.classList.toggle('is-next', isNext);
      button.classList.toggle('is-sounding', sounding.has(key));
      button.classList.toggle('is-current', currentSteps.has(key));
      button.setAttribute('aria-pressed', isSelected);
      button.setAttribute('aria-label', `${positionLabel({ string, fret })}: ${textName(note.name)}${note.octave}${hint}`);
      noteNode.textContent = isMuted ? '×' : state.notation === 'degrees' ? note.degree : textName(note.name);
      finger.textContent = showFingers && shapeNote ? (shapeNote.finger === 0 ? '0' : shapeNote.finger) : '';
    });
  });

  renderShapeOverlay(shape);
  if (target) revealPosition(target);
}

function renderShapeOverlay(shape) {
  if (!shapes) {
    neck.setBand(null);
    neck.setMap([]);
    return;
  }
  neck.setBand(shape);
  neck.setMap(PentatonicShapes.alongNeck(shapes).map((instance) => {
    const region = shapes[instance.shape].instances.indexOf(instance);
    return {
      shape: instance.shape,
      region,
      minFret: instance.minFret,
      maxFret: instance.maxFret,
      text: String(instance.number),
      selected: instance === shape,
      label: `Shape ${instance.number}, ${fretRangeText(instance)}`,
    };
  }));
}

// Em telas estreitas o braço rola na horizontal: traz a posição para a área visível.
function revealPosition({ string, fret }) {
  const scroller = el.neck.parentElement;
  const box = neck.positions[string][fret].button.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  if (box.left >= view.left && box.right <= view.right) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scroller.scrollBy({
    left: box.left + box.width / 2 - (view.left + view.width / 2),
    behavior: reduceMotion ? 'auto' : 'smooth',
  });
}

function svgElement(tag, attributes) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

// Diagrama vertical tradicional: corda 6 à esquerda, pestana do braço no topo.
function chordDiagram({ frets }, root = focus.root) {
  const rootPc = pitchClass(root);
  const rows = ChordShapes.MAX_FRET_SPAN + 1;
  const gap = 14;
  const left = 28;
  const top = 22;
  const width = left + gap * (STRINGS.length - 1) + 8;
  const height = top + gap * rows + 6;
  const highest = Math.max(...frets);
  const firstFret = highest <= rows ? 1 : ChordShapes.lowestFret(frets);
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
    const isRoot = fret !== null && Fretboard.pcAt(STRINGS, string, fret) === rootPc;
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

const tabText = ChordShapes.tabText;

function voicingTitle({ frets }) {
  return frets.includes(0) ? 'Forma aberta' : `Casa ${ChordShapes.lowestFret(frets)}`;
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
  el.voicingsTitle.textContent = `Formas de ${textName(focus.root)}${focus.chord.symbol}`;

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

  // O treino sempre usa uma forma específica, então só Acordes e Campo harmônico
  // mostram o braço inteiro.
  if (state.mode !== 'training') {
    el.voicings.append(voicingButton(
      -1,
      [
        createElement('strong', '', 'Todas as notas'),
        createElement('small', '', 'Em todo o braço'),
      ],
      'Mostrar todas as notas do acorde em todo o braço',
    ));
  }
  renderChordPlayer();
}

function renderChordPlayer() {
  const canPlay = Boolean(currentVoicing());
  const active = chordPlayer.status !== 'stopped';
  el.chordStrum.disabled = !canPlay;
  el.chordArpeggio.disabled = !canPlay;
  el.chordStop.disabled = !active;
  el.chordHint.hidden = canPlay;
}

function trainingItemName({ root, chord }) {
  return textName(root) + CHORDS.get(chord).symbol;
}

function trainingItemTab({ root, chord, voicing }) {
  const shape = findVoicings(root, CHORDS.get(chord))[voicing];
  return shape ? tabText(shape) : '–';
}

function renderChordTrainingSetup() {
  const items = state.trainingItems;
  el.trainingChordsTitle.textContent = items.length ? `Sequência (${items.length})` : 'Sequência';
  el.trainingEmpty.hidden = items.length >= TRAINING_KINDS.chords.minItems;

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

function renderNoteTrainingSetup(count) {
  const root = textName(state.root);
  el.trainingNotesTitle.textContent = `Posições de ${root}`;
  el.trainingNotesInfo.textContent = `O braço mostra as ${count} posições de ${root}. No treino, `
    + 'a posição a tocar fica em verde e muda com o metrônomo. '
    + 'Na ordem sequencial, as posições vão da casa mais baixa para a mais alta.';
}

function renderTrainingSetup() {
  const kind = trainingKind();
  const count = kind.items().length;
  el.trainingChords.hidden = state.trainingKind !== 'chords';
  el.trainingNotes.hidden = state.trainingKind !== 'notes';
  el.trainingStart.disabled = count < kind.minItems;
  el.trainingLoops.hidden = state.trainingUnit !== 'loops';
  el.trainingBeats.hidden = state.trainingUnit !== 'beats';

  if (state.trainingKind === 'chords') renderChordTrainingSetup();
  else renderNoteTrainingSetup(count);
}

// Cifras aparecem em fonte monoespaçada; posições, em texto normal.
function trainingDetail(kind, text) {
  return kind.detailIsTab ? createElement('code', '', text) : document.createTextNode(text);
}

// Preenche um cartão do treino (Agora ou Próximo) com o item indicado.
function renderTrainingCard(kind, item, { name, detail, diagram }) {
  const info = kind.describe(item);
  const drawing = kind.diagram?.(item);
  name.textContent = info.name;
  detail.replaceChildren(trainingDetail(kind, info.detail));
  diagram.replaceChildren(...(drawing ? [drawing] : []));
  diagram.hidden = !drawing;
}

function renderTrainingStage() {
  const kind = trainingKind();
  renderTrainingCard(kind, training.items[training.index], {
    name: el.trainingCurrentName,
    detail: el.trainingCurrentDetail,
    diagram: el.trainingDiagram,
  });
  renderTrainingCard(kind, training.items[training.next], {
    name: el.trainingNextName,
    detail: el.trainingNextDetail,
    diagram: el.trainingNextDiagram,
  });
}

function renderTraining() {
  const isTraining = state.mode === 'training';
  el.trainingSetup.hidden = !isTraining || training.running;
  el.trainingStage.hidden = !training.running;
  el.trainingAdd.hidden = !isTraining || state.trainingKind !== 'chords';
  el.trainingAdd.textContent = `Adicionar ${trainingItemName(state)} à sequência`;
  if (!isTraining) return;

  if (training.running) renderTrainingStage();
  else renderTrainingSetup();
}

/* Shapes da pentatônica */

function shapeLinkText(instance) {
  return `shape ${instance.number} (${fretRangeText(instance)})`;
}

// Na relativa, o shape N da menor é o shape N − 1 da maior (o 1 da menor é o 5 da maior).
function relativeShapeText(instance) {
  const isMinor = state.scale === 'pent-minor';
  const rootPc = pitchClass(state.root);
  const relativePc = (rootPc + (isMinor ? 3 : 9)) % 12;
  const relativeName = textName(plainName(relativePc, state.root));
  const number = isMinor ? ((instance.shape + 4) % 5) + 1 : ((instance.shape + 1) % 5) + 1;
  return `Mesmas notas da pentatônica ${isMinor ? 'maior' : 'menor'} de ${relativeName}, onde este desenho é o shape ${number}.`;
}

function renderShapes() {
  const isScales = state.mode === 'scales';
  el.shapesPanel.hidden = !isScales;
  if (!isScales) return;

  const kind = PENTATONIC_KINDS[state.scale];
  el.shapesHint.hidden = Boolean(kind);
  el.shapesBody.hidden = !kind;
  el.pentKindControl.hidden = !kind;
  const root = textName(state.root);
  el.shapesHintMinor.textContent = `Pentatônica menor de ${root}`;
  el.shapesHintMajor.textContent = `Pentatônica maior de ${root}`;
  if (!kind) {
    el.shapesTitle.textContent = 'Shapes da pentatônica';
    return;
  }

  el.shapesTitle.textContent = `Shapes da pentatônica ${kind} de ${root}`;
  el.pentKindControl.querySelector(`input[value="${state.scale}"]`).checked = true;
  document.querySelector(`input[name="shape"][value="${state.shape}"]`).checked = true;

  const shape = selectedShape();
  el.shapeFingersControl.hidden = !shape;
  el.shapeFingers.checked = state.showFingers;

  // Região: quando o shape aparece mais de uma vez no braço, escolha qual estudar.
  const instances = shape ? shapes[state.shape].instances : [];
  el.shapeRegionControl.hidden = instances.length < 2;
  el.shapeRegions.replaceChildren(...instances.map((instance, index) => {
    const label = createElement('label');
    const input = createElement('input');
    input.type = 'radio';
    input.name = 'shape-region';
    input.value = index;
    input.checked = instance === shape;
    label.append(input, createElement('span', '', `Casas ${instance.minFret}–${instance.maxFret}`));
    return label;
  }));

  if (!shape) {
    el.shapeInfo.replaceChildren(
      createElement('p', '', 'Os cinco shapes cobrem o braço inteiro e se encaixam: cada um termina onde o próximo começa, '
        + 'e depois do 5 vem de novo o 1, uma oitava acima.'),
      createElement('p', 'shape-tip', 'Escolha um shape, use as setas ou clique numa faixa numerada abaixo do braço para estudá-lo.'),
    );
    return;
  }

  const along = PentatonicShapes.alongNeck(shapes);
  const position = along.indexOf(shape);
  const neighbors = [along[position - 1], along[position + 1]].filter(Boolean);
  const first = noteAt(shape.first.string, shape.first.fret);
  const last = noteAt(shape.last.string, shape.last.fret);
  el.shapeInfo.replaceChildren(
    createElement('p', 'shape-headline', `Shape ${shape.number} · ${fretRangeText(shape)}`),
    createElement('p', '', `Começa em ${textName(first.name)} na corda 6 (casa ${shape.first.fret}) `
      + `e termina em ${textName(last.name)} na corda 1 (casa ${shape.last.fret}). Duas notas por corda.`),
    createElement('p', '', neighbors.length
      ? `Encaixa no ${neighbors.map(shapeLinkText).join(' e no ')}: as notas da borda são as mesmas.`
      : 'É o único shape inteiro nesta região do braço.'),
    createElement('p', 'shape-tip', relativeShapeText(shape)),
  );
}

function moveShape(direction) {
  const along = PentatonicShapes.alongNeck(shapes);
  if (along.length === 0) return;
  const current = selectedShape();
  let index = current ? along.indexOf(current) + direction : direction > 0 ? 0 : along.length - 1;
  index = (index + along.length) % along.length;
  const instance = along[index];
  state.shape = instance.shape;
  state.shapeRegion = shapes[instance.shape].instances.indexOf(instance);
  render();
  revealPosition(instance.first);
}

/* Player de escala */

function renderScalePlayer() {
  const isScales = state.mode === 'scales';
  el.scalePlayer.hidden = !isScales;
  if (!isScales) return;

  const hasShape = Boolean(selectedShape());
  el.scaleRangeShape.disabled = !hasShape;
  el.scaleRangeShape.parentElement.title = hasShape ? '' : 'Escolha um shape da pentatônica';
  if (!hasShape && state.scaleRange === 'shape') {
    state.scaleRange = 'one';
    document.querySelector('input[name="scale-range"][value="one"]').checked = true;
  }

  const status = scalePlayer.status;
  const hasNotes = focus.degrees.length > 0;
  el.scalePlay.disabled = !hasNotes || status === 'playing';
  el.scalePlayLabel.textContent = status === 'paused' ? 'Continuar' : 'Tocar';
  el.scalePause.disabled = status !== 'playing';
  el.scaleStop.disabled = status === 'stopped';
  if (!hasNotes) el.scaleStatus.textContent = 'Escolha uma escala para ouvir.';
  else if (status === 'stopped') renderScaleStatus(-1);
}

function renderScaleStatus(index) {
  if (index < 0) {
    const count = scaleSequence().length;
    const shape = selectedShape();
    const where = state.scaleRange === 'shape' && shape ? `no shape ${shape.number}` : 'a partir da tônica';
    el.scaleStatus.textContent = count ? `${count} notas ${where}.` : '';
    return;
  }
  const { string, fret } = scaleSteps[index].positions[0];
  const note = noteAt(string, fret);
  el.scaleStatus.textContent = `Nota ${index + 1} de ${scaleSteps.length}: ${textName(note.name)}${note.octave} `
    + `(grau ${note.degree}), ${positionLabel({ string, fret }).toLowerCase()}`;
}

/* Campo harmônico */

function keySignatureText(field) {
  const accidentals = field.notes.filter((note) => note.name.length > 1);
  if (state.fieldMode === 'harmonic') {
    return `Sétima elevada: ${textName(field.notes[6].name)}`;
  }
  if (accidentals.length === 0) return 'Sem acidentes na armadura';
  const sign = accidentals[0].name.includes('#') ? 'sustenido' : 'bemol';
  const plural = accidentals.length > 1 ? (sign === 'sustenido' ? 'sustenidos' : 'bemóis') : sign;
  return `Armadura: ${accidentals.length} ${plural} (${accidentals.map((note) => textName(note.name)).join(' ')})`;
}

function fieldCard(item) {
  const li = createElement('li', 'degree-item');
  const button = createElement('button', 'degree-card');
  button.type = 'button';
  button.dataset.degree = item.index;
  button.setAttribute('aria-pressed', item.index === state.fieldDegree);
  button.append(
    createElement('span', 'degree-numeral', item.numeral),
    createElement('strong', 'degree-name', textName(item.root) + item.chord.symbol),
    createElement('span', 'degree-spoken', item.spoken),
    createElement('span', 'degree-tones', item.tones.map((tone) => textName(tone.name)).join(' ')),
    createElement('code', 'degree-formula', item.formula.join(' ')),
    createElement('span', `degree-function is-${functionClass(item.function)}`, item.function),
  );
  li.append(button, playButton(item));
  return li;
}

function functionClass(name) {
  return { Tônica: 'tonic', Subdominante: 'subdominant', Dominante: 'dominant' }[name];
}

function playButton(item) {
  const play = createElement('button', 'degree-play');
  play.type = 'button';
  play.dataset.playDegree = item.index;
  play.setAttribute('aria-label', `Ouvir ${textName(item.root)}${item.chord.symbol}`);
  play.append(createElement('span', 'icon-play'));
  return play;
}

function fieldRow(item) {
  const row = createElement('tr');
  row.classList.toggle('is-selected', item.index === state.fieldDegree);
  const name = createElement('button', 'table-chord', textName(item.root) + item.chord.symbol);
  name.type = 'button';
  name.dataset.degree = item.index;
  name.setAttribute('aria-pressed', item.index === state.fieldDegree);
  const cells = [
    createElement('th', 'degree-numeral', item.numeral),
    createElement('td'),
    createElement('td', '', item.spoken),
    createElement('td', '', item.quality),
    createElement('td', '', item.tones.map((tone) => textName(tone.name)).join(' ')),
    createElement('td'),
    createElement('td'),
    createElement('td'),
  ];
  cells[0].scope = 'row';
  cells[1].append(name);
  cells[5].append(createElement('code', '', item.formula.join(' ')));
  cells[6].append(createElement('span', `degree-function is-${functionClass(item.function)}`, item.function));
  cells[7].append(playButton(item));
  row.append(...cells);
  return row;
}

function renderField() {
  const isField = state.mode === 'field';
  el.fieldPanel.hidden = !isField;
  el.degreePanel.hidden = !isField;
  if (!isField) return;

  const field = currentField();
  const item = currentFieldItem();
  const modeName = field.mode.spoken;
  el.fieldTitle.textContent = `Campo harmônico de ${textName(field.key)} ${modeName}`;

  const sameAs = field.key !== state.root
    ? `${textName(state.root)} ${modeName} se escreve como ${textName(field.key)} ${modeName}, com menos acidentes. `
    : '';
  el.fieldNote.textContent = `${sameAs}Escala: ${field.notes.map((note) => textName(note.name)).join(' ')}. ${keySignatureText(field)}.`;

  const isCards = state.fieldView === 'cards';
  el.fieldCards.hidden = !isCards;
  el.fieldTableWrap.hidden = isCards;
  if (isCards) el.fieldCards.replaceChildren(...field.chords.map(fieldCard));
  else el.fieldTable.replaceChildren(...field.chords.map(fieldRow));

  el.degreeKicker.textContent = `Grau ${item.numeral} de ${textName(field.key)} ${modeName}`;
  el.degreeTitle.textContent = `${textName(item.root)}${item.chord.symbol} · ${item.spoken}`;
  el.degreeRelation.textContent = item.relation;
  const facts = [
    ['Classificação', item.quality],
    ['Fórmula', item.formula.join(' ')],
    ['Função', item.function],
    ['Cifra', textName(item.root) + item.chord.symbol],
  ];
  el.degreeFacts.replaceChildren(...facts.map(([term, value]) => {
    const row = createElement('div');
    row.append(createElement('dt', '', term), createElement('dd', '', value));
    return row;
  }));
  el.degreeNotes.replaceChildren(...item.tones.map((tone) => {
    const li = createElement('li');
    const button = createElement('button', 'note-chip is-light', textName(tone.name));
    button.type = 'button';
    button.dataset.pc = tone.pc;
    button.setAttribute('aria-label', `Ouvir ${textName(tone.name)} (grau ${tone.degree})`);
    button.append(createElement('small', '', tone.degree));
    li.append(button);
    return li;
  }));
}

function selectDegree(index) {
  state.fieldDegree = index;
  state.voicing = 0;
  stopAllSound();
  render();
}

/* Notas marcadas */

function renderSelection() {
  el.empty.hidden = state.selected.length > 0;
  el.clear.hidden = state.selected.length === 0;

  el.cards.replaceChildren(
    ...state.selected.map((position) => {
      const note = noteAt(position.string, position.fret);
      const alternative = enharmonic(note);
      const card = createElement('li', 'card');
      const info = createElement('div', 'card-info');
      const play = createElement('button', 'card-play');
      const remove = createElement('button', 'card-remove', '×');

      info.append(
        createElement('strong', '', positionLabel(position)),
        createElement('span', '', relationText(note)),
        createElement('span', '', pitchText(note)),
      );
      if (alternative) info.append(createElement('span', '', `Equivale a ${alternative}`));

      play.type = 'button';
      play.dataset.string = position.string;
      play.dataset.fret = position.fret;
      play.setAttribute('aria-label', `Ouvir ${positionLabel(position)}`);
      play.append(createElement('span', 'icon-play'));

      remove.type = 'button';
      remove.dataset.string = position.string;
      remove.dataset.fret = position.fret;
      remove.setAttribute('aria-label', `Remover ${positionLabel(position)}`);

      card.append(createElement('div', 'card-note', textName(note.name)), info, play, remove);
      return card;
    }),
  );
}

function render() {
  const view = currentView();
  focus = buildFocus();
  scaleNotes = buildScaleNotes();
  voicings = focus.chord ? findVoicings(focus.root, focus.chord) : [];
  shapes = isPentatonic() ? PentatonicShapes.compute(state.root, focus.degrees, STRINGS, FRET_COUNT) : null;
  // Ao trocar de acorde ou de afinação, a forma escolhida pode não existir mais.
  if (focus.chord && state.voicing >= voicings.length) state.voicing = voicings.length ? 0 : -1;

  // O CSS usa estes atributos para distribuir os painéis de cada modo.
  document.body.dataset.mode = state.mode;
  document.body.dataset.view = view;
  document.body.dataset.running = training.running;

  // Durante o treino, a escolha dá lugar ao painel Agora/Próximo.
  el.choose.hidden = training.running;
  el.scaleControl.hidden = view !== 'scales';
  el.chordControl.hidden = view !== 'chords';
  el.fieldModeControl.hidden = view !== 'field';
  el.fieldSizeControl.hidden = view !== 'field';
  el.trainingKindControl.hidden = state.mode !== 'training';
  el.legendTonic.textContent = view === 'notes' ? 'Nota escolhida' : 'Tônica';
  el.legendScale.textContent = usesChords() ? 'Nota do acorde' : 'Nota da escala';
  el.legendScale.parentElement.hidden = view === 'notes';
  el.legendTarget.hidden = !trainingTarget();
  el.legendNext.hidden = !trainingTarget('next');
  el.legendMuted.hidden = !usesChords();
  el.legendOutside.hidden = !selectedShape();
  el.legendFinger.hidden = !selectedShape() || !state.showFingers;

  renderRootOptions();
  renderSummary();
  renderNeck();
  renderField();
  renderVoicings();
  renderShapes();
  renderScalePlayer();
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

function hasRampLimit() {
  return state.rampEnabled && state.rampLimitEnabled;
}

// Resumo no botão "Aumentar BPM" do rodapé, para ver a regra sem abrir o painel.
function renderRampSummary() {
  if (!state.rampEnabled) {
    el.rampSummary.textContent = 'desligado';
    return;
  }
  const limit = hasRampLimit() ? `, até ${state.rampLimit}` : '';
  el.rampSummary.textContent = `+${state.rampStep} a cada ${state.rampEvery} loops${limit}`;
}

// Chamada a cada primeiro tempo: o novo BPM vale a partir do início do loop seguinte.
// Devolve true quando o ciclo no BPM limite terminou e o metrônomo deve parar.
function advanceLoop() {
  metronome.loop++;
  if (metronome.loop <= state.rampEvery) return false;

  metronome.loop = 1;
  if (!state.rampEnabled) return false;
  if (hasRampLimit() && state.bpm >= state.rampLimit) return true;

  const next = state.bpm + state.rampStep;
  setBpm(hasRampLimit() ? Math.min(next, state.rampLimit) : next);
  showBpm();
  return false;
}

function loopStatusText() {
  if (!state.rampEnabled) return '';
  const progress = `Loop ${metronome.loop} de ${state.rampEvery}`;
  if (hasRampLimit()) return state.bpm >= state.rampLimit ? `Último ciclo: ${progress}` : progress;
  return state.bpm === BPM_MAX ? 'BPM máximo' : progress;
}

function scheduleBeats() {
  const { context, output } = metronome;
  metronome.nextBeatTime = Math.max(metronome.nextBeatTime, context.currentTime);

  while (metronome.nextBeatTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
    const beat = metronome.beat;
    if (beat === 0 && advanceLoop()) {
      stopMetronomeAndTraining();
      el.loopStatus.textContent = `Limite de ${state.bpm} BPM atingido`;
      return;
    }
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
  if (state.rampEnabled) {
    setBpm(state.rampStart);
    showBpm();
  }
  // O metrônomo usa o mesmo AudioContext do som da guitarra.
  metronome.context = GuitarAudio.context();
  metronome.output = metronome.context.createGain();
  metronome.output.connect(metronome.context.destination);
  metronome.nextBeatTime = metronome.context.currentTime + 0.05;
  metronome.beat = 0;
  metronome.loop = 0;
  el.loopStatus.textContent = '';
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

// As trocas do treino seguem o metrônomo, então o treino para junto.
function stopMetronomeAndTraining() {
  stopMetronome();
  if (training.running) stopTraining();
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

/* Treino */

// Cada tipo de treino diz quais itens percorrer e como mostrá-los. A contagem das
// batidas, a ordem e a ligação com o metrônomo são as mesmas para todos.
const TRAINING_KINDS = {
  chords: {
    minItems: 2,
    detailIsTab: true,
    items: () => state.trainingItems.map((item) => ({ ...item })),
    key: ({ root, chord, voicing }) => `${root}-${chord}-${voicing}`,
    describe: (item) => ({ name: trainingItemName(item), detail: trainingItemTab(item) }),
    diagram: ({ root, chord, voicing }) => {
      const shape = findVoicings(root, CHORDS.get(chord))[voicing];
      return shape ? chordDiagram(shape, root) : null;
    },
    apply({ root, chord, voicing }) {
      state.root = root;
      state.chord = chord;
      state.voicing = voicing;
      el.rootOptions.querySelector(`input[value="${root}"]`).checked = true;
      el.chordSelect.value = chord;
    },
  },
  notes: {
    minItems: 2,
    items: () => Fretboard.positionsOfPc(STRINGS, pitchClass(state.root), FRET_COUNT),
    key: ({ string, fret }) => `${string}-${fret}`,
    describe: ({ string, fret }) => ({
      name: fret === 0 ? 'Corda solta' : `Casa ${fret}`,
      detail: `Corda ${string + 1} (${textName(STRINGS[string].name)})`,
    }),
    // A nota estudada não muda; a posição atual é destacada no braço (trainingTarget).
    apply() {},
  },
};

function trainingKind() {
  return TRAINING_KINDS[state.trainingKind];
}

// Posição a tocar agora (ou a próxima, com which = 'next') no treino de notas, ou null.
function trainingTarget(which = 'now') {
  if (!training.running || state.trainingKind !== 'notes') return null;
  return training.items[which === 'next' ? training.next : training.index];
}

function pickNextIndex(current) {
  const { items } = training;
  if (state.trainingOrder === 'sequence') return (current + 1) % items.length;

  // Na ordem aleatória, sempre sorteia um item diferente do atual.
  const { key } = trainingKind();
  const currentKey = key(items[current]);
  const options = items.flatMap((item, index) => (key(item) === currentKey ? [] : [index]));
  return options.length ? options[Math.floor(Math.random() * options.length)] : current;
}

function showTrainingItem(index) {
  training.index = index;
  training.next = pickNextIndex(index);
  trainingKind().apply(training.items[index]);
  render();
}

function trainingCountdownText() {
  if (state.trainingUnit === 'beats') return `Batida ${training.beat} de ${state.trainingBeats}`;
  const loop = Math.ceil(training.beat / BEATS_PER_BAR);
  const beat = ((training.beat - 1) % BEATS_PER_BAR) + 1;
  return `Loop ${loop} de ${state.trainingLoops}, tempo ${beat} de ${BEATS_PER_BAR}`;
}

// Chamada a cada batida do metrônomo. O treino começa no primeiro tempo do compasso,
// então a troca por loop sempre cai em um primeiro tempo.
function countTrainingBeat() {
  const beatsPerItem = state.trainingUnit === 'beats' ? state.trainingBeats : state.trainingLoops * BEATS_PER_BAR;
  training.beat++;
  if (training.beat > beatsPerItem) {
    training.beat = 1;
    showTrainingItem(training.next);
  }
  el.trainingCountdown.textContent = trainingCountdownText();
  // A barra entre Agora e Próximo enche até a troca.
  el.trainingProgressBar.style.width = `${(training.beat / beatsPerItem) * 100}%`;
}

function startTraining() {
  stopAllSound();
  training.items = trainingKind().items();
  training.running = true;
  training.beat = 0;
  el.trainingCountdown.textContent = '';
  el.trainingProgressBar.style.width = '0%';
  showTrainingItem(state.trainingOrder === 'random' ? Math.floor(Math.random() * training.items.length) : 0);

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

/* Afinação */

function setTuning(id) {
  stopAllSound();
  if (training.running) stopTraining();
  state.tuning = id;
  STRINGS = Tunings.strings(id);
  voicingCache.clear();
  neck.setStrings(STRINGS);
  // As formas guardadas no treino viram as formas equivalentes na nova afinação.
  state.trainingItems = state.trainingItems.flatMap((item) => {
    const count = findVoicings(item.root, CHORDS.get(item.chord)).length;
    return count ? [{ ...item, voicing: Math.min(item.voicing, count - 1) }] : [];
  });
  state.voicing = 0;
  savePrefs();
  render();
}

/* Som: painel do rodapé */

function renderSoundSettings() {
  const { instrument, volume, duration } = GuitarAudio.settings;
  el.soundInstrument.value = instrument;
  el.soundVolume.value = Math.round(volume * 100);
  el.soundVolumeOut.textContent = `${Math.round(volume * 100)}%`;
  el.soundDuration.value = duration;
  el.soundDurationOut.textContent = `${duration.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
  el.soundOnClick.checked = state.playOnClick;
  const label = GuitarAudio.INSTRUMENTS.find((item) => item.id === instrument).label;
  el.soundSummary.textContent = volume === 0 ? 'mudo' : label.replace('Guitarra ', '').replace(/^./, (c) => c.toLowerCase());
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
  const next = neck.positions[string]?.[fret];
  if (!next) return;

  current.tabIndex = -1;
  next.button.tabIndex = 0;
  next.button.focus();
}

function onRadio(name, handler) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.addEventListener('change', () => handler(input.value));
  });
}

el.rootOptions.addEventListener('change', (event) => {
  state.root = event.target.value;
  state.voicing = 0;
  stopAllSound();
  render();
});

el.scaleSelect.addEventListener('change', (event) => {
  state.scale = event.target.value;
  stopAllSound();
  render();
});

el.chordSelect.addEventListener('change', (event) => {
  state.chord = event.target.value;
  state.voicing = 0;
  stopAllSound();
  render();
});

onRadio('mode', (value) => {
  if (training.running) stopTraining();
  stopAllSound();
  state.mode = value;
  if (state.mode === 'training' && state.voicing < 0) state.voicing = 0;
  render();
});

onRadio('training-kind', (value) => {
  if (training.running) stopTraining();
  state.trainingKind = value;
  render();
});

onRadio('training-order', (value) => {
  state.trainingOrder = value;
});

onRadio('training-unit', (value) => {
  state.trainingUnit = value;
  render();
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
  // O painel Agora/Próximo aparece acima do braço: traz os dois para a vista.
  el.trainingStage.scrollIntoView({ block: 'start', behavior: 'auto' });
  el.trainingStop.focus({ preventScroll: true });
});

el.trainingStop.addEventListener('click', () => {
  stopTraining();
  el.trainingStart.focus();
});

el.voicings.addEventListener('click', (event) => {
  const button = event.target.closest('.voicing');
  if (!button) return;
  chordPlayer.stop();
  state.voicing = Number(button.dataset.voicing);
  render();
  // A lista é recriada a cada renderização; devolve o foco ao botão escolhido.
  el.voicings.querySelector(`[data-voicing="${state.voicing}"]`).focus();
});

// Acordes: palhetada, arpejo e parada.
el.chordStrum.addEventListener('click', () => playChord('strum'));
el.chordArpeggio.addEventListener('click', () => playChord('arpeggio'));
el.chordStop.addEventListener('click', () => chordPlayer.stop());
el.chordRepeat.addEventListener('change', () => {
  state.chordRepeat = el.chordRepeat.checked;
  chordPlayer.options.repeat = state.chordRepeat;
});
onRadio('arp-direction', (value) => {
  state.arpDirection = value;
});
el.arpBpm.addEventListener('input', () => {
  state.arpBpm = Number(el.arpBpm.value);
  el.arpBpmOut.textContent = `${state.arpBpm} BPM`;
  chordPlayer.options.bpm = state.arpBpm;
});

// Shapes da pentatônica.
onRadio('pent-kind', (value) => {
  state.scale = value;
  el.scaleSelect.value = value;
  stopAllSound();
  render();
});

[el.shapesHintMinor, el.shapesHintMajor].forEach((button) => {
  button.addEventListener('click', () => {
    state.scale = button.dataset.pentatonic;
    el.scaleSelect.value = state.scale;
    render();
  });
});

onRadio('shape', (value) => {
  state.shape = value === 'all' ? 'all' : Number(value);
  state.shapeRegion = 0;
  scalePlayer.stop();
  render();
  const shape = selectedShape();
  if (shape) revealPosition(shape.first);
});

el.shapeRegions.addEventListener('change', (event) => {
  state.shapeRegion = Number(event.target.value);
  scalePlayer.stop();
  render();
  revealPosition(selectedShape().first);
});

el.shapePrev.addEventListener('click', () => moveShape(-1));
el.shapeNext.addEventListener('click', () => moveShape(1));

el.shapeFingers.addEventListener('change', () => {
  state.showFingers = el.shapeFingers.checked;
  render();
});

// Mapa dos shapes abaixo do braço.
el.neck.addEventListener('click', (event) => {
  const chip = event.target.closest('.shape-chip');
  if (!chip) return;
  state.shape = Number(chip.dataset.shape);
  state.shapeRegion = Number(chip.dataset.region);
  scalePlayer.stop();
  render();
});

// Player de escala.
onRadio('scale-range', (value) => {
  state.scaleRange = value;
  scalePlayer.stop();
  renderScalePlayer();
});
onRadio('scale-direction', (value) => {
  state.scaleDirection = value;
  scalePlayer.stop();
  renderScalePlayer();
});
el.scaleBpm.addEventListener('change', () => {
  state.scaleBpm = readNumberField(el.scaleBpm, state.scaleBpm);
  scalePlayer.options.bpm = state.scaleBpm;
});
el.scaleRepeat.addEventListener('change', () => {
  state.scaleRepeat = el.scaleRepeat.checked;
  scalePlayer.options.repeat = state.scaleRepeat;
});
el.scalePlay.addEventListener('click', () => {
  if (scalePlayer.status === 'paused') scalePlayer.resume();
  else playScale();
});
el.scalePause.addEventListener('click', () => scalePlayer.pause());
el.scaleStop.addEventListener('click', () => scalePlayer.stop());

// Campo harmônico.
el.fieldModeSelect.addEventListener('change', () => {
  state.fieldMode = el.fieldModeSelect.value;
  selectDegree(state.fieldDegree);
});
onRadio('field-size', (value) => {
  state.fieldSize = value;
  selectDegree(state.fieldDegree);
});
onRadio('field-view', (value) => {
  state.fieldView = value;
  render();
});

function onFieldClick(event) {
  const play = event.target.closest('[data-play-degree]');
  if (play) {
    const index = Number(play.dataset.playDegree);
    if (index !== state.fieldDegree) selectDegree(index);
    playChord('strum');
    return;
  }
  const card = event.target.closest('[data-degree]');
  if (!card) return;
  selectDegree(Number(card.dataset.degree));
  // A lista é recriada a cada renderização; devolve o foco ao grau escolhido.
  el.fieldPanel.querySelector(`[data-degree="${state.fieldDegree}"]`)?.focus();
}
el.fieldCards.addEventListener('click', onFieldClick);
el.fieldTable.addEventListener('click', onFieldClick);

// Notas soltas: chips do título do braço e notas do grau.
function onNoteChip(event) {
  const chip = event.target.closest('.note-chip');
  if (!chip) return;
  const position = referencePosition(Number(chip.dataset.pc));
  if (position) playPosition(position);
}
el.scaleNotes.addEventListener('click', onNoteChip);
el.degreeNotes.addEventListener('click', onNoteChip);

// Afinação.
el.tuningSelect.addEventListener('change', () => setTuning(el.tuningSelect.value));

// Som.
el.soundInstrument.addEventListener('change', () => {
  GuitarAudio.setInstrument(el.soundInstrument.value);
  savePrefs();
  renderSoundSettings();
});
el.soundVolume.addEventListener('input', () => {
  GuitarAudio.setVolume(Number(el.soundVolume.value) / 100);
  savePrefs();
  renderSoundSettings();
});
el.soundDuration.addEventListener('input', () => {
  GuitarAudio.setDuration(Number(el.soundDuration.value));
  savePrefs();
  renderSoundSettings();
});
el.soundOnClick.addEventListener('change', () => {
  state.playOnClick = el.soundOnClick.checked;
  savePrefs();
});
el.stopSound.addEventListener('click', stopAllSound);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && el.stopSound.hidden === false) stopAllSound();
});

el.metronomeToggle.addEventListener('click', () => {
  if (metronome.timer === null) {
    startMetronome();
    return;
  }
  stopMetronomeAndTraining();
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
  el.rampStart.disabled = !state.rampEnabled;
  if (state.rampEnabled) {
    // Parte do BPM atual, para o valor não mudar de surpresa ao ligar a opção.
    state.rampStart = state.bpm;
    el.rampStart.value = state.bpm;
  }
  el.rampEvery.disabled = !state.rampEnabled;
  el.rampStep.disabled = !state.rampEnabled;
  el.rampLimitEnabled.disabled = !state.rampEnabled;
  el.rampLimit.disabled = !hasRampLimit();
  metronome.loop = 0; // a contagem recomeça no próximo primeiro tempo
  renderRampSummary();
});

el.rampLimitEnabled.addEventListener('change', () => {
  state.rampLimitEnabled = el.rampLimitEnabled.checked;
  el.rampLimit.disabled = !hasRampLimit();
  renderRampSummary();
});

el.rampLimit.addEventListener('change', () => {
  state.rampLimit = readNumberField(el.rampLimit, state.rampLimit);
  renderRampSummary();
});

el.rampStart.addEventListener('change', () => {
  state.rampStart = readNumberField(el.rampStart, state.rampStart);
});

el.rampEvery.addEventListener('change', () => {
  state.rampEvery = readNumberField(el.rampEvery, state.rampEvery);
  renderRampSummary();
});

el.rampStep.addEventListener('change', () => {
  state.rampStep = readNumberField(el.rampStep, state.rampStep);
  renderRampSummary();
});

onRadio('notation', (value) => {
  state.notation = value;
  render();
});

// Clique numa casa: toca a nota (se ligado no painel Som) e marca ou desmarca.
el.neck.addEventListener('click', (event) => {
  const button = event.target.closest('.pos');
  if (!button) return;
  const position = { string: Number(button.dataset.string), fret: Number(button.dataset.fret) };
  if (state.playOnClick) playPosition(position);
  toggleSelection(position.string, position.fret);
});

el.neck.addEventListener('keydown', moveFocus);

el.cards.addEventListener('click', (event) => {
  const play = event.target.closest('.card-play');
  if (play) {
    playPosition({ string: Number(play.dataset.string), fret: Number(play.dataset.fret) });
    return;
  }
  const button = event.target.closest('.card-remove');
  if (button) toggleSelection(Number(button.dataset.string), Number(button.dataset.fret));
});

el.clear.addEventListener('click', () => {
  state.selected = [];
  render();
});

// Tema claro ou escuro. O script no <head> já aplicou o tema inicial; aqui ficam a
// troca pelo botão (que passa a valer sempre) e o acompanhamento do sistema enquanto
// a pessoa não escolheu nada.
const THEME_KEY = 'theme';
const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const label = `Mudar para o tema ${theme === 'dark' ? 'claro' : 'escuro'}`;
  el.themeToggle.setAttribute('aria-label', label);
  el.themeToggle.title = label;
}

el.themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sem armazenamento (janela anônima, arquivo bloqueado): vale só nesta visita.
  }
  applyTheme(theme);
});

darkScheme.addEventListener('change', (event) => {
  if (!savedTheme()) applyTheme(event.matches ? 'dark' : 'light');
});

applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

buildRootOptions();
buildSelect(el.scaleSelect, SCALE_GROUPS, 'scales', state.scale);
buildSelect(el.chordSelect, CHORD_GROUPS, 'chords', state.chord);
buildOptions(el.fieldModeSelect, Theory.FIELD_MODES, state.fieldMode);
buildOptions(el.tuningSelect, Tunings.LIST, state.tuning, (tuning) => `${tuning.label} (${Tunings.describeTuning(tuning.id)})`);
buildOptions(el.soundInstrument, GuitarAudio.INSTRUMENTS, GuitarAudio.settings.instrument);
buildBeats();
neck = Neck.build(el.neck, { fretCount: FRET_COUNT, markedFrets: MARKED_FRETS, stringCount: STRINGS.length });
neck.setStrings(STRINGS);
renderRampSummary();
renderSoundSettings();
render();
