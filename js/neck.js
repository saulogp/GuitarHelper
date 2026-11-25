'use strict';

/*
  Renderização do braço: monta a grade (cordas, casas, trastes, marcações) e oferece
  os elementos que o app pinta a cada renderização. Não sabe nada de escalas ou
  acordes: quem decide o que cada casa mostra é o script.js.

  Colunas da grade: 1 = nome da corda, 2 = corda solta (casa 0), casa N = coluna N + 2.
  Linhas: 1 a 6 = cordas 1 a 6, 7 = números das casas, 8 e 9 = mapa dos shapes.
*/
const Neck = (() => {
  const STRING_THICKNESS = [1, 1.3, 1.7, 2.1, 2.6, 3.2];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function place(node, row, column) {
    node.style.gridRow = row;
    node.style.gridColumn = column;
    return node;
  }

  const columnOf = (fret) => fret + 2;

  function build(container, { fretCount, markedFrets, stringCount = 6 }) {
    // As casas encolhem em direção ao corpo, como numa guitarra real, mas de forma
    // atenuada para que as notas caibam nas casas mais agudas.
    const fretWidths = Array.from({ length: fretCount }, (_, i) => `${2 ** (-(i + 1) / 24)}fr`);
    container.style.gridTemplateColumns = `20px 50px ${fretWidths.join(' ')}`;

    container.append(element('div', 'wood'), element('div', 'nut'));

    // Faixa que marca a região do shape escolhido, atrás das notas.
    const band = place(element('div', 'shape-band'), '1 / 7', '2 / 3');
    band.hidden = true;
    container.append(band);

    for (let fret = 1; fret <= fretCount; fret++) {
      container.append(place(element('div', 'fret'), '1 / 7', columnOf(fret)));
      if (markedFrets.includes(fret)) {
        const inlay = element('div', fret === 12 ? 'inlay double' : 'inlay');
        container.append(place(inlay, '1 / 7', columnOf(fret)));
      }
    }

    for (let fret = 0; fret <= fretCount; fret++) {
      const number = element('div', markedFrets.includes(fret) ? 'fret-number marked' : 'fret-number', fret);
      container.append(place(number, 7, columnOf(fret)));
    }

    const positions = [];
    const stringLabels = [];
    for (let string = 0; string < stringCount; string++) {
      const line = place(element('div', 'string'), string + 1, '2 / -1');
      line.style.height = `${STRING_THICKNESS[string]}px`;
      container.append(line);

      const label = place(element('div', 'string-name'), string + 1, 1);
      stringLabels.push(label);
      container.append(label);

      positions[string] = [];
      for (let fret = 0; fret <= fretCount; fret++) {
        const button = place(element('button', 'pos'), string + 1, columnOf(fret));
        button.type = 'button';
        button.dataset.string = string;
        button.dataset.fret = fret;
        button.tabIndex = -1;
        const note = element('span', 'note');
        const finger = element('span', 'finger');
        finger.setAttribute('aria-hidden', 'true');
        button.append(note, finger);
        container.append(button);
        positions[string][fret] = { button, note, finger };
      }
    }
    positions[0][0].button.tabIndex = 0;

    // Só agrupa as faixas no DOM: com display: contents, elas se posicionam na grade.
    const map = element('div', 'shape-map');
    container.append(map);

    return {
      positions,

      // Nome de cada corda solta, na coluna à esquerda (muda com a afinação).
      setStrings(strings) {
        strings.forEach((open, string) => {
          stringLabels[string].textContent = open.name;
          stringLabels[string].title = `Corda ${string + 1}: ${open.name}${open.octave}`;
        });
      },

      // Faixa do shape escolhido (ou nenhuma, com null): marca onde ele começa e termina.
      setBand(range) {
        band.hidden = !range;
        if (!range) return;
        band.style.gridColumn = `${columnOf(range.minFret)} / ${columnOf(range.maxFret) + 1}`;
      },

      // Mapa dos shapes: uma faixa clicável por ocorrência, em duas pistas para que
      // shapes vizinhos (que se sobrepõem) não fiquem um em cima do outro.
      setMap(items) {
        container.classList.toggle('has-shape-map', items.length > 0);
        map.replaceChildren(...items.map((item, order) => {
          const chip = place(
            element('button', 'shape-chip', item.text),
            order % 2 === 0 ? 8 : 9,
            `${columnOf(item.minFret)} / ${columnOf(item.maxFret) + 1}`,
          );
          chip.type = 'button';
          chip.dataset.shape = item.shape;
          chip.dataset.region = item.region;
          chip.setAttribute('aria-pressed', item.selected);
          chip.setAttribute('aria-label', item.label);
          return chip;
        }));
      },
    };
  }

  return { build, STRING_THICKNESS };
})();
