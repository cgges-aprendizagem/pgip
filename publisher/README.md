# Publicação do PGIP pelo SPU Builder

Código destinado ao Cloudflare Worker `pgip-publisher`.
URL: https://pgip-publisher.luis-lindner-ifsc.workers.dev

## Configuração pelo painel

1. Instalar o GitHub App **PGIP Publisher CGGES** em `cgges-aprendizagem`, selecionando apenas o repositório `pgip`.
2. No GitHub App, manter **Contents: Read and write**, tokens com expiração, webhook desativado e o retorno de autorização em `https://pgip-publisher.luis-lindner-ifsc.workers.dev/auth/callback`.
3. Na Cloudflare, abrir o Worker → **Edit code**. Substituir o código inicial pelo conteúdo integral de `worker.js` e clicar em **Deploy**. O código é um módulo JavaScript e não precisa de compilação.
4. Em **Settings → Variables and Secrets**, cadastrar como **Secret**:
   - `GITHUB_CLIENT_SECRET`: gerado na página do GitHub App em **Generate a new client secret**.
   - `SESSION_SECRET`: senha aleatória de pelo menos 32 caracteres, gerada pelo gerenciador de senhas. Manter o mesmo valor entre publicações do Worker; trocá-lo encerra as sessões existentes.
5. Publicar as configurações. Abrir `/health` para confirmar `configured: true` e `uploadVersion: 2`. Esse endereço nunca exibe secrets.
6. No builder, abrir um material com código no título, por exemplo `M121 - Bens imóveis públicos`. Usar **Exportar → Publicar / atualizar no GitHub → Entrar com GitHub**. Depois do login, conferir material, pasta e conta e confirmar a publicação.

Os secrets são digitados exclusivamente na Cloudflare: não devem ser adicionados ao repositório, ao código do Worker ou enviados no chat.
O Client ID público já está no código. O GitHub pode exigir gerar uma chave privada para instalar o App. O Worker não utiliza essa chave: as gravações usam autorização individual do usuário.

## Comportamento

- O serviço só escreve em `cgges-aprendizagem/pgip`, branch `main`, dentro de pastas com código `m` seguido de números e sufixo opcional.
- O pacote inclui `index.html`, `projeto{código}.spu.json` e arquivos em `assets/`.
- O usuário precisa ter acesso de escrita e o app precisa estar instalado no repositório.
- OAuth usa state, PKCE e cookie temporário HttpOnly. A sessão devolvida ao builder é cifrada; o token bruto do GitHub permanece dentro dela e só é aberto no Worker. Secrets nunca chegam ao código do site.
- A sessão do publicador dura até uma hora, fica no sessionStorage da aba e pode ser removida com **Sair da conta**. O fragmento da URL é removido assim que o builder abre.
- A versão do JSON de origem é conferida para evitar substituição de alterações feitas por outra pessoa desde a abertura do material. A pasta também é conferida entre a confirmação e o envio.
- Todos os arquivos são gravados em um único commit. A referência da branch avança somente ao final, sem atualização forçada. Em conflito, o serviço não substitui a versão concorrente.
- Arquivos auxiliares fora do pacote são preservados. Imagens antigas que deixaram de ser usadas não são excluídas automaticamente.
- Não há limite de tamanho total do material definido pelo publicador. Os arquivos são enviados individualmente, preservando as imagens originais no JSON. O Worker encaminha cada arquivo por stream, sem carregar todo o pacote em memória.
- Cada arquivo pode ter até 70 MiB (73.400.320 bytes), para respeitar o limite de requisição da Cloudflare após a conversão em base64. O manifesto aceita até 100 arquivos. Limites de tempo, memória do navegador e dos serviços externos continuam se aplicando.
- Um manifesto autorizado relaciona os caminhos, tamanhos e hashes dos arquivos. Cada upload confere o hash retornado pelo GitHub; a branch só muda quando a árvore completa é criada e as versões de origem são conferidas novamente.
- Depois do commit, o workflow do GitHub Pages compila e publica o site. A confirmação do envio não significa que o Pages já concluiu a publicação.

## Atualizar um Worker existente

Abrir **Edit code**, substituir o código pelo conteúdo integral da versão atual de `worker.js` e clicar em **Deploy**. Manter os secrets existentes. Confirmar `uploadVersion: 2` em `/health` e recarregar o builder. O builder identifica versões antigas do serviço e solicita a atualização antes de iniciar o envio. O endpoint anterior continua disponível para abas antigas.

## Testes

`node publisher/test-worker.mjs` verifica a autenticação, permissões, isolamento de pastas, conflitos e atualização atômica com uma API simulada. Nenhum material real é alterado pelos testes.
