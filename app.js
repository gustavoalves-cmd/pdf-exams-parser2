// app.js - Processador de Provas COREME (VERSÃO 4.1 - CORREÇÃO QUESTÃO 100)
// Detecta TODAS as 100 questões corretamente + tratamento especial para Q100

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Elementos DOM
const uploadArea = document.getElementById('uploadArea');
const pdfInput = document.getElementById('pdfInput');
const processBtn = document.getElementById('processBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const answerKeyInput = document.getElementById('answerKey');
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statsEl = document.getElementById('stats');
const statQuestions = document.getElementById('statQuestions');
const statAnswers = document.getElementById('statAnswers');
const statWarnings = document.getElementById('statWarnings');

let currentPdfFile = null;
let extractedText = '';

// Event Listeners
uploadArea.addEventListener('click', () => pdfInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
pdfInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', processExam);

// Drag & Drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        handleFile(files[0]);
    } else {
        showStatus('Apenas arquivos PDF são aceitos', 'error');
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    currentPdfFile = file;
    fileName.textContent = `📄 ${file.name}`;
    fileSize.textContent = `Tamanho: ${formatBytes(file.size)}`;
    fileInfo.classList.add('show');
    processBtn.disabled = false;
    hideStatus();
    hideStats();
}

// Processar prova
async function processExam() {
    if (!currentPdfFile) {
        showStatus('Selecione um arquivo PDF primeiro', 'error');
        return;
    }

    const answerKey = answerKeyInput.value.trim();
    if (!answerKey) {
        showStatus('Cole o gabarito antes de processar', 'error');
        return;
    }

    processBtn.disabled = true;
    hideStatus();
    hideStats();
    
    try {
        // Passo 1: Carregar PDF
        showProgress(10, 'Carregando PDF...');
        const arrayBuffer = await readFileAsArrayBuffer(currentPdfFile);
        
        showProgress(20, 'Analisando documento...');
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        // Passo 2: Extrair texto (PULANDO PÁGINAS 1-2 = CAPA)
        showProgress(30, `Extraindo texto (${numPages} páginas)...`);
        extractedText = await extractTextFromPDF(pdf, 3); // Começar da página 3
        
        console.log('📄 Texto extraído (primeiros 1000 chars):', extractedText.substring(0, 1000));
        console.log('📊 Total de caracteres:', extractedText.length);
        
        // Passo 3: Parse do gabarito
        showProgress(50, 'Processando gabarito...');
        const answers = parseAnswerKey(answerKey);
        
        console.log('✅ Gabarito parseado:', answers);
        console.log('📊 Total de respostas no gabarito:', Object.keys(answers).length);
        
        // Passo 4: Parse das questões (VERSÃO 4.0 FINAL)
        showProgress(60, 'Identificando questões...');
        const questions = parseQuestionsFinal(extractedText, answers);
        
        console.log('✅ Questões identificadas:', questions.length);
        if (questions.length > 0) {
            console.log('📝 Primeira questão:', questions[0]);
            console.log('📝 Última questão:', questions[questions.length - 1]);
        }
        
        if (questions.length === 0) {
            showStatus('⚠️ Nenhuma questão foi identificada no PDF. Verifique se o PDF tem texto selecionável.', 'warning');
            processBtn.disabled = false;
            hideProgress();
            return;
        }
        
        // Passo 5: Gerar Excel
        showProgress(80, 'Gerando arquivo Excel...');
        await generateExcel(questions);
        
        // Passo 6: Estatísticas
        showProgress(100, 'Concluído!');
        const questionsWithAnswers = questions.filter(q => q.resposta_correta).length;
        const warnings = questions.filter(q => q.tem_imagem).length;
        
        showStats(questions.length, questionsWithAnswers, warnings);
        
        setTimeout(() => {
            showStatus(`✅ Processamento concluído! ${questions.length} questões extraídas.`, 'success');
            hideProgress();
            processBtn.disabled = false;
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro:', error);
        showStatus(`❌ Erro ao processar: ${error.message}`, 'error');
        hideProgress();
        processBtn.disabled = false;
    }
}

// Extrair texto do PDF (pulando páginas de capa)
async function extractTextFromPDF(pdf, startPage = 1) {
    let fullText = '';
    const numPages = pdf.numPages;
    
    console.log(`📖 Extraindo texto de ${numPages} páginas (começando da página ${startPage})...`);
    console.log(`📊 Total de páginas a processar: ${numPages - startPage + 1}`);
    
    for (let i = startPage; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Concatenar items com espaços, preservando quebras de linha
        let pageText = '';
        let lastY = null;
        
        textContent.items.forEach(item => {
            // Detectar quebra de linha baseada na posição Y
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
            }
            pageText += item.str + ' ';
            lastY = item.transform[5];
        });
        
        // Log especial para últimas 3 páginas
        if (i >= numPages - 2) {
            console.log(`📄 Página ${i} (últimas páginas): ${pageText.length} caracteres`);
            console.log(`   Primeiros 200 chars: ${pageText.substring(0, 200)}`);
            console.log(`   Contém "100."? ${pageText.includes('100.') ? 'SIM' : 'NÃO'}`);
        }
        
        fullText += '\n' + pageText + '\n';
        
        // Atualizar progresso
        const progress = 30 + (((i - startPage + 1) / (numPages - startPage + 1)) * 20);
        showProgress(progress, `Extraindo página ${i}/${numPages}...`);
    }
    
    console.log(`✅ Extração concluída: ${fullText.length} caracteres no total`);
    console.log(`📊 Última página processada: ${numPages}`);
    
    return fullText;
}

// Parse do gabarito
function parseAnswerKey(answerKeyText) {
    const answers = {};
    
    const normalized = answerKeyText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    
    // Formato 1: "01-A, 02-B, 03-C"
    if (normalized.includes(',')) {
        const parts = normalized.split(',');
        parts.forEach(part => {
            const match = part.trim().match(/(\d+)\s*[-:]\s*([A-J])/i);
            if (match) {
                const num = parseInt(match[1]);
                const answer = match[2].toUpperCase();
                answers[num] = answer;
            }
        });
    } else {
        // Formato 2: "01: A" (um por linha)
        const lines = normalized.split('\n');
        lines.forEach(line => {
            const match = line.trim().match(/(\d+)\s*[-:]\s*([A-J])/i);
            if (match) {
                const num = parseInt(match[1]);
                const answer = match[2].toUpperCase();
                answers[num] = answer;
            }
        });
    }
    
    return answers;
}

// VERSÃO 4.0 FINAL: Parse das questões (SOLUÇÃO DEFINITIVA)
function parseQuestionsFinal(text, answers) {
    const questions = [];
    
    // LIMPEZA AGRESSIVA DO TEXTO
    let cleaned = text
        // Remover marca d'água PCI
        .replace(/pcimarkpci\s+[A-Za-z0-9+/=:]+/g, '')
        .replace(/www\.pciconcursos\.com\.br/g, '')
        // Remover textos de confidencialidade
        .replace(/Confidencial\s+até\s+o\s+momento\s+da\s+aplicação\.?/gi, '')
        // Remover códigos de prova
        .replace(/HRPP\d+\/\d+-[A-Za-z]+/g, '')
        // Remover títulos comuns que não são questões
        .replace(/\n\s*\d{3}\.\s*Prova\s+Objetiva/gi, '')
        .replace(/\n\s*ÁREAS\s+DE\s+ACESSO\s+DIRETO/gi, '')
        .replace(/\n\s*PROCESSO\s+SELETIVO/gi, '')
        // Normalizar quebras de linha
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n');
    
    console.log('🧹 Texto limpo (primeiros 800 chars):', cleaned.substring(0, 800));
    
    // ESTRATÉGIA: Usar regex mais simples mas com validação rigorosa
    // Procurar apenas: \n + 2 dígitos + ponto + espaço + texto
    const pattern = /\n\s*(\d{2})\.\s+([^\n]+)/g;
    
    let match;
    const candidatos = [];
    
    while ((match = pattern.exec(cleaned)) !== null) {
        const qNum = parseInt(match[1]);
        const firstLine = match[2].trim();
        
        // Filtrar apenas números válidos (01-100)
        if (qNum >= 1 && qNum <= 100) {
            // VALIDAÇÃO: Deve começar com letra maiúscula OU palavra comum
            const startsWithUpperCase = /^[A-ZÃÁÂÉÊÍÓÔÚ]/.test(firstLine);
            const startsWithCommonWord = /^(Homem|Mulher|Paciente|Assinale|Com\s+relação|De\s+acordo|Qual|Quais|Uma?|O|A|Criança|Lactente|Gestante|Adolescente|Sobre|Em\s+relação|Durante|Após|Quando|Considerando)/i.test(firstLine);
            
            // FILTRAR falsos positivos comuns
            const isFalsePositive = 
                /^Prova\s+Objetiva/i.test(firstLine) ||
                /^ÁREAS/i.test(firstLine) ||
                /^PROCESSO/i.test(firstLine) ||
                /^RESIDÊNCIA/i.test(firstLine) ||
                /^HOSPITAL/i.test(firstLine) ||
                /^EDITAL/i.test(firstLine) ||
                firstLine.length < 10; // Linha muito curta
            
            if ((startsWithUpperCase || startsWithCommonWord) && !isFalsePositive) {
                candidatos.push({
                    number: qNum,
                    startIndex: match.index,
                    firstLine: firstLine
                });
            }
        }
    }
    
    console.log('🔍 Candidatos encontrados:', candidatos.length);
    console.log('📝 Primeiros 10 candidatos:', candidatos.slice(0, 10));
    
    // Remover duplicatas - manter apenas o primeiro de cada número
    const uniqueCandidatos = [];
    const seenNumbers = new Set();
    
    for (const candidato of candidatos) {
        if (!seenNumbers.has(candidato.number)) {
            seenNumbers.add(candidato.number);
            uniqueCandidatos.push(candidato);
        }
    }
    
    // Ordenar por número
    uniqueCandidatos.sort((a, b) => a.number - b.number);
    
    console.log('✅ Questões únicas (ordenadas):', uniqueCandidatos.length);
    
    // TRATAMENTO ESPECIAL: Se não encontrou questão 100, tentar métodos alternativos
    const tem100 = uniqueCandidatos.some(c => c.number === 100);
    if (!tem100) {
        console.warn('⚠️ Questão 100 não encontrada! Tentando métodos alternativos...');
        
        // Método 1: Buscar "100." sem exigir quebra de linha antes
        const pattern100_alt1 = /(\s|^)100\.\s+([^\n]{20,})/g;
        let match100;
        while ((match100 = pattern100_alt1.exec(cleaned)) !== null) {
            console.log('🔍 Método 1: Encontrou "100." na posição', match100.index);
            uniqueCandidatos.push({
                number: 100,
                startIndex: match100.index,
                firstLine: match100[2].substring(0, 50)
            });
            break;
        }
        
        // Método 2: Buscar no final do texto (últimos 3000 chars)
        if (!tem100 && uniqueCandidatos.every(c => c.number !== 100)) {
            const ultimosTresMil = cleaned.substring(Math.max(0, cleaned.length - 3000));
            const pos100 = ultimosTresMil.indexOf('100.');
            if (pos100 !== -1) {
                const posGlobal = cleaned.length - 3000 + pos100;
                console.log('🔍 Método 2: Encontrou "100." no final do texto, posição', posGlobal);
                
                // Extrair primeira linha
                const texto100 = cleaned.substring(posGlobal);
                const primeiraLinha = texto100.split('\n')[0].substring(4).trim(); // Remove "100."
                
                uniqueCandidatos.push({
                    number: 100,
                    startIndex: posGlobal,
                    firstLine: primeiraLinha
                });
            }
        }
        
        // Método 3: Se ainda não achou, buscar em todo o texto
        if (uniqueCandidatos.every(c => c.number !== 100)) {
            const pos100Global = cleaned.indexOf('100.');
            if (pos100Global !== -1) {
                console.log('🔍 Método 3: Encontrou "100." em qualquer posição:', pos100Global);
                const texto100 = cleaned.substring(pos100Global);
                const primeiraLinha = texto100.split('\n')[0].substring(4).trim();
                
                uniqueCandidatos.push({
                    number: 100,
                    startIndex: pos100Global,
                    firstLine: primeiraLinha
                });
            } else {
                console.error('❌ Questão 100 NÃO encontrada em nenhum método!');
                console.log('📋 Últimos 500 chars do texto:', cleaned.substring(cleaned.length - 500));
            }
        }
        
        // Re-ordenar após adicionar Q100
        uniqueCandidatos.sort((a, b) => a.number - b.number);
        console.log('✅ Após busca especial Q100:', uniqueCandidatos.length, 'questões');
    }
    
    // Validar se encontrou um número razoável de questões
    if (uniqueCandidatos.length < 50) {
        console.warn('⚠️ ATENÇÃO: Menos de 50 questões encontradas!');
        console.warn('📋 Questões encontradas:', uniqueCandidatos.map(c => c.number));
    }
    
    // Processar cada questão
    for (let i = 0; i < uniqueCandidatos.length; i++) {
        const current = uniqueCandidatos[i];
        const next = uniqueCandidatos[i + 1];
        
        const startIdx = current.startIndex;
        const endIdx = next ? next.startIndex : cleaned.length;
        const questionBlock = cleaned.substring(startIdx, endIdx);
        
        const parsed = parseQuestionBlock(questionBlock, current.number, answers);
        
        // Validar que a questão tem conteúdo mínimo
        if (parsed && parsed.enunciado.length > 15) {
            questions.push(parsed);
        } else {
            console.warn(`⚠️ Questão ${current.number} ignorada (enunciado: "${parsed?.enunciado || 'VAZIO'}")`);
        }
    }
    
    return questions;
}

// Parse de bloco individual de questão
function parseQuestionBlock(block, questionNumber, answers) {
    try {
        // Remover número da questão do início
        let content = block.replace(/^\s*\d{2}\.\s*/, '').trim();
        
        // Padrões de alternativas (múltiplos formatos)
        const patterns = [
            /\(([A-J])\)\s*/g,           // (A) 
            /^\s*([A-J])\)\s*/gm,        // A) no início de linha
            /\n\s*([A-J])\)\s*/g,        // A) após quebra
            /\n\s*\(([A-J])\)\s*/g       // (A) após quebra
        ];
        
        let altPositions = [];
        
        // Tentar cada padrão
        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let tempPositions = [];
            let altMatch;
            
            while ((altMatch = pattern.exec(content)) !== null) {
                const letter = altMatch[1];
                tempPositions.push({
                    letter: letter,
                    index: altMatch.index,
                    matchLength: altMatch[0].length
                });
            }
            
            // Usar o padrão que encontrou mais alternativas
            if (tempPositions.length > altPositions.length) {
                altPositions = tempPositions;
            }
        }
        
        // Remover duplicatas próximas
        altPositions = altPositions.filter((pos, index, self) => 
            index === self.findIndex(p => Math.abs(p.index - pos.index) < 5)
        );
        
        // Ordenar por posição
        altPositions.sort((a, b) => a.index - b.index);
        
        // Validar sequência (A, B, C, D...)
        const letters = altPositions.map(p => p.letter);
        const hasValidSequence = letters.length >= 4 && 
            letters[0] === 'A' && letters[1] === 'B' && 
            letters[2] === 'C' && letters[3] === 'D';
        
        // Se não tem sequência válida, marcar como "tem imagem"
        let hasImage = !hasValidSequence || altPositions.length < 4;
        
        // Extrair enunciado
        let enunciado = '';
        if (altPositions.length > 0) {
            enunciado = content.substring(0, altPositions[0].index).trim();
        } else {
            enunciado = content.trim();
            hasImage = true; // Se não tem alternativas, provavelmente tem imagem
        }
        
        // Extrair alternativas
        const alternatives = {};
        for (let i = 0; i < altPositions.length; i++) {
            const current = altPositions[i];
            const next = altPositions[i + 1];
            
            const startIdx = current.index + current.matchLength;
            const endIdx = next ? next.index : content.length;
            
            let altText = content.substring(startIdx, endIdx)
                .trim()
                .replace(/\n+/g, ' ')
                .replace(/\s+/g, ' ');
            
            alternatives[current.letter] = altText;
        }
        
        // Limpar enunciado
        enunciado = enunciado
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Obter resposta do gabarito
        const answerLetter = answers[questionNumber] || '';
        
        // Montar questão
        const question = {
            numero: questionNumber,
            enunciado: enunciado,
            alternativa_a: alternatives['A'] || '',
            alternativa_b: alternatives['B'] || '',
            alternativa_c: alternatives['C'] || '',
            alternativa_d: alternatives['D'] || '',
            alternativa_e: alternatives['E'] || '',
            alternativa_f: alternatives['F'] || '',
            alternativa_g: alternatives['G'] || '',
            alternativa_h: alternatives['H'] || '',
            alternativa_i: alternatives['I'] || '',
            alternativa_j: alternatives['J'] || '',
            resposta_correta: answerLetter,
            tem_imagem: hasImage
        };
        
        return question;
        
    } catch (error) {
        console.error(`❌ Erro ao processar questão ${questionNumber}:`, error);
        return null;
    }
}

