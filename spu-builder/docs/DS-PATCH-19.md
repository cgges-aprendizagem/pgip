# DS Patch 19 — containers em accordion e seção expansível

## Accordion e timeline

- Os arrays internos `blocks` passam a ser tratados como containers reais pelo store.
- Blocos podem ser inseridos, arrastados, reordenados, removidos e duplicados dentro da aba aberta.
- Containers aninhados, inclusive `columns`, usam a renderização recursiva completa do canvas.
- Itens de listas no Inspector recebem a ação **Duplicar item**, com renovação dos ids de blocos e slots de imagem.
- A detecção de colisão prioriza a área sob o ponteiro para distinguir corretamente containers aninhados.

## Seção expansível

- Novo bloco estrutural **Seção expansível**.
- Título e texto de apresentação permanecem visíveis.
- A chamada configurável abre e fecha todo o conteúdo interno.
- O corpo aceita os mesmos blocos de conteúdo de uma seção comum.
- No editor e na saída para impressão, o corpo permanece aberto; na visualização e no HTML exportado, inicia fechado por padrão.
- A opção **Iniciar aberta** permite alterar o estado inicial.

## Compatibilidade

- O registro e os estilos do novo bloco são instalados no builder e também incorporados aos formatos HTML/ZIP/SCORM exportados.
- A preparação para PDF trata a seção expansível como seção de conteúdo para quebras de página.
