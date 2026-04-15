# 🔧 CORREÇÃO: Tela Branca no Vercel

## ⚡ SOLUÇÃO RÁPIDA (2 minutos)

### Opção 1: Atualizar vercel.json

**Substitua o arquivo `vercel.json` por este:**

```json
{
  "headers": [
    {
      "source": "/js/(.*)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Depois:**
1. Commit e push para o GitHub
2. Vercel faz redeploy automático
3. Aguarde ~1 minuto

---

### Opção 2: Verificar Console do Navegador

1. Acesse seu site no Vercel
2. Pressione **F12** (DevTools)
3. Vá na aba **Console**
4. Procure por erros em vermelho

**Erros comuns:**

```
Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/plain"
```
↪️ **Solução**: Use o `vercel.json` acima

```
Uncaught SyntaxError: Cannot use import statement outside a module
```
↪️ **Solução**: Adicionar `type="module"` no script

---

## 🔍 DIAGNÓSTICO COMPLETO

### Passo 1: Verificar index.html

O `<script>` deve ter `type="module"`:

```html
<!-- ❌ ERRADO -->
<script src="js/app.js"></script>

<!-- ✅ CORRETO -->
<script type="module" src="js/app.js"></script>
```

### Passo 2: Verificar Estrutura de Arquivos

Confirme que está assim no GitHub:

```
/
├── index.html
├── vercel.json
├── css/
│   ├── main.css
│   └── components.css
└── js/
    ├── app.js
    ├── router.js
    ├── components/
    ├── pages/
    ├── services/
    ├── store/
    └── utils/
```

### Passo 3: Verificar Imports

Todos os imports devem ter `.js` no final:

```javascript
// ❌ ERRADO
import { renderNavbar } from './components/navbar';

// ✅ CORRETO
import { renderNavbar } from './components/navbar.js';
```

---

## 🚀 CORREÇÕES PASSO A PASSO

### Correção 1: vercel.json

```bash
# No seu repositório local
rm vercel.json
# Cole o novo vercel.json que forneci acima
git add vercel.json
git commit -m "fix: corrigir MIME type para módulos JS"
git push
```

### Correção 2: index.html

Certifique-se de que tem isso:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agency Analytics - Análise de Produtividade</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/components.css">
</head>
<body>
    <div id="app">
        <nav id="navbar"></nav>
        <main id="content"></main>
    </div>

    <!-- IMPORTANTE: type="module" -->
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

---

## 🐛 DEBUGGING AO VIVO

### No Console do Navegador (F12):

```javascript
// Testar se o módulo carrega
import('./js/app.js')
  .then(() => console.log('✅ Módulo carregou'))
  .catch(err => console.error('❌ Erro:', err));
```

### Verificar Network (aba Network do DevTools):

1. Recarregue a página
2. Procure por `app.js`
3. Verifique:
   - **Status**: deve ser `200`
   - **Type**: deve ser `javascript` ou `module`
   - Se estiver `text/plain` → problema no `vercel.json`

---

## 🔧 SOLUÇÕES ALTERNATIVAS

### Se AINDA não funcionar:

#### Opção A: Adicionar Headers no HTML

Adicione antes do `</head>`:

```html
<script>
  // Force module support
  if (typeof module === 'object') {
    window.module = module;
    window.exports = module.exports;
  }
</script>
```

#### Opção B: Usar Build Tool (Vite)

Se preferir uma solução mais robusta:

```bash
npm create vite@latest agency-analytics-build -- --template vanilla
# Copie seus arquivos para dentro
# Build: npm run build
# Deploy a pasta dist/
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Marque cada item:

- [ ] `index.html` tem `<script type="module">`
- [ ] Todos os imports têm `.js` no final
- [ ] `vercel.json` tem configuração de headers
- [ ] Estrutura de pastas está correta
- [ ] Fez commit e push
- [ ] Esperou deploy finalizar no Vercel
- [ ] Limpou cache do navegador (Ctrl+Shift+R)

---

## 🆘 SE NADA FUNCIONAR

### Teste Local Primeiro:

```bash
# Na pasta do projeto
python3 -m http.server 8000
# Abra: http://localhost:8000
```

Se funcionar local mas não no Vercel:
1. É problema de configuração do Vercel
2. Use o `vercel.json` que forneci
3. Ou mude para build com Vite

---

## 📞 PRECISA DE AJUDA?

Me envie:
1. Screenshot do Console (F12 → Console)
2. URL do deployment no Vercel
3. Conteúdo do seu `vercel.json` atual

Resolvo em minutos! 🚀
