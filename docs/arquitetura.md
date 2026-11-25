# Arquitetura

Como os módulos do Guitar Helper se encaixam e por que algumas decisões foram tomadas. Para usar o app, veja o [README](../README.md).

## Restrição de partida: abrir direto do arquivo

O app abre com dois cliques no `index.html`, sem servidor e sem instalar nada. Nessa situação (`file://`), o navegador bloqueia módulos ES (`<script type="module">` com `import`). Por isso cada módulo é um script comum que expõe um único nome global (`Theory`, `Tunings`, `ChordShapes`...), e o `index.html` os carrega na ordem das dependências. Os módulos de cálculo também exportam com `module.exports`, para os testes os carregarem no Node.

## Camadas

```
index.html
  js/theory.js    Theory              notas, intervalos, grafia, escalas, acordes, campo harmônico
  js/tunings.js   Tunings, Fretboard  afinações, frequências, onde cada altura fica no braço
  js/chords.js    ChordShapes         formas tocáveis de um acorde (usa Theory)
  js/shapes.js    PentatonicShapes    shapes da pentatônica e digitação (usa Theory)
  js/audio.js     GuitarAudio,        síntese da corda, timbres, vozes, volume
                  SequencePlayer      tocar/pausar/parar/repetir passos no tempo
  js/neck.js      Neck                grade do braço no DOM, faixa e mapa dos shapes
  script.js       app                 estado, renderização, eventos, metrônomo, treino
```

Os módulos de `js/` não conhecem o estado do app: recebem tudo por parâmetro (a tônica, a fórmula, as cordas da afinação). Só o `script.js` sabe qual aba está aberta, o que está escolhido e o que mostrar em cada casa.

## Uma única referência de afinação

`Tunings.strings(id)` devolve as seis cordas com nome, classe de altura, número MIDI e frequência. O `script.js` guarda o resultado em `STRINGS`, e tudo lê dali: a nota de cada casa (`Fretboard.pcAt`), as formas dos acordes, os shapes, o nome das cordas no braço e a altura que o som toca (`Fretboard.midiAt`). Trocar a afinação troca `STRINGS`, limpa o cache das formas e renderiza de novo. Assim, o que se vê e o que se ouve não divergem.

A frequência vem do temperamento igual com Lá 440 Hz. `Tunings.fretFrequency` aplica a fórmula da corda, `f = f₀ × 2^(n/12)`, e os testes conferem que ela coincide com a frequência do número MIDI em todas as casas de todas as afinações.

## Teoria calculada, não cadastrada

- **Escalas e acordes** são fórmulas de graus (`1 b3 5`). A grafia de cada nota sai do grau: a letra é a da distância (a terça de D é uma letra F) e o acidente acerta a altura. Por isso Fá maior tem Bb, e não A#.
- **Campo harmônico:** em cada grau da escala, empilha terças da própria escala (graus 1, 3, 5 e, nas tétrades, 7) e reconhece o acorde pelos intervalos em semitons (`[0, 3, 7]` é menor). Os numerais comparam o grau com a escala maior (o 3º grau da menor é `bIII`). A grafia da tonalidade é a de menos acidentes, calculada contando os acidentes das duas grafias possíveis.
- **Shapes da pentatônica:** o shape N começa no grau N na corda mais grave e segue pelas notas da escala, duas por corda, sempre subindo. Na afinação padrão isso reproduz os cinco desenhos tradicionais, e em outras afinações o mesmo cálculo se adapta. A digitação põe o indicador na casa mais baixa do shape e desliza a mão na corda em que a nota mais alta passaria do mindinho.
- **Formas de acorde:** busca, para cada tônica no baixo, as formas que cabem na mão (até 4 dedos, contando a pestana) e soam todas as notas necessárias.

## Som

**Síntese da corda.** Não há arquivos de áudio: o app não tem dependências nem servidor, e samples de seis cordas em 23 casas seriam pesados. A corda é sintetizada por Karplus-Strong estendido (`GuitarAudio.renderString`): um período de ruído, filtrado como a palheta e com o pente do ponto de palhetada, circula numa linha de atraso e perde energia a cada volta. Um filtro passa-tudo dá o atraso fracionário que acerta a altura. Os testes medem a frequência gerada e exigem menos de 1 centésimo de semitom de erro. Cada nota é gerada uma vez (alguns milissegundos) e guardada.

**Timbres.** Cada timbre de `GuitarAudio.INSTRUMENTS` descreve a corda (`pluck`: sustentação, brilho, ponto da palheta) e a cadeia depois dela (`chain`: filtros do corpo, saturação do amplificador, eco). Para criar um timbre novo, basta acrescentar um item com essas duas partes.

**Vozes.** Cada nota é uma voz com o envelope próprio. Como numa guitarra, cada corda toca uma nota por vez: uma nota nova na mesma corda abafa a anterior, o que evita a sobreposição indesejada. Um limitador na saída impede que um acorde de seis cordas distorça. O metrônomo usa o mesmo `AudioContext`.

**Sincronia visual.** O áudio é agendado no relógio do `AudioContext`, um pouco à frente, como no metrônomo. O destaque de cada nota (`onStart` e `onEnd` da voz, `onStep` do reprodutor) é marcado com `setTimeout` para o mesmo instante, então o anel âmbar acende quando a nota soa. O `SequencePlayer` guarda o último passo que já soou, para a pausa retomar exatamente do passo seguinte.

## Testes

`node --test` roda os testes de `tests/`, sem dependências. Eles cobrem a teoria (grafia, reconhecimento de acordes, campos harmônicos de todas as tonalidades), o braço (frequências, afinações, shapes, formas de acorde) e a síntese (afinação medida e decaimento). O comportamento na página (som ao clicar, ordem da palhetada e do arpejo, destaque acompanhando a escala, pausa, afinação, celular) foi conferido no Chrome sem interface durante o desenvolvimento.
