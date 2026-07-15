# PROMPTS DE GERAÇÃO DAS IMAGENS
## Infográfico "Breve histórico da propriedade no Brasil"

Este documento contém o comando de geração de cada uma das **7 imagens** do infográfico, no estilo **colagem arquitetônica editorial e urbanística** (skill do projeto), adaptado à paleta do design system **"Território Cívico"** do spu-builder.

---

## 1. Instruções globais (valem para todas as imagens)

Cole este bloco no início de cada pedido, antes do prompt específico:

> Criar uma colagem arquitetônica editorial e urbanística de alta resolução (4K ou superior), no estilo de pranchas conceituais de arquitetura e urbanismo.
>
> **Linguagem visual:** fotografia predominantemente em preto e branco / cinza neutro, com aparência documental, integrada a croquis arquitetônicos, linhas de construção, perspectivas, grids, cotas abstratas, marcações pontilhadas, curvas topográficas, eixos, círculos técnicos e fragmentos de desenho urbano. Os traços devem atravessar e conectar as fotografias, não apenas decorar o fundo. A imagem final deve parecer uma fusão entre fotografia documental, prancha de arquitetura, sketch urbanístico e colagem editorial contemporânea.
>
> **Formas geométricas coloridas:** combinação variada de círculos, semicírculos, arcos, retângulos, faixas verticais e horizontais, linhas espessas, pontos e planos translúcidos, com opacidade entre 20% e 75%. Formas grandes mais transparentes; pontos focais mais saturados. As formas devem se sobrepor parcialmente às fotos e croquis, conectando os núcleos visuais e criando hierarquia. Nunca repetir uma única forma.
>
> **Paleta do projeto (usar somente estas cores de destaque, 1 a 3 por imagem):**
> - Petróleo: `#2E7A75` (e tom profundo `#16433F`)
> - Terracota: `#D9633F` (e tom forte `#C4502E`)
> - Ocre/ouro: `#D6A23C` (e tom forte `#C8922A`)
> - Verde: `#2F7D52` (apenas quando indicado)
> - Fundo areia/off-white quente: `#F4ECDD` a `#FBF7EF`, com textura mínima de papel
> - Croquis e fotografia permanecem em preto, branco, cinza e grafite `#1C2420`
>
> **Composição:** assimétrica, equilibrada, arejada e editorial, com espaço negativo (especialmente nas bordas) e um foco visual claro. Sem molduras rígidas, sem simetria excessiva, sem aparência de mosaico ou banco de imagens.
>
> **PROIBIDO:** texto, letras, números, títulos, legendas, placas escritas ou pseudotexto de qualquer tipo; cores neon; estilo cartoon; render 3D genérico; sombras realistas pesadas; halos nos recortes; deformações de pessoas ou edifícios.
>
> **Época e território:** Brasil. Respeitar o período histórico indicado em cada imagem (arquitetura, vestuário, embarcações, tecnologia coerentes com a época).

---

## 2. As 7 imagens

### IMAGEM 01 — `hero-linha-do-tempo.png`
- **Onde entra:** fundo do hero (topo da página). Marcada no HTML como `IMAGEM 01`.
- **Formato:** panorâmica horizontal **21:9** (ex.: 4032×1728 px). A parte esquerda ficará parcialmente coberta pelo bloco de título (scrim escuro) — concentrar os elementos mais ricos no **centro e à direita**.
- **Modo de composição:** `territorial_collage` + `historical_timeline`.
- **Cores de destaque:** petróleo dominante, terracota e ocre secundários.

**Prompt específico:**

> Tema central: cinco séculos de formação da terra pública brasileira, lidos como uma única paisagem contínua da esquerda para a direita.
>
> Elemento principal: uma grande linha de costa brasileira desenhada como croqui cartográfico, atravessando toda a composição e conectando as épocas.
>
> Elementos secundários, sugeridos em sequência sutil (sem divisões rígidas): fragmento de mapa colonial com caravela ao longe e faixas de terra demarcadas a traço; paisagem rural do século XIX com fazenda e cercas em fotografia P&B; documento cartorial antigo apenas insinuado por linhas horizontais de croqui (sem texto legível); e, à direita, cidade litorânea brasileira contemporânea em fotografia documental P&B, com orla, edifícios públicos e vegetação.
>
> Narrativa: o território é o mesmo; mudam as formas de apropriação. Linhas topográficas, eixos e marcações pontilhadas costuram as épocas. Círculos técnicos translúcidos em petróleo destacam pontos da costa; uma faixa horizontal ocre translúcida acompanha a linha do litoral; semicírculos terracota marcam as transições de época.
>
> Fundo: areia/off-white `#F4ECDD` com textura mínima de papel. Panorâmica 21:9, máxima resolução.

