# 🧪 COMANDOS DE TESTE - Debug no Console

## 📝 Cole estes comandos no Console (F12) após carregar o PDF

### 1. Verificar Texto Extraído

```javascript
// Ver primeiros 2000 caracteres do texto
console.log('📄 Texto extraído:', extractedText.substring(0, 2000));

// Ver tamanho total
console.log('📊 Total de caracteres:', extractedText.length);

// Procurar questão específica (ex: questão 50)
const pos = extractedText.indexOf('50. ');
console.log('🔍 Posição da questão 50:', pos);
console.log('📝 Contexto questão 50:', extractedText.substring(pos, pos + 500));
```

### 2. Testar Regex de Detecção

```javascript
// Testar quantos números de questão existem
const matches = [...extractedText.matchAll(/\n\s*(\d{2})\.\s+/g)];
console.log('🔢 Total de padrões "XX." encontrados:', matches.length);
console.log('📋 Primeiros 20:', matches.slice(0, 20).map(m => parseInt(m[1])));
console.log('📋 Últimos 20:', matches.slice(-20).map(m => parseInt(m[1])));
```

### 3. Verificar Questões Únicas

```javascript
// Extrair apenas números únicos
const numbers = [...extractedText.matchAll(/\n\s*(\d{2})\.\s+/g)]
    .map(m => parseInt(m[1]))
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .sort((a, b) => a - b);

console.log('🎯 Números únicos encontrados:', numbers.length);
console.log('📊 Lista:', numbers);

// Encontrar números faltantes (1-100)
const faltando = [];
for (let i = 1; i <= 100; i++) {
    if (!numbers.includes(i)) faltando.push(i);
}
console.log('⚠️ Números faltando:', faltando);
```

### 4. Testar Parse de Questão Específica

```javascript
// Ver questão específica processada (ex: questão 1)
const testQuestion = (num) => {
    const pattern = new RegExp(`\\n\\s*${num}\\.\\s+([^\\n]+)`, 'g');
    const match = pattern.exec(extractedText);
    if (match) {
        console.log(`📝 Questão ${num}:`, match[0]);
        console.log(`📄 Primeira linha:`, match[1]);
    } else {
        console.log(`❌ Questão ${num} não encontrada`);
    }
};

// Testar várias questões
[1, 10, 25, 50, 75, 100].forEach(testQuestion);
```

### 5. Verificar Falsos Positivos

```javascript
// Procurar por "001. Prova"
const falsoPositivo = extractedText.match(/\n\s*\d{3}\.\s*Prova/i);
console.log('🚫 Falso positivo encontrado?', falsoPositivo ? 'SIM' : 'NÃO');
if (falsoPositivo) {
    console.log('📍 Conteúdo:', falsoPositivo[0]);
}

// Procurar outras strings problemáticas
['ÁREAS DE ACESSO', 'PROCESSO SELETIVO', 'RESIDÊNCIA MÉDICA'].forEach(str => {
    const found = extractedText.includes(str);
    console.log(`🔍 Contém "${str}"?`, found ? 'SIM' : 'NÃO');
});
```

### 6. Analisar Resultado Final

```javascript
// Após processar, ver estatísticas detalhadas
const analiseResultado = () => {
    if (typeof questions === 'undefined') {
        console.log('⚠️ Variável "questions" não existe. Processe a prova primeiro.');
        return;
    }
    
    console.log('📊 Total de questões:', questions.length);
    
    // Contar questões com alternativas completas
    const completas = questions.filter(q => 
        q.alternativa_a && q.alternativa_b && 
        q.alternativa_c && q.alternativa_d
    ).length;
    console.log('✅ Questões com alternativas completas:', completas);
    
    // Contar questões com resposta
    const comResposta = questions.filter(q => q.resposta_correta).length;
    console.log('✅ Questões com resposta do gabarito:', comResposta);
    
    // Contar questões marcadas com imagem
    const comImagem = questions.filter(q => q.tem_imagem).length;
    console.log('⚠️ Questões marcadas com imagem:', comImagem);
    
    // Ver primeira e última
    console.log('📝 Primeira questão:', questions[0]);
    console.log('📝 Última questão:', questions[questions.length - 1]);
    
    // Ver números de todas as questões
    const nums = questions.map(q => q.numero).sort((a, b) => a - b);
    console.log('🔢 Números das questões:', nums);
    
    // Encontrar buracos na sequência
    const buracos = [];
    for (let i = 1; i <= 100; i++) {
        if (!nums.includes(i)) buracos.push(i);
    }
    if (buracos.length > 0) {
        console.log('⚠️ ATENÇÃO: Questões faltando:', buracos);
    } else {
        console.log('✅ Todas as questões de 1-100 foram capturadas!');
    }
};

// Executar análise
analiseResultado();
```

