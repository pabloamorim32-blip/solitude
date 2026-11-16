# Entre margens — diário de prática

Diário web para praticar **solitude escolhida, equanimidade e autonomia existencial**: jornada de 28 dias, fichas diárias, cartas de prática, revisões semanais e leituras.

- 100% estático (HTML + CSS + JS), sem servidor, sem cadastro, sem rastreamento.
- Os registros ficam **apenas no navegador** (`localStorage`). Nada é enviado a lugar nenhum.
- Funciona offline e pode ser instalado como app (PWA).
- Análise com IA: o site só **prepara um texto para você copiar**; você decide se cola em Claude, ChatGPT, Gemini etc.

## Estrutura

```
index.html                 página única
manifest.webmanifest       instalação como app
sw.js                      funcionamento offline (suba CACHE_VERSION a cada versão nova)
assets/css/style.css       estilos
assets/js/data.js          conteúdo: dias, metas, práticas (edite textos aqui)
assets/js/app.js           lógica
assets/icons/              ícones
.nojekyll                  evita processamento Jekyll no GitHub Pages
```

## Publicar no GitHub Pages

1. Copie **todo o conteúdo** desta pasta (incluindo `.nojekyll`) para a raiz do repositório.
2. `git add . && git commit -m "Entre margens" && git push`
3. No GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
4. O site abre em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Para testar localmente: `python3 -m http.server` e abra `http://localhost:8000`.

## Migrar dados do arquivo antigo

Os dados são por endereço. No HTML antigo use **Baixar meus dados**; no site novo use **Importar cópia**. O formato é compatível.

## Privacidade e segurança

- Política de conteúdo (CSP) restritiva: sem scripts, fontes ou imagens externas.
- Importação valida e limita os dados (datas, escalas 0–10, minutos 0–1440, tamanho do arquivo).
- Se o repositório for público, o código é público, mas os registros de cada pessoa não: ficam só no navegador dela. Para o site não aparecer em buscadores, adicione `<meta name="robots" content="noindex">` no `<head>`.

## Aviso

Este diário organiza reflexão pessoal. Não é tratamento nem diagnóstico. Em sofrimento intenso, procure apoio: no Brasil, CVV 188 (24 h) e SAMU 192 em emergência.
