# Entre margens — diário de prática

Diário web para praticar **solitude escolhida, equanimidade e autonomia existencial**: jornada de 28 dias, fichas diárias, cartas de prática, revisões semanais e leituras.

## Como funciona

- A interface é estática (HTML, CSS e JavaScript), sem cadastro ou rastreamento.
- Os registros ficam no navegador (`localStorage`).
- **Copiar prompt** prepara o texto para você levar a uma IA externa. Nada é enviado por essa opção.
- **Analisar aqui** envia o prompt somente depois que você marcar o consentimento. O texto passa pela função do Netlify e pela API do Google Gemini; não envie informações que identifiquem outras pessoas.

## Estrutura

```
index.html                         página única
manifest.webmanifest               instalação como app
sw.js                              funcionamento offline (atualize CACHE_VERSION a cada versão)
assets/css/style.css               estilos
assets/js/data.js                  dias, metas e práticas
assets/js/app.js                   lógica
assets/icons/                      ícones do app
netlify.toml                       publicação e configuração de Functions
netlify/functions/analisar.mjs     análise de IA no servidor
.nojekyll                          evita processamento Jekyll no GitHub Pages
```

## Publicar no GitHub Pages

1. Copie todo o conteúdo da raiz, incluindo o arquivo `.nojekyll`.
2. Em **Settings → Pages → Build and deployment**, escolha **Deploy from a branch → main / (root)**.
3. O site ficará em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

O modo **Analisar aqui** requer Netlify. No GitHub Pages, use **Copiar prompt** para abrir uma IA à sua escolha.

## Publicar no Netlify

O arquivo `netlify.toml` define a publicação da raiz (`.`) e a pasta de funções (`netlify/functions`). Conecte o repositório ao Netlify, deixe o comando de build vazio e publique.

Em **Site configuration → Environment variables**, configure:

- `GEMINI_API_KEY`: obrigatória; crie a chave no Google AI Studio e salve como variável secreta do Netlify. Nunca coloque a chave no HTML, JavaScript ou GitHub.
- `ACCESS_CODE`: opcional, mas recomendada se o site for público. Salve como segredo; quem usar a análise integrada precisará informar esse código.
- `AI_MODEL`: opcional. O padrão da função é `gemini-3.5-flash-lite`.

Depois de salvar ou alterar as variáveis, publique uma nova implantação para que a função receba os valores.

## Privacidade e segurança

- Sem análise integrada, os registros permanecem no navegador e não são transmitidos pelo site.
- Com **Analisar aqui**, somente o prompt preparado é enviado ao servidor do Netlify e ao Google Gemini, após consentimento explícito.
- A função não grava o conteúdo do diário em logs da aplicação. O Google recebe o prompt para gerar a resposta. Na faixa gratuita do Gemini, o Google pode usar o conteúdo enviado para melhorar produtos; evite enviar informações que não queira compartilhar.
- Sem `ACCESS_CODE`, qualquer pessoa que acessar o site poderá chamar a função e consumir a cota da chave. O código compartilhado restringe o acesso, mas não substitui autenticação individual ou limite de uso.
- A importação valida datas, escalas de 0 a 10, minutos de 0 a 1440 e o tamanho do arquivo.
- Para ocultar o site de buscadores, adicione `<meta name="robots" content="noindex">` ao `<head>`.

## Aviso

Este diário organiza reflexão pessoal. Não é tratamento nem diagnóstico. Em sofrimento intenso, procure apoio: no Brasil, CVV 188 (24 h) e SAMU 192 em emergência.