---

### IMAGEM 02 — `p1-regime-sesmarial.png`
- **Onde entra:** figura do período 1 (Regime Sesmarial, 1500–1822), dentro da linha do tempo. Marcada como `IMAGEM 02`.
- **Formato:** **16:10** (ex.: 3200×2000 px).
- **Modo de composição:** `territorial_collage`.
- **Cores de destaque:** terracota dominante (`#D9633F` / `#C4502E`), ocre discreto.

**Prompt específico:**

> Tema central: o regime de sesmarias — toda a terra pertence à Coroa Portuguesa e é concedida em grandes faixas condicionadas ao cultivo.
>
> Elemento principal: um trecho de litoral colonial brasileiro visto em meia altura, em fotografia/gravura P&B de aparência documental, sobre o qual se sobrepõe um croqui cartográfico de grandes faixas de terra paralelas e perpendiculares à costa (o desenho das concessões), com linhas de demarcação, hachuras e marcações pontilhadas.
>
> Elementos secundários: engenho de açúcar ou casa-grande colonial em croqui de fachada; caravela pequena ao largo em traço fino; vegetação de mata atlântica em fotografia P&B recortada; mãos ou figuras de trabalhadores escravizados e colonos apenas em silhueta de croqui, com dignidade e sem caricatura.
>
> Narrativa: concessões enormes, limites vagos, controle estatal quase nulo. As faixas de terra do croqui devem parecer grandes demais e mal fechadas, algumas se sobrepondo. Planos retangulares terracota translúcidos (20–50% de opacidade) destacam duas ou três faixas concedidas; um círculo técnico terracota mais saturado marca o ponto do engenho; pequenos pontos ocres pontuam a linha da costa.
>
> Fundo: areia/off-white `#F4ECDD`. Formato 16:10, máxima resolução.

---

### IMAGEM 03 — `p2-regime-de-posse.png`
- **Onde entra:** figura do período 2 (Regime de Posse, 1822–1850). Marcada como `IMAGEM 03`.
- **Formato:** **16:10** (ex.: 3200×2000 px).
- **Modo de composição:** `territorial_collage` + leve `technical_blueprint`.
- **Cores de destaque:** ocre/ouro dominante (`#D6A23C` / `#C8922A`), terracota discreta.

**Prompt específico:**

> Tema central: o regime de posse — trinta anos sem regra geral, em que o acesso à terra acontece pelo apossamento: ocupar e usar, sem título.
>
> Elemento principal: paisagem rural brasileira do início do século XIX em fotografia/gravura P&B (campo aberto, roças, cercas de madeira toscas, pequenas casas de pau a pique), sobre a qual se desenham, em croqui, polígonos irregulares de posses que se sobrepõem uns aos outros — limites tortos, linhas tracejadas que se cruzam e áreas de conflito onde dois polígonos disputam o mesmo trecho.
>
> Elementos secundários: figura de posseiro a cavalo ou família de lavradores livres em silhueta de croqui; cerca em primeiro plano fotográfico; trilhas e caminhos em linha pontilhada conectando as posses.
>
> Narrativa: a ocupação avança mais rápido que o direito. Nas áreas de sobreposição dos polígonos, usar planos ocres translúcidos que se misturam (a mistura visual das transparências representa o conflito); um arco ocre mais saturado destaca a área central de disputa; pequenos marcadores terracota indicam pontos de ocupação espalhados.
>
> Fundo: areia/off-white `#F4ECDD`. Formato 16:10, máxima resolução.

---

### IMAGEM 04 — `p3-lei-de-terras.png`
- **Onde entra:** figura do período 3 (Lei de Terras, 1850–1889). Marcada como `IMAGEM 04`.
- **Formato:** **16:10** (ex.: 3200×2000 px).
- **Modo de composição:** `urban_storytelling` + `technical_blueprint`.
- **Cores de destaque:** petróleo dominante (`#2E7A75` / `#16433F`), ocre secundário.

