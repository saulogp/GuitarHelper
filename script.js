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

const state = {
  root: 'C',
  scale: 'major',
  notation: 'letters',
  selected: [], // [{ string, fret }], a mais recente primeiro
};

const el = {
  rootOptions: document.getElementById('root-options'),
  scaleSelect: document.getElementById('scale-select'),
  scaleTitle: document.getElementById('scale-title'),
  scaleNotes: document.getElementById('scale-notes'),
  neck: document.getElementById('neck'),
  cards: document.getElementById('cards'),
  empty: document.getElementById('empty'),
  clear: document.getElementById('clear'),
};

const positions = []; // positions[corda][casa] = { button, note }
let scaleNotes = new Map(); // classe de altura → { name, degree }

/* Teoria musical */

function pitchClass(name) {
  const natural = NATURAL_PCS[LETTERS.indexOf(name[0])];
  const accidental = name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0;
  return (natural + accidental + 12) % 12;
}

function degreeSemitones(degree) {
  const number = Number(degree.at(-1));
  const accidental = degree[0] === '#' ? 1 : degree[0] === 'b' ? -1 : 0;
  return NATURAL_PCS[number - 1] + accidental;
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
  for (const degree of SCALES.get(state.scale).degrees) {
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

/* Formatação */

function textName(name) {
  return state.notation === 'solfege' ? SOLFEGE[name[0]] + name.slice(1) : name;
}

function scaleTitle() {
  const root = textName(state.root);
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
  if (state.scale === 'none' || state.scale === 'note') {
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

function buildScaleSelect() {
  for (const group of SCALE_GROUPS) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    for (const scale of group.scales) {
      optgroup.append(new Option(scale.label, scale.id, false, scale.id === state.scale));
    }
    el.scaleSelect.append(optgroup);
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

  positions.forEach((frets, string) => {
    frets.forEach(({ button, note: noteNode }, fret) => {
      const note = noteAt(string, fret);
      const isSelected = selected.has(`${string}-${fret}`);
      const showTonic = note.isRoot && note.inScale;

      button.classList.toggle('is-scale', note.inScale);
      button.classList.toggle('is-tonic', showTonic);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected);
      button.setAttribute('aria-label', `${positionLabel({ string, fret })}: ${textName(note.name)}`);
      noteNode.textContent = state.notation === 'degrees' ? note.degree : textName(note.name);
    });
  });
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
  scaleNotes = buildScaleNotes();
  renderRootOptions();
  renderSummary();
  renderNeck();
  renderSelection();
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
  render();
});

el.scaleSelect.addEventListener('change', (event) => {
  state.scale = event.target.value;
  render();
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
buildScaleSelect();
buildNeck();
render();