// Funções auxiliares
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showProgress(percent, text) {
    progressEl.classList.add('show');
    progressFill.style.width = percent + '%';
    progressFill.textContent = Math.round(percent) + '%';
    if (text) {
        progressText.textContent = text;
    }
}

function hideProgress() {
    progressEl.classList.remove('show');
}

function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = 'status show ' + type;
}

function hideStatus() {
    statusEl.classList.remove('show');
}

function showStats(questions, answers, warnings) {
    statQuestions.textContent = questions;
    statAnswers.textContent = answers;
    statWarnings.textContent = warnings;
    statsEl.classList.add('show');
}

function hideStats() {
    statsEl.classList.remove('show');
}

// Gerar arquivo Excel
async function generateExcel(questions) {
    const letterToNumber = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
        'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10
    };
    
    const data = questions.map(q => ({
        'numero': q.numero,
        'questao': q.enunciado,
        'alternativa_correta': letterToNumber[q.resposta_correta] || null,
        'alternativa1': q.alternativa_a || null,
        'alternativa2': q.alternativa_b || null,
        'alternativa3': q.alternativa_c || null,
        'alternativa4': q.alternativa_d || null,
        'alternativa5': q.alternativa_e || null,
        'alternativa6': q.alternativa_f || null,
        'alternativa7': q.alternativa_g || null,
        'alternativa8': q.alternativa_h || null,
        'alternativa9': q.alternativa_i || null,
        'alternativa10': q.alternativa_j || null
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data, {
        header: ['numero', 'questao', 'alternativa_correta', 
                 'alternativa1', 'alternativa2', 'alternativa3', 'alternativa4', 'alternativa5',
                 'alternativa6', 'alternativa7', 'alternativa8', 'alternativa9', 'alternativa10']
    });
    
    const colWidths = [
        { wch: 8 },   { wch: 80 },  { wch: 10 },
        { wch: 60 },  { wch: 60 },  { wch: 60 },  { wch: 60 },  { wch: 60 },
        { wch: 60 },  { wch: 60 },  { wch: 60 },  { wch: 60 },  { wch: 60 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    const fileName = currentPdfFile.name.replace('.pdf', '') + '_processado.xlsx';
    XLSX.writeFile(wb, fileName);
}
