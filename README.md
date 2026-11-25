# Guitar Helper

Braço de guitarra interativo para ver, ouvir e praticar escalas, shapes da pentatônica, acordes e campos harmônicos, com metrônomo, treino de trocas de acordes e da localização das notas no braço. Toda nota do braço toca com o som de uma corda de guitarra, na afinação escolhida. Feito com HTML, CSS e JavaScript puros, sem dependências (a fonte Archivo vem do Google Fonts; sem internet, o navegador usa a fonte do sistema).

![Aba Escalas com a pentatônica menor de A: o shape 1 destacado entre as casas 5 e 8, com a digitação em cada nota, o mapa dos cinco shapes abaixo do braço e os painéis de shapes e de ouvir a escala](screenshot.png)

## Como usar

Abra o `index.html` no navegador. Não é preciso instalar nada nem rodar um servidor.

## Funcionalidades

O app tem quatro abas no topo: **Escalas**, **Acordes**, **Campo harmônico** e **Treino**. A tela é dividida sempre do mesmo jeito:

- **Topo:** as abas, a forma de ler os nomes das notas e o tema.
- **Escolha:** a nota e a escala, o acorde ou a tonalidade. Durante o treino, dá lugar aos cartões Agora e Próximo.
- **Braço:** no centro, com o título do que está à mostra, a afinação e a legenda.
- **Abaixo do braço:** o que complementa a aba, como os shapes, o player da escala, as formas do acorde, o campo harmônico, a sequência do treino e as notas marcadas.
- **Rodapé:** o metrônomo e o painel de som, fixos e sempre ao alcance, em todas as abas.

As cores do braço têm sempre o mesmo significado: vermelho é a tônica, madrepérola é nota da escala ou do acorde, verde é a posição a tocar agora, azul é o que você marcou e âmbar é a nota que está soando. O estudo que levou a essa organização está em [`docs/estudo-ux-ui.md`](docs/estudo-ux-ui.md).

### Escalas

Escolha uma das 12 notas e uma escala: maior, menores (natural, harmônica e melódica), pentatônicas, blues e modos. Também é possível mostrar todas as notas, só a nota escolhida ou nenhuma. Os nomes das notas do título são botões: clique para ouvir cada uma.

#### Shapes da pentatônica

Na pentatônica maior ou menor, o painel **Shapes** mostra os cinco desenhos tradicionais da escala, com duas notas por corda:

- **Todos** mostra a escala no braço inteiro; **1** a **5** destacam um shape e deixam as outras notas da escala apagadas.
- As setas andam para o shape vizinho no braço, e **Região do braço** escolhe entre as duas ocorrências do shape (uma oitava acima) quando as duas cabem nas 22 casas.
- Uma faixa no braço marca onde o shape começa e termina, e o **mapa dos shapes**, abaixo dos números das casas, mostra onde cada um fica e como eles se sobrepõem. Clique numa faixa do mapa para escolher o shape.
- **Mostrar a digitação** põe o dedo sugerido em cada nota (1 = indicador, 4 = mindinho, 0 = corda solta).
- **Menor** e **Maior** trocam entre as pentatônicas, e o painel diz qual shape da escala relativa tem o mesmo desenho (o shape 1 de A menor é o shape 5 de C maior).

O shape N começa no grau N da escala na corda 6: o shape 1 começa na tônica. Os shapes são calculados a partir da escala e da afinação, não desenhados à mão.

#### Ouvir a escala

O painel **Ouvir a escala** toca a escala com cada nota destacada no braço enquanto soa:

- **Trecho:** 1 oitava ou 2 oitavas a partir da tônica, ou as 12 notas do shape escolhido.
- **Direção:** subindo, descendo ou sobe e desce.
- **Velocidade** em BPM (uma nota por tempo) e **Repetir**.
- **Tocar**, **Pausar** (e **Continuar**, do ponto em que parou) e **Parar**.

### Acordes

O braço mostra só as notas do acorde. São 20 tipos, entre tríades, suspensos, power chords, sétimas, sextas e nonas.

Abaixo do braço, **Formas** lista as variações tocáveis do acorde, com diagrama e cifra (`x-3-2-0-1-0`). Clique em uma para vê-la no braço, ou em "Todas as notas" para ver o acorde no braço inteiro. As variações são geradas automaticamente, sempre com a tônica no baixo.

Com uma forma escolhida, os botões acima das formas tocam o acorde:

- **Tocar acorde:** palheta todas as cordas da forma, da mais grave para a mais aguda, sem as cordas abafadas.
- **Tocar arpejo:** uma corda por vez, grave → agudo ou agudo → grave, com as notas soando juntas até o fim, como num arpejo de verdade. A **Velocidade** vai de 40 a 320 BPM.
- **Repetir** toca de novo até você clicar em **Parar**.

### Campo harmônico

Escolha a nota, a **Tonalidade** (maior, menor natural ou menor harmônica) e **Tríades** ou **Tétrades**. O app monta os sete acordes empilhando terças da própria escala e mostra, para cada grau, o numeral (`I`, `IIm`, `VII°`), a cifra, o nome por extenso, as notas, a fórmula (`1 b3 5`) e a função (tônica, subdominante ou dominante). Veja em **Cards** ou em **Tabela**.

Clique num grau para ver o acorde no braço, com as formas tocáveis e os botões de tocar acorde e arpejo. O painel do grau explica a relação dele com a tonalidade (por exemplo, "Relativo menor do I") e tem um botão para ouvir cada nota do acorde separadamente. O botão ▶ de cada grau toca o acorde direto.

A tonalidade é escrita com menos acidentes: C# maior aparece como Db maior, e o app avisa quando a grafia muda. Na menor harmônica, a sétima elevada aparece com o nome certo, inclusive dobrado (F## em G# menor).

### Treino

Escolha em **Treinar** o tipo de treino: troca de acordes ou notas no braço. A configuração fica no painel ao lado das formas, abaixo do braço. Os dois treinos funcionam do mesmo jeito:

- **Ordem:** sequencial ou aleatória. Na aleatória, o mesmo item nunca se repete em seguida.
- **Trocar a cada:** N loops ou N batidas.
- **Iniciar treino:** liga o metrônomo e mostra, logo acima do braço, dois cartões lado a lado: **Agora**, em verde, e **Próximo**, ligados por uma seta com uma barra que enche até a troca. Nos acordes, os dois cartões trazem o diagrama e a cifra.

As trocas seguem o metrônomo, inclusive o **Aumentar BPM**. Parar o metrônomo, ou atingir o BPM de **Parar em**, também encerra o treino.

#### Troca de acordes

1. Escolha a nota, o acorde e a forma, e clique em **Adicionar … à sequência**, no topo das formas. A sequência precisa de pelo menos 2 acordes.
2. Defina a ordem e a troca, e clique em **Iniciar treino**.

O braço mostra a forma a tocar, com o diagrama e a cifra do acorde atual.

#### Notas no braço

Treine a localização de uma nota em todo o braço:

1. Escolha a nota, por exemplo C. O braço mostra todas as posições dela, da corda solta à casa 22.
2. Defina a ordem e a troca, e clique em **Iniciar treino**.

Durante o treino, a posição a tocar agora fica destacada em verde no braço, e as demais posições da nota continuam visíveis. Os cartões mostram a casa e a corda (por exemplo, "Casa 3" e "Corda 5 (A)") da posição atual e da próxima, e a próxima posição também aparece no braço com um anel tracejado. Na ordem sequencial, as posições seguem da casa mais baixa para a mais alta e, na mesma casa, da corda mais grave para a mais aguda. Em telas pequenas, o braço rola sozinho até a posição destacada.

### Metrônomo

O metrônomo fica no rodapé. Escolha de 30 a 240 BPM e estude com clique em 4/4, com o primeiro tempo acentuado. O BPM pode ser alterado com o metrônomo tocando.

O botão **Aumentar BPM** abre as opções para o andamento subir sozinho e mostra a regra em uso (por exemplo, "+10 a cada 4 loops, até 120"). Cada loop é um compasso de 4 tempos.

| Opção | O que faz |
| --- | --- |
| Começar em | BPM de partida sempre que o metrônomo é iniciado |
| A cada | Quantos loops tocar antes de cada aumento |
| Somar | Quantos BPM aumentar de cada vez |
| Parar em | Opcional: toca o último ciclo nesse BPM e para, encerrando também o treino, se houver |

Por exemplo: começar em 80, somar 10 a cada 4 loops e parar em 120. Sem a opção **Parar em**, o aumento vai até 240 BPM e o metrônomo continua tocando.

### Som

Clique em qualquer casa do braço para ouvir a nota daquela corda e casa, na oitava certa. A nota soando ganha um anel âmbar no braço. O botão **Som**, no rodapé, ajusta:

