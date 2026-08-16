# Ciclo de Gestão Contratual

Infográfico interativo e responsivo sobre as seis etapas do ciclo de gestão contratual de imóveis públicos.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie esta pasta para a branch `main`.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**.
4. O fluxo incluído em `.github/workflows/pages.yml` publicará automaticamente a página.

O arquivo principal independente é `public/infografico.html`. Ele reúne estrutura, estilo e interação em um único HTML e pode ser usado fora deste projeto.

## Incorporar por iframe

Depois da publicação, use a URL do GitHub Pages no atributo `src`:

```html
<iframe
  src="https://SEU-USUARIO.github.io/SEU-REPOSITORIO/"
  title="Ciclo de gestão contratual"
  loading="lazy"
  width="1200"
  height="900"
  style="width: 100%; border: 0;"
  allow="fullscreen"
></iframe>
```

No SPU Builder, use o bloco **Conteúdo externo (iframe)**, cole o código acima e mantenha a altura em aproximadamente **900 px**. Para evitar que a altura diminua em telas estreitas, desative **Responsivo na largura** no bloco; a largura do iframe continuará ocupando 100% do contêiner, mas a altura permanecerá estável.

Use a URL pública do GitHub Pages no conteúdo final. A prévia em `chatgpt.site` possui acesso privado e serve apenas para revisão do projeto.

## Controles disponíveis

- Setas anterior e próxima
- Seleção direta das etapas 1 a 6
- Teclas de seta, Home e End
- Arraste horizontal em telas sensíveis ao toque
- Rotação automática com opção de pausa
- Respeito à preferência de movimento reduzido do dispositivo
