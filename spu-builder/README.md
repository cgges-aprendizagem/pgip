# SPU Builder

Builder visual para montar objetos de aprendizagem com o SPU ENAP Design System.

O projeto é uma aplicação React/Vite estática. O kit compilado do Design System fica em `public/ds` e é carregado pelo app em tempo de execução.

## Rodar localmente

```bash
npm install
npm run dev
```

O Vite abrirá o builder em `http://localhost:5173`.

## Verificar build

```bash
npm run build
npm run lint
```

## Publicar na nuvem

O repositório já inclui um workflow em `.github/workflows/pages.yml`.

Depois de subir para o GitHub:

1. Abra `Settings > Pages`.
2. Em `Build and deployment`, escolha `GitHub Actions`.
3. Faça push na branch `main`.

O GitHub Actions vai gerar o build e publicar a pasta `dist` no GitHub Pages.

## Design System

Arquivos necessários em produção:

- `public/ds/_ds_bundle.js`
- `public/ds/image-slot.js`
- `public/ds/styles.css`
- `public/ds/tokens/**`

A pasta `public/ds/uploads` é ignorada no Git porque contém artefatos temporários e rascunhos do DS.

Quando houver mudanças no DS base, copie o kit recompilado para `public/ds` e registre patches relevantes em `docs/DS-PATCH-*.md`.

## Exportações

O builder exporta:

- HTML autocontido
- pacote HTML + assets
- SCORM 1.2
- prévia PDF/A4 para impressão

Projetos podem ser reabertos por `.spu.json` ou por HTML exportado que contenha os dados do builder.


Ao salvar um projeto, o `.spu.json` inclui as imagens utilizadas no documento
em `imageSlots` (data URLs), com seus ajustes de enquadramento. O mesmo vale para
`projetom121.spu.json` (para o material M121) incluído nos pacotes HTML e SCORM: extraia esse arquivo do ZIP
e use **Abrir** para retomar a edição com as imagens, sem precisar da pasta assets.
O JSON preserva as imagens originais mesmo quando a publicação usa qualidade compacta.
Projetos antigos sem `imageSlots` continuam compatíveis; imagens ausentes nesses
arquivos precisam ser recuperadas da publicação original. O HTML autocontido
continua podendo ser reaberto diretamente.

O nome do JSON usa o código encontrado no título do documento: `M121 - Bens imóveis públicos`
gera `projetom121.spu.json`, tanto no botão **Salvar** quanto nos pacotes HTML e SCORM.
Códigos com sufixo, como M134a, também são aceitos. Sem código no título, o nome é `projeto.spu.json`.

## Cópia hospedada no PGIP

Esta pasta foi copiada de `luislindner/spu-builder`, commit
`146db0624c56258211dfbe9deca6b5fc00e38d14` (inclui o PR #18).
O workflow de publicação do PGIP compila o editor e publica seu resultado em
`https://cgges-aprendizagem.github.io/pgip/spu-builder/`.
O PGIP é mantido de forma independente; o espelhamento de materiais foi desativado.
Atualizações futuras do editor devem ser trazidas do repositório de origem.
