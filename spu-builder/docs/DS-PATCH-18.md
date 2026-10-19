# DS Patch 18 — campos de texto vazios não ocupam espaço

## Problema

Campos rich-text visualmente vazios podem chegar ao Design System como `""`,
espaços, `&nbsp;`, caracteres de largura zero ou HTML como `<p><br></p>`.
Embora não exibam texto, alguns componentes ainda criavam o elemento visual e
mantinham margens ou linhas de grid na prévia e na exportação.

O caso mais evidente era `FeatureGrid` com `layout="side"`: o título era sempre
renderizado e reservava a primeira linha, deslocando o texto de forma diferente
conforme a altura de cada cartão.

## Correção aplicada no kit compilado

- `renderRich` agora trata HTML semanticamente vazio como ausência de conteúdo.
- `BlockView` não renderiza blocos `titulo` e `prose` vazios fora do modo de edição.
- `FeatureGrid` só cria `.spu-feature__title` quando o título possui conteúdo visível.
- `ContentSlider` não exporta o fallback “Título do slide” quando o campo foi deixado vazio.
- O compat do builder e o compat embutido nas exportações usam a mesma normalização.

## Ao recompilar o Design System fonte

Replicar `hasRichContent` em `RichText.jsx`, usar a condição em
`FeatureGrid.jsx` e `ContentSlider.jsx`, e manter as guardas de `BlockView.jsx`.
Depois, substituir `public/ds/_ds_bundle.js` sem perder estas alterações.