**Prompt específico:**

> Tema central: a Lei de Terras de 1850 — a terra vira mercadoria; o acesso formal passa a ser somente pela compra; nascem as terras devolutas.
>
> Elemento principal: um grande documento cartorial do século XIX representado por croqui (folha com linhas horizontais sugerindo texto — sem nenhuma letra legível —, selo circular desenhado a traço e assinatura insinuada por um risco), ocupando um terço da composição, conectado por linhas técnicas a uma planta esquemática de gleba com medidas e cotas abstratas.
>
> Elementos secundários: fazenda de café do século XIX em fotografia P&B (terreiro, casa sede, fileiras de café); em contraponto, à margem da composição, famílias livres pobres e trabalhadores negros em fotografia ou silhueta de croqui digna, posicionadas do lado de fora das linhas que demarcam a propriedade — a exclusão comunicada pela composição, não por caricatura; uma balança ou fiel de balança em traço fino, sugerindo a terra como ativo.
>
> Narrativa: quem já tem terra a regulariza; quem não tem dinheiro fica de fora. Uma linha de demarcação forte separa visualmente o mundo titulado do mundo excluído. Planos retangulares petróleo translúcidos cobrem a área titulada; um círculo petróleo saturado destaca o selo do documento; pequenos pontos ocres marcam as figuras excluídas fora da linha.
>
> Fundo: areia/off-white `#F4ECDD`. Formato 16:10, máxima resolução.

---

### IMAGEM 05 — `p4-periodo-republicano.png`
- **Onde entra:** figura do período 4 (Período Republicano, 1889–hoje). Marcada como `IMAGEM 05`.
- **Formato:** **16:10** (ex.: 3200×2000 px).
- **Modo de composição:** `territorial_collage` + `mobility_flow_map`.
- **Cores de destaque:** verde (`#2F7D52`) dominante, petróleo secundário.

**Prompt específico:**

> Tema central: o período republicano — a terra pública se reparte entre União, estados e municípios; consolidam-se o registro e o patrimônio público moderno; a Constituição de 1988 acrescenta a função socioambiental.
>
> Elemento principal: um fragmento de mapa do território brasileiro em croqui cartográfico, dividido por linhas técnicas em porções distintas (sem nomes, sem texto), com a faixa litorânea destacada por uma linha contínua mais forte acompanhando toda a costa — o domínio da União sobre os terrenos de marinha.
>
> Elementos secundários: edifício público brasileiro de linguagem moderna (tipo palácio ou repartição modernista) em fotografia P&B; cartório/arquivo sugerido por croqui de estantes e fichários; área verde urbana com pessoas diversas usando o espaço público em fotografia documental P&B; manguezal ou restinga em recorte fotográfico junto à linha da costa.
>
> Narrativa: a moldura se organiza — federação, registro, destinação — e a finalidade socioambiental entra em cena. Planos verdes translúcidos destacam as áreas de conservação e uso público; círculos técnicos petróleo marcam pontos da costa sob domínio federal; linhas de fluxo pontilhadas conectam o edifício público, o mapa e as pessoas.
>
> Fundo: areia/off-white `#F4ECDD`. Formato 16:10, máxima resolução.

---

### IMAGEM 06 — `herancas-gestao-patrimonial.png`
- **Onde entra:** figura ampla da seção escura "O que a gestão patrimonial herdou dessa história". Marcada como `IMAGEM 06`.
- **Formato:** **16:9** (ex.: 3840×2160 px).
- **Modo de composição:** `urban_storytelling` + `technical_blueprint`.
- **Cores de destaque:** as três cores em equilíbrio — terracota, ocre e petróleo (a imagem resume todas as heranças).
- **Atenção:** esta imagem será exibida sobre seção de fundo escuro, mas dentro de moldura clara — manter o fundo areia normal.

**Prompt específico:**

