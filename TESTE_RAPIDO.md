# ⚡ TESTE RÁPIDO - 5 Minutos

## 📥 1. Baixe os Arquivos

[View app.js corrigido](computer:///mnt/user-data/outputs/app.js)
[View documentação das correções](computer:///mnt/user-data/outputs/CORRECOES_APLICADAS.md)

## 🔄 2. Substitua o Arquivo

1. **Baixe** o `app.js` corrigido (link acima)
2. **Substitua** o arquivo `app.js` do seu GitHub Pages
3. **Commit** e **push** para o repositório

Ou se estiver testando localmente:
```bash
# Substitua o app.js na pasta do projeto
cp app.js /caminho/do/seu/projeto/app.js
```

## 🧪 3. Teste Básico

### Passo 1: Limpe o cache
- Chrome/Edge: `Ctrl + Shift + R`
- Firefox: `Ctrl + F5`
- Safari: `Cmd + Option + R`

### Passo 2: Abra o Console do Navegador
Pressione **F12** e vá na aba **Console**

### Passo 3: Carregue o PDF
Arraste o PDF da prova para a área de upload

### Passo 4: Verifique os Logs
Você deve ver no console:
```
Texto extraído: CLÍNICA MÉDICA 01. Homem de 65 anos...
Gabarito parseado: {1: "A", 2: "C", 3: "E", ...}
Inícios de questão encontrados: 100
Questões únicas: 100
Questões identificadas: 100
Primeira questão: {numero: 1, enunciado: "Homem de 65 anos...", ...}
```

### Passo 5: Cole o Gabarito
```
01-A, 02-C, 03-E, 04-A, 05-D, 06-B, 07-B, 08-C, 09-A, 10-D, 
11-B, 12-D, 13-C, 14-B, 15-D, 16-A, 17-B, 18-D, 19-C, 20-E
```

### Passo 6: Processe
Clique em **"🚀 Processar Prova"**

### Passo 7: Verifique o Excel
Abra o Excel gerado e confira:
- ✅ Coluna "numero" tem todos os números (1-100)?
- ✅ Coluna "questao" tem os enunciados completos?
- ✅ Colunas "alternativa1" a "alternativa5" estão preenchidas?
- ✅ Coluna "alternativa_correta" tem números (1-5)?

## ✅ Checklist de Sucesso

- [ ] Console não mostra erros em vermelho
- [ ] "Questões identificadas: 100" aparece no console
- [ ] Excel gerado tem 100 linhas
- [ ] Enunciados estão completos e legíveis
- [ ] Alternativas A-E estão todas preenchidas
- [ ] Respostas corretas foram associadas

## ❌ Se Algo Falhar

### Problema: "Questões identificadas: 0"

**Solução:**
1. Abra o Console (F12)
2. Execute:
```javascript
console.log(extractedText.substring(0, 1000));
```
3. Compartilhe o resultado

### Problema: Poucas questões identificadas

**Solução:**
1. Verifique no console: `Inícios de questão encontrados: X`
2. Se X é baixo, o PDF pode ter formatação diferente
3. Compartilhe os primeiros 500 caracteres do texto extraído

### Problema: Alternativas vazias

**Solução:**
1. Verifique uma questão específica:
```javascript
console.log(questions[0]); // Ver questão 1
console.log(questions[0].alternativa_a); // Ver alternativa A
```
2. Se vazio, pode precisar ajustar padrões de alternativas

### Problema: Excel não baixa

**Solução:**
1. Verifique erros no Console
2. Teste em outro navegador
3. Verifique se a biblioteca XLSX carregou:
```javascript
console.log(typeof XLSX); // Deve mostrar "object"
```

## 🔬 Debug Avançado

Se precisar investigar mais fundo:

```javascript
// Testar extração de texto
const testPdf = async () => {
    const arrayBuffer = await readFileAsArrayBuffer(currentPdfFile);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(3); // Página 3 (tem questões)
    const textContent = await page.getTextContent();
    console.log('Página 3:', textContent.items.map(i => i.str).join(' '));
};
testPdf();

// Testar regex de questões
const testRegex = () => {
    const pattern = /\n\s*(\d{1,3})\.\s+([A-Z][a-zÀ-ÿ]+|Homem|Mulher|Paciente)/g;
    const matches = [...extractedText.matchAll(pattern)];
    console.log('Matches encontrados:', matches.length);
    console.log('Primeiros 5:', matches.slice(0, 5));
};
testRegex();

// Testar parse de uma questão específica
const testQuestion = () => {
    const questions = parseQuestionsImproved(extractedText, {});
    console.log('Questão 1:', questions[0]);
    console.log('Enunciado:', questions[0].enunciado);
    console.log('Alternativa A:', questions[0].alternativa_a);
};
testQuestion();
```

## 📊 Resultado Esperado

Para o PDF "Prova_-_Hospital_Regional_de_Presidente_Prudente_24.pdf":

```
✅ Questões Extraídas: 100
✅ Respostas Associadas: 100 (se gabarito completo)
⚠️ Avisos: ~10 (questões com possíveis imagens)
```

## 📞 Precisa de Ajuda?

Se ainda não funcionar, compartilhe:

1. **Screenshot** do Console (F12)
2. **Primeiras 3 linhas** do Excel gerado
3. **Logs** de debug (copie do console)
4. **Versão** do navegador

---

**Tempo estimado:** 5-10 minutos  
**Dificuldade:** Fácil  
**Pré-requisitos:** Navegador moderno + PDF + Gabarito
