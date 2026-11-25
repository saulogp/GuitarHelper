'use strict';

/*
  Formação de acordes no braço: gera as formas (voicings) tocáveis de um acorde para
  a afinação atual. Uma forma é a casa de cada corda (null = corda abafada), da
  corda 1 (índice 0) à 6. Depende de Theory.
*/
const ChordShapes = (() => {
  const MAX_FRET_SPAN = 3; // distância máxima entre casas pressionadas numa mesma forma
  const MAX_FINGERS = 4;
  const OPEN_POSITION_MAX_FRET = 3; // formas com cordas soltas só pressionam até esta casa

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

  function heardTones(frets, strings) {
    return new Set(frets.flatMap((fret, string) => (
      fret === null ? [] : [(strings[string].pc + fret) % 12]
    )));
  }

  function lowestFret(frets) {
    const pressed = frets.filter((fret) => fret > 0);
    return pressed.length ? Math.min(...pressed) : 0;
  }

  function voicingScore(frets, tones, strings) {
    const sounding = frets.filter((fret) => fret !== null);
    const pressed = sounding.filter((fret) => fret > 0);
    const span = pressed.length ? Math.max(...pressed) - Math.min(...pressed) : 0;
    return sounding.length * 3 - fingersNeeded(frets) * 2 - span
      + (heardTones(frets, strings).size === tones.size ? 2 : 0);
  }

  // Procura, para cada tônica no baixo (cordas 6, 5 e 4, dentro de uma oitava), a melhor
  // forma fechada e a melhor forma com cordas soltas. Sem abafar cordas no meio da forma.
  function find(root, chord, strings, fretCount) {
    const rootPc = Theory.pitchClass(root);
    const toneOf = (degree) => (rootPc + Theory.degreeSemitones(degree) + 12) % 12;
    const tones = new Set(chord.degrees.map(toneOf));
    // A quinta é a nota dispensável em acordes de quatro ou mais notas.
    const required = chord.degrees.filter((degree) => chord.degrees.length < 4 || degree !== '5').map(toneOf);
    const maxStrings = chord.maxStrings ?? strings.length;
    const minStrings = chord.maxStrings ? 2 : 4;
    const best = new Map();

    function consider(frets, bassString) {
      const sounding = frets.filter((fret) => fret !== null).length;
      if (sounding < minStrings || sounding > maxStrings) return;
      const heard = heardTones(frets, strings);
      if (!required.every((tone) => heard.has(tone))) return;
      if (fingersNeeded(frets) > MAX_FINGERS) return;
      if (frets.includes(0) && Math.max(...frets) > OPEN_POSITION_MAX_FRET) return;
      // Corda solta logo acima de um baixo pressionado costuma gerar formas pouco naturais.
      if (frets[bassString] > 0 && frets[bassString - 1] === 0) return;

      const score = voicingScore(frets, tones, strings);
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

      if (bassFret <= OPEN_POSITION_MAX_FRET && tones.has(strings[string].pc)) {
        frets[string] = 0;
        extend(frets, string - 1, bassString);
        frets[string] = null;
      }

      const first = Math.max(1, high - MAX_FRET_SPAN);
      const last = Math.min(fretCount, low + MAX_FRET_SPAN);
      for (let fret = first; fret <= last; fret++) {
        if (!tones.has((strings[string].pc + fret) % 12)) continue;
        frets[string] = fret;
        extend(frets, string - 1, bassString);
        frets[string] = null;
      }
    }

    for (const bassString of [5, 4, 3]) {
      for (let fret = 0; fret < 12; fret++) {
        if ((strings[bassString].pc + fret) % 12 !== rootPc) continue;
        const frets = Array(strings.length).fill(null);
        frets[bassString] = fret;
        extend(frets, bassString - 1, bassString);
      }
    }

    return [...best.values()].sort((a, b) => lowestFret(a.frets) - lowestFret(b.frets) || b.bassString - a.bassString);
  }

  // Posições tocadas de uma forma, da corda mais grave para a mais aguda (ordem da palhetada).
  function soundingPositions({ frets }) {
    return frets
      .map((fret, string) => ({ string, fret }))
      .filter(({ fret }) => fret !== null)
      .sort((a, b) => b.string - a.string);
  }

  // Da corda 6 para a 1, como se lê uma cifra: x-3-2-0-1-0.
  function tabText({ frets }) {
    return [...frets].reverse().map((fret) => (fret === null ? 'x' : fret)).join('-');
  }

  return {
    MAX_FRET_SPAN,
    fingersNeeded,
    heardTones,
    lowestFret,
    find,
    soundingPositions,
    tabText,
  };
})();

if (typeof module === 'object' && module.exports) module.exports = ChordShapes;
