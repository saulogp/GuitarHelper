'use strict';

/*
  Shapes da pentatônica, calculados (nada de desenho fixo). Cada shape tem duas notas
  por corda: começa na corda 6 num grau da escala e segue subindo pelas notas da
  escala, duas em cada corda, até a corda 1. O shape N começa no grau N, então o
  shape 1 começa na tônica, e cada shape termina onde o seguinte começa.

  Em afinação padrão isso gera os cinco desenhos tradicionais (o "box" da menor de Lá
  na casa 5, por exemplo); em outras afinações, o mesmo cálculo se adapta. Depende de
  Theory.
*/
const PentatonicShapes = (() => {
  const NOTES_PER_STRING = 2;

  // Digitação sugerida: o indicador fica na casa mais baixa do shape (uma casa por
  // dedo). Se a nota mais alta de uma corda passar do mindinho, a mão desliza naquela
  // corda; na casa 0 a corda é solta.
  function fingering(notes, minFret) {
    const byString = new Map();
    for (const note of notes) {
      if (!byString.has(note.string)) byString.set(note.string, []);
      byString.get(note.string).push(note);
    }

    for (const group of byString.values()) {
      const base = minFret === 0 ? 1 : minFret;
      const fingers = group.map(({ fret }) => (fret === 0 ? 0 : fret - base + 1));
      const top = group[group.length - 1].fret;
      if (fingers[fingers.length - 1] > 4) {
        // Desliza: o dedo 4 fica na nota mais alta e os outros contam a partir dele.
        group.forEach((note, i) => {
          note.finger = note.fret === 0 ? 0 : Math.max(1, 4 - (top - note.fret));
        });
      } else {
        group.forEach((note, i) => {
          note.finger = Math.max(note.fret === 0 ? 0 : 1, fingers[i]);
        });
      }
    }
  }

  // scaleDegrees: os cinco graus da pentatônica (ex.: 1 b3 4 5 b7).
  function compute(root, scaleDegrees, strings, fretCount) {
    const rootPc = Theory.pitchClass(root);
    const pcs = scaleDegrees.map((degree) => (rootPc + Theory.degreeSemitones(degree) + 12) % 12);
    const lowest = strings.length - 1;
    const count = strings.length * NOTES_PER_STRING;
    const shapes = [];

    for (let shape = 0; shape < pcs.length; shape++) {
      const startFret = (pcs[shape] - strings[lowest].pc + 12) % 12;
      const instances = [];

      // O mesmo shape se repete uma oitava (12 casas) acima.
      for (let base = startFret; base <= fretCount; base += 12) {
        const notes = [];
        let midi = strings[lowest].midi + base;
        for (let i = 0; i < count; i++) {
          const index = (shape + i) % pcs.length;
          if (i > 0) {
            const previous = pcs[(shape + i - 1) % pcs.length];
            midi += (pcs[index] - previous + 12) % 12 || 12;
          }
          const string = lowest - Math.floor(i / NOTES_PER_STRING);
          const fret = midi - strings[string].midi;
          notes.push({
            string,
            fret,
            midi,
            pc: pcs[index],
            degree: scaleDegrees[index],
            isRoot: index === 0,
          });
        }

        if (notes.some(({ fret }) => fret < 0 || fret > fretCount)) continue;
        const frets = notes.map(({ fret }) => fret);
        const minFret = Math.min(...frets);
        const maxFret = Math.max(...frets);
        fingering(notes, minFret);
        instances.push({
          shape,
          number: shape + 1,
          minFret,
          maxFret,
          notes,
          first: notes[0],
          last: notes[notes.length - 1],
        });
      }

      shapes.push({ shape, number: shape + 1, startDegree: scaleDegrees[shape], instances });
    }

    return shapes;
  }

  // Todas as ocorrências, na ordem em que aparecem subindo o braço.
  function alongNeck(shapes) {
    return shapes
      .flatMap((item) => item.instances)
      .sort((a, b) => a.minFret - b.minFret || a.maxFret - b.maxFret);
  }

  return { compute, alongNeck };
})();

if (typeof module === 'object' && module.exports) module.exports = PentatonicShapes;
