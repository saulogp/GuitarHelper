'use strict';

/*
  Motor de teoria musical. Tudo é calculado a partir de fórmulas (graus e semitons):
  nenhuma escala, acorde ou campo harmônico é cadastrado por tonalidade.

  Script comum (o app abre direto do arquivo, sem servidor), então expõe um único nome
  global, Theory. No Node, os testes o carregam com require().
*/
const Theory = (() => {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const SOLFEGE = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' };
  const INTERVALS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

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

  // symbol: cifra; spoken: como se fala depois do nome da nota; roman: sufixo no grau.
  const CHORD_GROUPS = [
    {
      label: 'Tríades',
      chords: [
        { id: 'maj', symbol: '', label: 'Maior', spoken: 'maior', roman: '', degrees: ['1', '3', '5'] },
        { id: 'min', symbol: 'm', label: 'Menor', spoken: 'menor', roman: 'm', degrees: ['1', 'b3', '5'] },
        { id: 'dim', symbol: 'dim', label: 'Diminuto', spoken: 'diminuto', roman: '°', degrees: ['1', 'b3', 'b5'] },
        { id: 'aug', symbol: 'aug', label: 'Aumentado', spoken: 'aumentado', roman: '+', degrees: ['1', '3', '#5'] },
        { id: 'sus2', symbol: 'sus2', label: 'Suspenso com 2ª', spoken: 'com segunda suspensa', roman: 'sus2', degrees: ['1', '2', '5'] },
        { id: 'sus4', symbol: 'sus4', label: 'Suspenso com 4ª', spoken: 'com quarta suspensa', roman: 'sus4', degrees: ['1', '4', '5'] },
        { id: 'power', symbol: '5', label: 'Power chord', spoken: 'power chord', roman: '5', degrees: ['1', '5'], maxStrings: 3 },
      ],
    },
    {
      label: 'Sétimas e sextas',
      chords: [
        { id: '7', symbol: '7', label: 'Com sétima', spoken: 'com sétima', roman: '7', degrees: ['1', '3', '5', 'b7'] },
        { id: 'maj7', symbol: 'maj7', label: 'Com sétima maior', spoken: 'com sétima maior', roman: '7M', degrees: ['1', '3', '5', '7'] },
        { id: 'm7', symbol: 'm7', label: 'Menor com sétima', spoken: 'menor com sétima', roman: 'm7', degrees: ['1', 'b3', '5', 'b7'] },
        { id: 'mMaj7', symbol: 'm(maj7)', label: 'Menor com sétima maior', spoken: 'menor com sétima maior', roman: 'm(7M)', degrees: ['1', 'b3', '5', '7'] },
        { id: 'm7b5', symbol: 'm7(b5)', label: 'Meio diminuto', spoken: 'meio diminuto', roman: 'm7(b5)', degrees: ['1', 'b3', 'b5', 'b7'] },
        { id: 'dim7', symbol: 'dim7', label: 'Diminuto com sétima', spoken: 'diminuto com sétima', roman: '°7', degrees: ['1', 'b3', 'b5', 'bb7'] },
        { id: 'maj7#5', symbol: 'maj7(#5)', label: 'Aumentado com sétima maior', spoken: 'aumentado com sétima maior', roman: '+7M', degrees: ['1', '3', '#5', '7'] },
        { id: '7sus4', symbol: '7sus4', label: 'Com sétima e 4ª suspensa', spoken: 'com sétima e quarta suspensa', roman: '7sus4', degrees: ['1', '4', '5', 'b7'] },
        { id: '6', symbol: '6', label: 'Com sexta', spoken: 'com sexta', roman: '6', degrees: ['1', '3', '5', '6'] },
        { id: 'm6', symbol: 'm6', label: 'Menor com sexta', spoken: 'menor com sexta', roman: 'm6', degrees: ['1', 'b3', '5', '6'] },
      ],
    },
    {
      label: 'Com nona',
      chords: [
        { id: 'add9', symbol: 'add9', label: 'Com nona adicionada', spoken: 'com nona adicionada', roman: 'add9', degrees: ['1', '3', '5', '9'] },
        { id: '9', symbol: '9', label: 'Com sétima e nona', spoken: 'com sétima e nona', roman: '9', degrees: ['1', '3', '5', 'b7', '9'] },
        { id: 'm9', symbol: 'm9', label: 'Menor com sétima e nona', spoken: 'menor com sétima e nona', roman: 'm9', degrees: ['1', 'b3', '5', 'b7', '9'] },
      ],
    },
  ];

  const CHORDS = new Map(CHORD_GROUPS.flatMap((group) => group.chords).map((chord) => [chord.id, chord]));

  // Escalas de onde sai o campo harmônico: os acordes nascem empilhando terças nelas.
  const FIELD_MODES = [
    { id: 'major', label: 'Maior', scale: 'major', spoken: 'maior' },
    { id: 'minor', label: 'Menor natural', scale: 'minor', spoken: 'menor' },
    { id: 'harmonic', label: 'Menor harmônica', scale: 'harmonic', spoken: 'menor harmônica' },
  ];

  /* Notas e intervalos */

  function accidentalOf(name) {
    let value = 0;
    for (const sign of name.slice(1)) value += sign === '#' ? 1 : sign === 'b' ? -1 : 0;
    return value;
  }

  function pitchClass(name) {
    const natural = NATURAL_PCS[LETTERS.indexOf(name[0])];
    return (((natural + accidentalOf(name)) % 12) + 12) % 12;
  }

  function parseDegree(degree) {
    const match = /^([b#]*)(\d+)$/.exec(degree);
    const signs = match[1];
    const accidental = signs.split('').reduce((sum, sign) => sum + (sign === '#' ? 1 : -1), 0);
    return { number: Number(match[2]), accidental };
  }

  // Semitons do grau acima da tônica, dentro de uma oitava (9 = 2, 11 = 4…).
  function degreeSemitones(degree) {
    const { number, accidental } = parseDegree(degree);
    return NATURAL_PCS[(number - 1) % 7] + accidental;
  }

  function usesFlats(root) {
    return root.includes('b') || root === 'F';
  }

  function plainName(pc, root) {
    return (usesFlats(root) ? FLAT_NAMES : SHARP_NAMES)[pc];
  }

  // Grafia correta pelo grau: em Fá maior o 4º grau é Bb, não A#. Por padrão, dobrados
  // (Bbb) viram a forma simples equivalente, que é o que se lê na prática em cifras;
  // com { doubles: true } eles são mantidos, como na escrita de uma tonalidade.
  function spellDegree(root, degree, { doubles = false } = {}) {
    const pc = (((pitchClass(root) + degreeSemitones(degree)) % 12) + 12) % 12;
    const { number } = parseDegree(degree);
    const letterIndex = (LETTERS.indexOf(root[0]) + number - 1) % 7;
    const difference = ((pc - NATURAL_PCS[letterIndex] + 18) % 12) - 6;

    if (Math.abs(difference) > (doubles ? 2 : 1)) return { pc, name: plainName(pc, root) };

    const accidental = difference > 0 ? '#'.repeat(difference) : 'b'.repeat(-difference);
    return { pc, name: LETTERS[letterIndex] + accidental };
  }

  // Nome falado: "Si bemol", "Fá sustenido".
  function spokenNote(name) {
    const accidental = accidentalOf(name);
    const words = {
      '-2': ' dobrado bemol', '-1': ' bemol', 0: '', 1: ' sustenido', 2: ' dobrado sustenido',
    };
    return SOLFEGE[name[0]] + (words[accidental] ?? '');
  }

  function accidentalCount(names) {
    return names.reduce((sum, name) => sum + Math.abs(accidentalOf(name)), 0);
  }

  function spellScale(root, degrees, options) {
    return degrees.map((degree) => ({ degree, ...spellDegree(root, degree, options) }));
  }

  // A grafia usual de uma tonalidade é a que tem menos acidentes: C# maior (7 sustenidos)
  // se escreve Db maior (5 bemóis), e Ab menor (7 bemóis) se escreve G# menor (5 sustenidos).
  function keyName(root, scaleId) {
    const pc = pitchClass(root);
    const { degrees } = SCALES.get(scaleId);
    const candidates = [...new Set([root, SHARP_NAMES[pc], FLAT_NAMES[pc]])];
    const cost = (name) => accidentalCount(spellScale(name, degrees, { doubles: true }).map((note) => note.name));
    return candidates.reduce((best, name) => (cost(name) < cost(best) ? name : best));
  }

  /* Acordes */

  function chordSemitones(chord) {
    return chord.degrees.map((degree) => ((degreeSemitones(degree) % 12) + 12) % 12);
  }

  // Reconhece o acorde pelos intervalos a partir da fundamental (ex.: [0, 3, 6] = dim).
  function chordFromSemitones(semitones) {
    const key = semitones.join(',');
    for (const chord of CHORDS.values()) {
      if (chordSemitones(chord).join(',') === key) return chord;
    }
    return null;
  }

  function chordNotes(root, chord) {
    return chord.degrees.map((degree) => ({ degree, ...spellDegree(root, degree) }));
  }

  function chordName(root, chord) {
    return root + chord.symbol;
  }

  function chordSpoken(root, chord) {
    return `${spokenNote(root)} ${chord.spoken}`;
  }

  /* Campo harmônico */

  // Função harmônica de cada grau. No menor, o VI e o bVI têm função de subdominante.
  const FUNCTIONS = {
    major: ['Tônica', 'Subdominante', 'Tônica', 'Subdominante', 'Dominante', 'Tônica', 'Dominante'],
    minor: ['Tônica', 'Subdominante', 'Tônica', 'Subdominante', 'Dominante', 'Subdominante', 'Dominante'],
  };

  function romanFor(degree) {
    const { number, accidental } = parseDegree(degree);
    // O numeral compara o grau com a escala maior: na menor, o 3º grau é bIII.
    const major = SCALES.get('major').degrees[number - 1];
    const difference = accidental - parseDegree(major).accidental;
    const sign = difference < 0 ? 'b'.repeat(-difference) : '#'.repeat(difference);
    return sign + ROMAN[number - 1];
  }

  function relationText(index, modeId, notes, chordsByIndex) {
    const name = (i) => chordsByIndex[i].name;
    const isMajor = modeId === 'major';
    if (isMajor) {
      return [
        'Centro da tonalidade: o acorde de repouso.',
        `Relativo do IV (${name(3)}). Prepara a dominante no II–V–I.`,
        `Anti-relativo do I: pode substituir ${name(0)} como tônica.`,
        `Subdominante: afasta da tônica e prepara o V (${name(4)}).`,
        `Dominante: a tensão que pede a volta ao I (${name(0)}).`,
        `Relativo menor do I: ${name(5)} é a tonalidade relativa de ${name(0)}.`,
        `Contém o trítono do V: soa como ${name(4)} sem a fundamental.`,
      ][index];
    }
    const harmonic = modeId === 'harmonic';
    return [
      'Centro da tonalidade menor: o acorde de repouso.',
      `Prepara a dominante no II–V–I menor (${name(1)} – ${name(4)} – ${name(0)}).`,
      `Relativo maior do I: ${notes[2].name} maior usa as mesmas notas de ${notes[0].name} menor natural.`,
      'Subdominante menor: afasta da tônica.',
      harmonic
        ? `Dominante com sensível (${notes[6].name}): resolve com força no I.`
        : `Dominante sem sensível: tensão mais suave que o V da menor harmônica.`,
      'Subdominante; também substitui a tônica na cadência de engano.',
      harmonic
        ? `Sensível: soa como ${name(4)} sem a fundamental.`
        : `Subtônica: um tom abaixo de ${notes[0].name}.`,
    ][index];
  }

  // Os sete acordes do campo: em cada grau, empilha terças da própria escala
  // (graus 1, 3, 5 e, nas tétrades, 7) e reconhece o acorde pelos intervalos.
  function harmonicField(root, modeId, size = 'triads') {
    const mode = FIELD_MODES.find((item) => item.id === modeId);
    // A grafia da tonalidade vem da armadura: maior ou menor natural (a harmônica só
    // altera a sétima, então G# menor harmônica segue G# menor, com F## na sétima).
    const key = keyName(root, modeId === 'major' ? 'major' : 'minor');
    const notes = spellScale(key, SCALES.get(mode.scale).degrees, { doubles: true });
    const stack = size === 'tetrads' ? [0, 2, 4, 6] : [0, 2, 4];

    const chords = notes.map((note, index) => {
      const tones = stack.map((step) => notes[(index + step) % 7]);
      const semitones = tones.map((tone) => (tone.pc - note.pc + 12) % 12);
      const chord = chordFromSemitones(semitones);
      const roman = romanFor(note.degree);
      return {
        index,
        degree: note.degree,
        roman,
        numeral: roman + chord.roman,
        root: note.name,
        rootPc: note.pc,
        chord,
        name: chordName(note.name, chord),
        spoken: chordSpoken(note.name, chord),
        quality: chord.label,
        tones: tones.map((tone, i) => ({ name: tone.name, pc: tone.pc, degree: chord.degrees[i] })),
        formula: chord.degrees,
        function: FUNCTIONS[modeId === 'major' ? 'major' : 'minor'][index],
      };
    });

    chords.forEach((item) => {
      item.relation = relationText(item.index, modeId, notes, chords);
    });

    return { key, mode, notes, chords };
  }

  return {
    LETTERS,
    NATURAL_PCS,
    SHARP_NAMES,
    FLAT_NAMES,
    ROOTS,
    SOLFEGE,
    INTERVALS,
    SCALE_GROUPS,
    SCALES,
    CHORD_GROUPS,
    CHORDS,
    FIELD_MODES,
    accidentalOf,
    pitchClass,
    degreeSemitones,
    usesFlats,
    plainName,
    spellDegree,
    spellScale,
    spokenNote,
    keyName,
    chordSemitones,
    chordFromSemitones,
    chordNotes,
    chordName,
    chordSpoken,
    harmonicField,
  };
})();

if (typeof module === 'object' && module.exports) module.exports = Theory;
