# Guitar Helper

App estático em HTML, CSS e JavaScript puros, sem build nem dependências, que abre direto do `index.html` (sem servidor). Textos da interface, comentários e commits em português do Brasil.

## Estrutura (vale para toda feature nova)

- Lógica reutilizável fica num módulo de `js/` (teoria, afinações, acordes, shapes, áudio, braço); o `script.js` cuida de estado, renderização e eventos. Detalhes em `docs/arquitetura.md`.
- Os módulos são scripts comuns: nada de `import`/`export` nem `type="module"`, que não funcionam em `file://`. Cada módulo expõe um único nome global (`const Theory = (() => { … })();`), termina com `if (typeof module === 'object' && module.exports) module.exports = …;` para os testes, e entra no `index.html` antes de quem o usa.
- Módulos de `js/` não leem o estado do app nem o DOM (exceto `neck.js` e a parte de áudio): recebem tudo por parâmetro.
- Teoria musical é sempre calculada a partir de fórmulas (graus, semitons), nunca cadastrada por tonalidade.
- Altura e afinação vêm só de `Tunings` e de `STRINGS` no `script.js`: o que aparece no braço e o que o som toca saem da mesma referência.
- Som novo passa pelo `GuitarAudio` (um `AudioContext` só para o app inteiro). Timbre novo é um item em `GuitarAudio.INSTRUMENTS`.
- Rode `node --test` depois de mexer em `js/` e acrescente testes em `tests/` para cálculo novo.

## Temas claro e escuro (vale para toda feature nova)

- Toda cor da interface é um token em `style.css`: o tema claro fica no `:root` e o escuro em `:root[data-theme="dark"]`. Fora desses dois blocos, use só `var(--token)`. Nada de hex, `rgb()` ou `#fff` soltos, nem cor fixa em SVG inline ou em estilos montados pelo JavaScript.
- Uma cor nova vira um token novo, definido nos dois blocos. Antes de criar um, veja se algum token que já existe tem o mesmo papel (`--surface`, `--ink`, `--muted`, `--line`, `--fill`, `--on-ink`…).
- Texto sobre um fundo de cor usa o token `--on-*` daquele fundo (`--on-ink`, `--on-go`, `--on-tonic`, `--on-pearl`, `--on-selected`, `--on-sound`), não `--ink`, que vira cor clara no tema escuro.
- O braço é madeira escura nos dois temas: o que fica sobre ele usa os tokens `--neck-*`, `--shape-*` e as cores das notas.
- O tema inicial é aplicado pelo script inline no `<head>` do `index.html` (escolha salva em `localStorage['theme']` ou, sem escolha, `prefers-color-scheme`). A troca pelo botão e o acompanhamento do sistema ficam no `script.js`.
- Antes de concluir uma mudança visual, confira a tela nos dois temas, no desktop (inclusive 1280px, em que o braço inteiro deve caber sem rolar) e em 360px de largura.