> Tema central: as heranças fundiárias no presente — o passado dentro de cada processo de gestão do patrimônio imobiliário público.
>
> Elemento principal: uma orla urbana brasileira contemporânea em fotografia documental P&B (praia ou baía com ocupação densa junto à água), atravessada por uma linha de demarcação técnica paralela à costa, com cotas abstratas e marcações pontilhadas — a faixa dos terrenos de marinha sendo medida.
>
> Elementos secundários: servidor ou técnica em campo com equipamento de topografia/GPS em fotografia P&B; ocupações informais consolidadas em encosta ou beira d'água, retratadas com respeito documental; sobreposição de dois desenhos de planta que não coincidem (a cadeia dominial incompleta), em croqui; fragmento de imagem aérea/satélite em P&B com grid de georreferenciamento.
>
> Narrativa: medir, registrar, regularizar e destinar — o trabalho de hoje resolvendo os nós de ontem. Uma faixa horizontal terracota translúcida acompanha a linha de demarcação da orla; planos ocres translúcidos cobrem as áreas de ocupação; círculos petróleo saturados marcam os pontos de medição do equipamento topográfico; linhas técnicas conectam a planta, a foto aérea e a orla.
>
> Fundo: areia/off-white `#F4ECDD`. Formato 16:9, máxima resolução.

---

### IMAGEM 07 — `conclusao-territorio.png`
- **Onde entra:** fundo do bloco de conclusão full-bleed (antes das referências). Marcada como `IMAGEM 07`.
- **Formato:** panorâmica horizontal **21:9** (ex.: 4032×1728 px).
- **Modo de composição:** `photographic_editorial` (croquis mais discretos).
- **Cores de destaque:** petróleo e ocre, discretos.
- **Atenção:** esta imagem recebe um **overlay escuro** de petróleo (74–90% de opacidade) por cima, com título em branco. Portanto: composição de leitura ampla, alto contraste, sem detalhes pequenos essenciais; evitar elementos importantes no terço inferior (mais escurecido). Os acentos coloridos podem ser um pouco mais saturados que o normal, pois serão atenuados pelo overlay.

**Prompt específico:**

> Tema central: o território brasileiro como herança e responsabilidade — visão ampla e contemplativa para fechar a narrativa.
>
> Elemento principal: vista aérea ou elevada de um litoral brasileiro em fotografia documental P&B de alto contraste, onde convivem cidade, orla, vegetação e água — o território em uma única imagem.
>
> Elementos secundários: linhas topográficas e um leve grid cartográfico atravessando a fotografia em traço fino claro; dois ou três círculos técnicos e arcos em petróleo `#2E7A75` e ocre `#D6A23C`, translúcidos, marcando pontos do território; uma linha contínua acompanhando a costa.
>
> Narrativa: contemplação e síntese — o mesmo território das imagens anteriores, agora visto de longe, com os instrumentos de leitura (linhas, círculos, cotas) discretamente presentes. Croquis minimalistas; predominância fotográfica.
>
> Fundo: a própria fotografia ocupa todo o quadro (sem fundo areia nesta imagem — é um fundo full-bleed). Panorâmica 21:9, máxima resolução.

---

## 3. Tabela-resumo (para organizar os arquivos)

| # | Arquivo (colocar em `images/`) | Onde entra | Proporção | Cor dominante |
|---|---|---|---|---|
| 01 | `hero-linha-do-tempo.png` | Fundo do hero | 21:9 | Petróleo |
| 02 | `p1-regime-sesmarial.png` | Era 1 · Regime Sesmarial | 16:10 | Terracota |
| 03 | `p2-regime-de-posse.png` | Era 2 · Regime de Posse | 16:10 | Ocre |
| 04 | `p3-lei-de-terras.png` | Era 3 · Lei de Terras | 16:10 | Petróleo |
| 05 | `p4-periodo-republicano.png` | Era 4 · República | 16:10 | Verde |
| 06 | `herancas-gestao-patrimonial.png` | Seção Heranças | 16:9 | Mista |
| 07 | `conclusao-territorio.png` | Fundo da conclusão | 21:9 | Petróleo (sob overlay) |

**Como substituir:** salve cada imagem gerada com o nome exato acima e sobrescreva o placeholder correspondente na pasta `images/`. Nenhuma alteração no HTML é necessária. Cada ponto de inserção está marcado no `index.html` com um comentário `<!-- IMAGEM NN · images/... -->`.

**Dica de consistência:** gere as imagens 02–05 na mesma sessão/conversa da IA de imagem, pedindo explicitamente "mesma linguagem gráfica da imagem anterior", para manter coerência de traço entre os quatro períodos.