- **Timbre:** guitarra limpa, violão de aço, guitarra com distorção ou limpa com eco.
- **Volume** e **Duração de cada nota** (de 0,3 a 4 segundos).
- **Ouvir a nota ao clicar no braço:** desligue para só marcar as notas, sem som.

Enquanto algo toca, o botão **Parar som** aparece no rodapé; a tecla Esc também para tudo. Como numa guitarra, cada corda toca uma nota por vez: uma nota nova na mesma corda abafa a anterior.

O som é sintetizado no navegador (Web Audio API) por um modelo físico de corda dedilhada, sem arquivos de áudio. A frequência de cada casa segue `f = f₀ × 2^(n/12)` a partir da corda solta, com Lá = 440 Hz, e a síntese fica a menos de 1 centésimo de semitom dela.

### Afinação

O seletor **Afinação**, no cabeçalho do braço, troca entre Padrão (E A D G B E), Drop D, Eb Standard, D Standard e Drop C. A afinação muda tudo junto: as notas do braço, o nome de cada corda (à esquerda do braço), as formas dos acordes, os shapes, as frequências e o som. A afinação e as opções de som ficam salvas no navegador.

### Exibição e seleção de notas

- **Nomes:** cifra (`C D E`), solfejo (`Dó Ré Mi`) ou graus (`1 b3 5`), no canto da barra superior.
- **Tema claro ou escuro:** o botão com a lua (ou o sol), no canto da barra superior, troca o tema. Sem escolha, o app segue o tema do sistema; depois de escolher, a escolha fica salva no navegador. No celular, o botão fica na linha das abas.
- **Notas marcadas:** clique em qualquer casa para marcar a nota, que ganha um anel azul. A lista abaixo do braço informa a posição, o grau, a nota com a oitava e a frequência (`F#4 · 369,99 Hz`) e o nome equivalente (A# = Bb), com um botão para ouvir de novo. Clique de novo na casa para desmarcar.
- **Teclado:** use as setas para navegar pelas casas e Enter para ouvir e marcar.

O braço tem cordas soltas e 22 casas, com a corda 1 (a mais aguda) no topo. Em telas pequenas, ele rola na horizontal.

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página e ordem dos scripts |
| `style.css` | Estilos e tokens de cor dos temas claro e escuro |
| `js/theory.js` | Motor de teoria musical: notas, intervalos, grafia, escalas, acordes e campo harmônico |
| `js/tunings.js` | Afinações, frequências e geometria do braço (onde cada nota fica) |
| `js/chords.js` | Formas tocáveis dos acordes na afinação atual |
| `js/shapes.js` | Shapes da pentatônica e digitação sugerida |
| `js/audio.js` | Síntese da corda, timbres, vozes por corda e reprodutor de sequências |
| `js/neck.js` | Montagem do braço na página (cordas, casas, faixa e mapa dos shapes) |
| `script.js` | App: estado, renderização, interação, metrônomo e treino |
| `tests/` | Testes da teoria, do braço, dos shapes, dos acordes e da síntese (`node --test`) |
| `screenshot.png` | Captura de tela usada neste README |
| `docs/estudo-ux-ui.md` | Estudo de UX e UI: diagnóstico, proposta e capturas de antes e depois |
| `docs/arquitetura.md` | Como os módulos se encaixam e as decisões de teoria e de som |

Os módulos são scripts comuns, carregados em ordem pelo `index.html`, para o app continuar abrindo direto do arquivo, sem servidor.

## Testes

Com o Node.js 18 ou mais novo, na pasta do projeto:

```
node --test
```

Os testes conferem a grafia das notas, os campos harmônicos de todas as tonalidades, as frequências de todas as casas em todas as afinações, os cinco shapes da pentatônica, as formas dos acordes e a afinação da corda sintetizada.

## Temas claro e escuro

Toda cor da interface é um token em `style.css`: o tema claro fica no `:root` e o escuro em `:root[data-theme="dark"]`, logo abaixo. O resto do CSS usa só `var(--token)`, nunca uma cor fixa. Ao criar uma feature que precise de uma cor nova, crie o token nos dois blocos e confira a tela nos dois temas. O braço é madeira escura nos dois temas, então as cores das notas sobre ele (`--on-pearl`, `--on-go`, `--on-tonic`, `--selected`) não mudam.
