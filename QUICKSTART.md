# ⚡ Quick Start - 1 Minuto para Começar

## 🚀 Opção 1: Teste Local (Agora mesmo)

```bash
# 1. Entre na pasta
cd agency-analytics

# 2. Suba um servidor
python3 -m http.server 8000

# 3. Abra no navegador
# http://localhost:8000
```

**Pronto!** 🎉

---

## 🌐 Opção 2: Deploy Online (3 minutos)

### Via Vercel (Mais Rápido)

```bash
# 1. Instale a Vercel CLI
npm i -g vercel

# 2. Entre na pasta e faça deploy
cd agency-analytics
vercel

# 3. Confirme as perguntas
# ✅ Seu link estará pronto!
```

### Via GitHub + Vercel (Interface Web)

1. Suba no GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU-USUARIO/agency-analytics.git
git push -u origin main
```

2. Vá em [vercel.com](https://vercel.com)
3. Clique em "New Project"
4. Importe seu repositório
5. Clique em "Deploy"

**✅ Pronto! Seu link: `https://seu-projeto.vercel.app`**

---

## 📊 Primeiros Passos no Sistema

1. **Abra o sistema** (local ou online)
2. **Aceite carregar dados de exemplo** quando perguntado
3. **Explore o Dashboard** para ver todas as análises
4. **Vá em Comparações** para ver profissionais lado a lado

### Ou crie seus próprios dados:

1. **Pessoas** → + Nova Pessoa
   - Nome, Cargo, Salário

2. **Squads** → + Novo Squad (opcional)
   - Nome, Membros

3. **Contratos** → + Novo Contrato
   - Cliente, Valor, Entregáveis
   - Atribua squad ou pessoas

4. **Dashboard** → Veja tudo calculado automaticamente!

---

## 🎯 Funcionalidades Principais

✅ **Dashboard**: ROI geral, squads, ranking  
✅ **Contratos**: Gestão completa de clientes  
✅ **Pessoas**: Time e produtividade  
✅ **Squads**: Times organizados  
✅ **Comparações**: Head-to-head por cargo  

---

## 📖 Mais Informações

- **Guia Completo**: Abra `guide.html` no navegador
- **Deploy**: Veja `DEPLOY.md`
- **Documentação**: Leia `README.md`

---

## 🆘 Precisa de Ajuda?

**Dados não aparecem?**
- Use um servidor HTTP (não abra `file://`)
- Verifique localStorage nas configurações

**Estilos quebrados?**
- Confirme que `css/` está acessível
- Teste em modo anônimo

**Console:**
```javascript
loadSeedData()    // Carregar dados de exemplo
clearAllData()    // Limpar tudo
```

---

## 💡 Dica Pro

Abra `guide.html` no navegador para um tutorial visual completo!

---

**Desenvolvido com ⚡ para agências que querem dados reais**
