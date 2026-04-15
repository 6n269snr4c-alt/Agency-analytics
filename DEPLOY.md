# 🚀 Guia de Deploy

Este documento explica como fazer deploy do Agency Analytics em diferentes plataformas.

## 📋 Pré-requisitos

- Conta no GitHub (para qualquer método)
- Git instalado localmente

---

## 🔷 Método 1: Vercel (Recomendado)

### Via Interface Web (Mais Fácil)

1. **Suba o código no GitHub:**
   ```bash
   cd agency-analytics
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/agency-analytics.git
   git push -u origin main
   ```

2. **Conecte no Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Add New Project"
   - Importe seu repositório do GitHub
   - Clique em "Deploy"
   - ✅ Pronto! Seu link estará disponível em segundos

### Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
cd agency-analytics
vercel

# Para produção
vercel --prod
```

**Seu site estará em:** `https://seu-projeto.vercel.app`

---

## 🔷 Método 2: GitHub Pages

1. **Suba o código:**
   ```bash
   cd agency-analytics
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/agency-analytics.git
   git push -u origin main
   ```

2. **Configurar GitHub Pages:**
   - Vá em Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `main` / `root`
   - Salve

3. **Aguarde 2-3 minutos**

**Seu site estará em:** `https://SEU-USUARIO.github.io/agency-analytics/`

---

## 🔷 Método 3: Netlify

### Via Interface (Drag & Drop)

1. Acesse [netlify.com](https://netlify.com)
2. Faça login
3. Clique em "Add new site" → "Deploy manually"
4. **Arraste a pasta `agency-analytics`** inteira
5. ✅ Pronto!

### Via CLI

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Fazer login
netlify login

# Deploy
cd agency-analytics
netlify deploy

# Para produção
netlify deploy --prod
```

**Seu site estará em:** `https://random-name.netlify.app`

---

## 🔷 Método 4: Firebase Hosting

```bash
# Instalar Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Inicializar projeto
cd agency-analytics
firebase init hosting

# Configurações:
# - Public directory: . (ponto)
# - Single-page app: Yes
# - GitHub deploys: No (ou Yes se quiser CI/CD)

# Deploy
firebase deploy
```

**Seu site estará em:** `https://seu-projeto.web.app`

---

## 🔷 Método 5: Servidor Próprio (VPS/Shared Hosting)

### Via FTP/SFTP

1. Conecte ao seu servidor via FTP
2. Faça upload de **todos os arquivos** para a pasta pública (public_html, www, etc)
3. ✅ Acesse via seu domínio

### Via SSH

```bash
# Conectar ao servidor
ssh usuario@seu-servidor.com

# Clonar repositório
cd /var/www/html
git clone https://github.com/SEU-USUARIO/agency-analytics.git

# Pronto!
```

---

## ⚙️ Configurações Especiais

### Custom Domain (Domínio Próprio)

#### Vercel
1. Project Settings → Domains
2. Adicione seu domínio
3. Configure DNS conforme instruções

#### Netlify
1. Site Settings → Domain management
2. Add custom domain
3. Configure DNS conforme instruções

### HTTPS
Todos os métodos acima já incluem HTTPS automático via Let's Encrypt.

---

## 🔍 Verificação Pós-Deploy

Após fazer deploy, teste:

1. ✅ Página inicial carrega
2. ✅ Navegação entre páginas funciona
3. ✅ Modal de "Novo Contrato" abre
4. ✅ Dados persistem após refresh
5. ✅ Console não mostra erros (F12)

### Troubleshooting

**Erro: "Cannot GET /contracts"**
- **Causa:** Servidor não está configurado para SPA
- **Solução:** Use o arquivo `vercel.json` que já está no projeto

**Estilos não carregam**
- Verifique se os arquivos CSS estão no caminho correto
- Confirme que `/css/` está acessível

**Dados não persistem**
- Verifique se localStorage está habilitado
- Teste em modo anônimo para descartar extensões

---

## 🔄 Atualizações Futuras

### Vercel/Netlify (com Git)
```bash
# Fazer mudanças
git add .
git commit -m "Atualização X"
git push

# Deploy automático!
```

### GitHub Pages
```bash
git push
# Aguarde 2-3 minutos
```

### Servidor Manual
```bash
# Via SSH
cd /var/www/html/agency-analytics
git pull
```

---

## 📊 Analytics (Opcional)

### Google Analytics

Adicione antes do `</head>` em `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🎯 Recomendação

Para **máxima simplicidade**: Use **Vercel**
- Deploy em 1 minuto
- HTTPS automático
- CDN global
- Domínio grátis
- Atualizações automáticas via Git

---

## 📞 Suporte

Problemas com deploy? Verifique:
- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Netlify](https://docs.netlify.com)
- [GitHub Pages Guide](https://pages.github.com)