### 7. Exportar Dados para Análise

```javascript
// Criar objeto com dados úteis para análise
const dadosDebug = {
    timestamp: new Date().toISOString(),
    textoExtraido: {
        tamanho: extractedText.length,
        primeiros500: extractedText.substring(0, 500),
        ultimos500: extractedText.substring(extractedText.length - 500)
    },
    questoesProcessadas: questions ? questions.length : 0,
    primeirasQuestoes: questions ? questions.slice(0, 3) : [],
    ultimasQuestoes: questions ? questions.slice(-3) : [],
    numerosEncontrados: questions ? questions.map(q => q.numero) : []
};

// Exportar como JSON (copie e cole em arquivo .json)
console.log('📦 Dados de debug (copie):');
console.log(JSON.stringify(dadosDebug, null, 2));
```

---

## 🎯 Sequência de Testes Recomendada

### Teste Básico (2 minutos):

1. Carregar PDF
2. Executar teste #2 (regex)
3. Executar teste #3 (números únicos)
4. Se mostrar ~100 números únicos → **OK, prosseguir**
5. Se mostrar <90 → **Problema, investigar**

### Teste Completo (5 minutos):

1. Carregar PDF
2. Executar todos os testes (#1 até #6)
3. Processar prova
4. Executar teste #6 (análise resultado)
5. Se tudo OK → **Gerar Excel**
6. Se algum problema → **Exportar debug (#7)**

---

## 📋 Interpretação dos Resultados

### ✅ Sucesso:

```
🔢 Total de padrões "XX." encontrados: 100
🎯 Números únicos encontrados: 100
⚠️ Números faltando: []
📊 Total de questões: 100
✅ Todas as questões de 1-100 foram capturadas!
```

### ⚠️ Problema Leve:

```
🔢 Total de padrões "XX." encontrados: 105
🎯 Números únicos encontrados: 100
⚠️ Números faltando: []
```
→ **Tem duplicatas mas tudo foi capturado (OK)**

### ❌ Problema Grave:

```
🔢 Total de padrões "XX." encontrados: 74
🎯 Números únicos encontrados: 74
⚠️ Números faltando: [45, 46, 47, ..., 100]
```
→ **Faltam questões - PDF pode ter formatação diferente**

---

## 🔧 Debug de Questão Específica

Se uma questão específica está com problema:

```javascript
// Substituir XX pelo número da questão
const debugQuestao = (num) => {
    console.group(`🔍 Debug da Questão ${num}`);
    
    // 1. Verificar se existe no texto
    const regex1 = new RegExp(`\\n\\s*${num}\\.\\s+`, 'g');
    const encontrado = regex1.test(extractedText);
    console.log('1. Existe no texto?', encontrado ? 'SIM' : 'NÃO');
    
    // 2. Extrair contexto
    const pos = extractedText.indexOf(`\n${num}. `);
    if (pos !== -1) {
        console.log('2. Contexto:', extractedText.substring(pos, pos + 300));
    }
    
    // 3. Verificar se foi processada
    if (typeof questions !== 'undefined') {
        const q = questions.find(quest => quest.numero === num);
        if (q) {
            console.log('3. Foi processada:', 'SIM');
            console.log('   Enunciado:', q.enunciado);
            console.log('   Alt A:', q.alternativa_a);
            console.log('   Alt B:', q.alternativa_b);
        } else {
            console.log('3. Foi processada:', 'NÃO');
        }
    }
    
    console.groupEnd();
};

// Exemplo: debugar questão 50
debugQuestao(50);
```

---

## 💾 Salvar Logs para Análise

```javascript
// Salvar todo o log do console em um arquivo
copy(console.log.toString()); // Não funciona sempre

// Alternativa: Clicar com botão direito no console > Save as...

// Ou copiar manualmente o JSON do teste #7
```

---

**💡 Dica:** Execute os testes ANTES de processar para economizar tempo!
