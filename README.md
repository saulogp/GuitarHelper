# Guitar Helper

Braço de guitarra interativo para visualizar escalas e acordes, descobrir notas e treinar trocas de acordes com metrônomo. Feito com HTML, CSS e JavaScript puros, sem dependências.

![Aba Acordes mostrando a forma aberta de Am no braço da guitarra, com o metrônomo acima e as variações do acorde abaixo](screenshot.png)

## Como usar

Abra o `index.html` no navegador. Não é preciso instalar nada nem rodar um servidor.

## Funcionalidades

O app tem três abas, escolhidas em **Visualizar**. O metrônomo e a seleção manual de notas estão disponíveis em todas.

### Escalas

Escolha uma das 12 notas e uma escala: maior, menores (natural, harmônica e melódica), pentatônicas, blues e modos. Também é possível mostrar todas as notas, só a nota escolhida ou nenhuma.

### Acordes

O braço mostra só as notas do acorde. São 18 tipos, entre tríades, suspensos, power chords, sétimas, sextas e nonas.

Cada acorde lista variações tocáveis, com diagrama e cifra (`x-3-2-0-1-0`). Clique em uma para vê-la no braço, ou em "Todas as notas" para ver o acorde no braço inteiro. As variações são geradas automaticamente, sempre com a tônica no baixo.

### Treino

Treine trocas de acordes em uma sequência montada por você:

1. Escolha a nota, o acorde e a variação, e clique em **Adicionar**. A sequência precisa de pelo menos 2 acordes.
2. Defina a ordem: sequencial ou aleatória.
3. Defina a troca: a cada N loops ou a cada N batidas.
4. Clique em **Iniciar treino**.

O acorde atual e o próximo aparecem na tela, e o braço mostra a forma a tocar. As trocas seguem o metrônomo, que liga ao iniciar o treino. Parar o metrônomo também encerra o treino.

### Metrônomo

Escolha de 30 a 240 BPM e estude com clique em 4/4, com o primeiro tempo acentuado. O BPM pode ser alterado com o metrônomo tocando.

Com **Aumentar BPM**, o andamento sobe sozinho. Cada loop é um compasso de 4 tempos.

| Opção | O que faz |
| --- | --- |
| Iniciar em | BPM de partida sempre que o metrônomo é iniciado |
| A cada | Quantos loops tocar antes de cada aumento |
| Somar | Quantos BPM aumentar de cada vez |
| Parar em | Opcional: toca o último ciclo nesse BPM e para, encerrando também o treino, se houver |

Por exemplo: iniciar em 80, somar 10 a cada 4 loops e parar em 120. Sem a opção **Parar em**, o aumento vai até 240 BPM e o metrônomo continua tocando.

### Exibição e seleção de notas

- **Formas de exibição:** cifra (`C D E`), solfejo (`Dó Ré Mi`) ou graus (`1 b3 5`).
- **Seleção manual:** clique em qualquer casa para ver a nota sobre a corda. Um cartão abaixo do braço informa a posição, o grau e o nome equivalente (A# = Bb). Clique de novo para desmarcar.
- **Teclado:** use as setas para navegar pelas casas e Enter para selecionar.

O braço tem cordas soltas e 22 casas, em afinação padrão, com a corda 1 (E aguda) no topo. Em telas pequenas, ele rola na horizontal.

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página |
| `style.css` | Estilos |
| `script.js` | Teoria musical, geração das variações, montagem do braço, metrônomo e treino |
| `screenshot.png` | Captura de tela usada neste README |
