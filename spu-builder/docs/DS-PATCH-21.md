# DS Patch 21 — Composição de cards, flashcards com capa e espaçamento

## Card de exemplo

- passa de bloco textual para container e aceita blocos internos;
- preserva o conteúdo textual legado no novo campo `body`;
- usa entrelinha `1.12` no heading e mantém a mesma leitura no editor e na saída.

## Flashcard

- permite editar as instruções da frente e do verso;
- permite ocultar o ícone ilustrativo;
- oferece capa com imagem via `image-slot`, com título e descrição opcionais;
- preserva os padrões anteriores em projetos já existentes.

## Ritmo vertical

Seção expansível e slides de seção passam a aplicar a mesma aproximação de
eyebrow e subtítulos H3–H6 já usada pela seção comum, tanto no canvas quanto na
prévia e na exportação.

## Imagem com legenda

Novas imagens são criadas com a legenda vazia. O editor continua mostrando o
placeholder “Legenda”, sem persistir texto fixo no conteúdo final.
