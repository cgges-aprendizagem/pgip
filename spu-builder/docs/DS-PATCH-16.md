# DS-PATCH-16 — Imagens originais e opções do Slider de conteúdo

Aplicar estas mudanças no DS-fonte antes da próxima recompilação, para que a sincronização do kit não sobrescreva o comportamento já incorporado ao builder.

## `assets/image-slot.js`

- Não redimensionar nem converter a imagem no upload.
- Persistir os bytes originais como data URL (`FileReader.readAsDataURL`).
- Preservar `u` e os demais dados atuais ao salvar somente o enquadramento (`s`, `x`, `y`).

A versão compacta passa a ser responsabilidade da exportação do builder. Assim, a tela de edição e a exportação em alta qualidade sempre partem do arquivo original.

## `components/interactive/ContentSlider.jsx`

Adicionar ao registro:

- item `labelIcon`, tipo `icon`, opcional;
- item `tabLabel`, tipo `rich`, inline;
- prop `showTabNumbers`, tipo `bool`, padrão `true`.

Na renderização:

- quando `labelIcon` existir, mostrar `Icon` no lugar da etiqueta textual;
- quando não houver ícone, manter a etiqueta textual atual;
- usar `tabLabel || title || "Slide N"` como texto da aba inferior;
- renderizar o número da aba somente quando `showTabNumbers` for verdadeiro.

As mudanças são retrocompatíveis: documentos antigos continuam usando etiqueta textual, título como fallback da aba e numeração visível.
