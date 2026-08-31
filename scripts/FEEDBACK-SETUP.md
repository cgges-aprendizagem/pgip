# Piloto de comentários do SPU — M212

A planilha receptora já foi criada:

https://docs.google.com/spreadsheets/d/1c84WeSC-WqXcZRgTB-31Ab-N2-DAULeV8Cj3FFybCNs/edit

## Ativar o endpoint gratuito

1. Abra a planilha.
2. Acesse **Extensões → Apps Script**.
3. Apague o conteúdo inicial do editor.
4. Copie integralmente o conteúdo de \`scripts/feedback-apps-script.gs\`.
5. Clique em **Salvar**.
6. Acesse **Implantar → Nova implantação**.
7. Em **Selecionar tipo**, escolha **Aplicativo da Web**.
8. Em **Executar como**, selecione **Eu**.
9. Em **Quem pode acessar**, selecione **Qualquer pessoa**.
10. Clique em **Implantar**, autorize o script e copie a URL terminada em \`/exec\`.

Depois, substitua \`__SPU_FEEDBACK_ENDPOINT__\` no arquivo \`m212/index.html\` pela URL copiada.

## Privacidade e segurança

O formulário solicita apenas o nome do revisor e o comentário. Não há conta para o comentarista. O endpoint limita o piloto ao material M212, higieniza fórmulas potencialmente perigosas e usa trava de escrita para impedir colisões entre envios simultâneos.

Enquanto a URL não for configurada, o botão permanece visível em modo de diagnóstico e informa que a ativação ainda está pendente. Nenhum comentário é enviado nesse estado.

## Teste após a implantação

Abra a URL do Apps Script diretamente. Ela deve exibir um JSON com `"ok": true`. Em seguida, envie um comentário de teste pelo M212 e confirme que surgiu uma nova linha na aba **Comentários**.
