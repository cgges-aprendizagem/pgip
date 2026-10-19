# DS Patch 20 — Flashcard informativo com cor individual

## Nova estrutura

O bloco `flashcard` passa a apresentar:

- ícone, título e descrição curta na frente;
- texto rico formatável no verso;
- cor configurável por flashcard.

## Compatibilidade

Os campos históricos `term` e `definition` são preservados como título e texto
do verso. O campo histórico opcional `hint` continua sendo aceito como descrição
quando o novo campo `description` não estiver preenchido.

## Interação e saída

- clique, Enter e Espaço viram o card;
- links e campos editáveis não disparam a virada acidentalmente;
- o verso possui rolagem quando o conteúdo excede a altura do card;
- na impressão, frente e verso são exibidos em sequência e sem corte;
- a cor é aplicada ao contorno, ícone, superfície frontal e fundo do verso.
