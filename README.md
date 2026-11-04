# Guitar Helper

Braço de guitarra interativo para visualizar escalas e descobrir notas. Feito com HTML, CSS e JavaScript puros, sem dependências.

![Braço de guitarra mostrando todas as notas A, com a corda 5 solta selecionada manualmente](screenshot.png)

## Como usar

Abra o `index.html` no navegador. Não é preciso instalar nada nem rodar um servidor.

## Funcionalidades

- **Nota e escala:** escolha uma das 12 notas e uma escala. Há maior, menores (natural, harmônica e melódica), pentatônicas, blues e modos. Também é possível mostrar todas as notas, só a nota escolhida ou nenhuma.
- **Formas de exibição:** cifra (`C D E`), solfejo (`Dó Ré Mi`) ou graus (`1 b3 5`).
- **Seleção manual:** clique em qualquer casa para ver a nota sobre a corda. Um cartão abaixo do braço informa a posição, o grau na escala e o nome equivalente (A# = Bb). Clique de novo para desmarcar.
- **Teclado:** use as setas para navegar pelas casas e Enter para selecionar.

O braço tem cordas soltas e 22 casas, em afinação padrão, com a corda 1 (E aguda) no topo. Em telas pequenas, ele rola na horizontal.

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página |
| `style.css` | Estilos |
| `script.js` | Teoria musical, montagem do braço e interação |
| `screenshot.png` | Captura de tela usada neste README |
