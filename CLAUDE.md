# Guitar Helper

App estático em HTML, CSS e JavaScript puros (`index.html`, `style.css`, `script.js`), sem build nem dependências. Textos da interface, comentários e commits em português do Brasil.

## Temas claro e escuro (vale para toda feature nova)

- Toda cor da interface é um token em `style.css`: o tema claro fica no `:root` e o escuro em `:root[data-theme="dark"]`. Fora desses dois blocos, use só `var(--token)`. Nada de hex, `rgb()` ou `#fff` soltos, nem cor fixa em SVG inline ou em estilos montados pelo `script.js`.
- Uma cor nova vira um token novo, definido nos dois blocos. Antes de criar um, veja se algum token que já existe tem o mesmo papel (`--surface`, `--ink`, `--muted`, `--line`, `--fill`, `--on-ink`…).
- Texto sobre um fundo de cor usa o token `--on-*` daquele fundo (`--on-ink`, `--on-go`, `--on-tonic`, `--on-pearl`, `--on-selected`), não `--ink`, que vira cor clara no tema escuro.
- O braço é madeira escura nos dois temas: o que fica sobre ele usa os tokens `--neck-*` e as cores das notas.
- O tema inicial é aplicado pelo script inline no `<head>` do `index.html` (escolha salva em `localStorage['theme']` ou, sem escolha, `prefers-color-scheme`). A troca pelo botão e o acompanhamento do sistema ficam no `script.js`.
- Antes de concluir uma mudança visual, confira a tela nos dois temas, no desktop e em 360px de largura.
