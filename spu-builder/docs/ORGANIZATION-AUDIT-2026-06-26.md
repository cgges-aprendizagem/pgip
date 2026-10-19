# Auditoria de organização — 2026-06-26

Objetivo: revisar redundâncias, sujeiras e incoerências sem alterar funcionalidade ou características do app.

## Feito

- Removidos arquivos órfãos do template inicial Vite/React:
  - `src/App.css`
  - `src/assets/react.svg`
  - `src/assets/vite.svg`
- Removido `src/utils/exportKit.ts`, utilitário antigo de export standalone que não era importado por nenhum módulo e foi substituído pelo fluxo atual em `src/utils/exportFormats.ts`.
- Ajustado `src/components/Inspector/ListEditor.tsx` para deixar helpers internos (`defaultForType`, `blankItem`) sem export desnecessário.
- Ajustado `src/components/Canvas/Canvas.tsx` para remover a prop/parâmetro morto `parentId` em `BlockNode`.
- Ajustado `src/components/Canvas/Canvas.tsx` para retirar `children` dos props passados a componentes do DS sem usar `children: undefined`, eliminando ruído de lint sem mudar a árvore renderizada.
- Ajustado `src/utils/exportFormats.ts` para remover escape desnecessário na expressão regular de nomes seguros.
- Atualizado `docs/STATUS.md` para apontar a exportação atual para `src/utils/exportFormats.ts` e remover referências antigas a `SectionBlock.tsx`/exportação única.

## Verificações

- `npm run lint`
- `npm run build`

## Pendente / não mexido

- Os arquivos `docs/DS-PATCH-*.md` continuam como histórico operacional do Design System. Há redundância natural entre eles e `docs/STATUS.md`, mas consolidar isso pode apagar contexto de decisões anteriores.
- O repositório já tinha alterações não commitadas antes desta auditoria, incluindo mudanças em código, bundle do DS e documentos novos. Esta limpeza não tentou reverter nem normalizar esse trabalho existente.
- `docs/gemini-slide-style-skill.md` já aparecia como removido antes desta auditoria; não foi restaurado nem revisado.
- Validação visual manual no navegador não foi necessária para esta rodada, pois as mudanças foram remoção de arquivos não usados e ajustes sem efeito esperado de UI.
