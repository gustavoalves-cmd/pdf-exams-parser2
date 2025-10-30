// app.js - Processador de Provas COREME (Client-side)
// Versão adaptada para provas médicas brasileiras

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
        
        // Passo 2: Extrair texto
        showProgress(30, `Extraindo texto (${numPages} páginas)...`);
        extractedText = await extractTextFromPDF(pdf);
        
        // Passo 3: Parse do gabarito
        showProgress(50, 'Processando gabarito...');
        const answers = parseAnswerKey(answerKey);
        
        // Passo 4: Parse das questões
        showProgress(60, 'Identificando questões...');
        const questions = parseQuestions(extractedText, answers);
        
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
        console.error('Erro:', error);
        showStatus(`❌ Erro ao processar: ${error.message}`, 'error');
        hideProgress();
        processBtn.disabled = false;
    }
}

// Extrair texto do PDF
async function extractTextFromPDF(pdf) {
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += '\n' + pageText + '\n';
        
        // Atualizar progresso
        const progress = 30 + ((i / numPages) * 20);
        showProgress(progress, `Extraindo página ${i}/${numPages}...`);
    }
    
    return fullText;
}

// Parse do gabarito
function parseAnswerKey(answerKeyText) {
    const answers = {};
    
    // Formato 1: "01-A, 02-B, 03-C"
    // Formato 2: "01: A" (um por linha)
    
    // Limpar e normalizar
    const normalized = answerKeyText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    
    // Tentar formato 1 (separado por vírgulas)
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
        // Formato 2 (um por linha)
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

// Parse das questões (adaptado para provas médicas brasileiras)
function parseQuestions(text, answers) {
    const questions = [];
    
    // Normalizar texto - preservar quebras de linha importantes
    let normalized = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    
    // Remover headers/footers comuns
    normalized = normalized.replace(/pcimarkpci.*?www\.pciconcursos\.com\.br/g, '');
    normalized = normalized.replace(/Confidencial até o momento da aplicação\./g, '');
    normalized = normalized.replace(/HRPP\d+\/\d+-\w+/g, '');
    
    // Regex mais específica para questões médicas
    // Procura por número seguido de ponto e espaço, no início de linha ou após quebra
    const questionRegex = /(?:^|\n)\s*(\d{1,3})\.\s+([A-Z])/gm;
    
    let match;
    const questionStarts = [];
    
    while ((match = questionRegex.exec(normalized)) !== null) {
        const qNum = parseInt(match[1]);
        // Filtrar números que claramente não são questões (ex: anos, percentuais)
        if (qNum >= 1 && qNum <= 200) {
            questionStarts.push({
                number: qNum,
                startIndex: match.index,
                matchLength: match[0].length
            });
        }
    }
    
    // Filtrar duplicatas e ordenar
    const uniqueStarts = [];
    const seenNumbers = new Set();
    
    for (const start of questionStarts) {
        if (!seenNumbers.has(start.number)) {
            seenNumbers.add(start.number);
            uniqueStarts.push(start);
        }
    }
    
    uniqueStarts.sort((a, b) => a.number - b.number);
    
    // Processar cada questão
    for (let i = 0; i < uniqueStarts.length; i++) {
        const current = uniqueStarts[i];
        const next = uniqueStarts[i + 1];
        
        const startIdx = current.startIndex;
        const endIdx = next ? next.startIndex : normalized.length;
        const questionBlock = normalized.substring(startIdx, endIdx);
        
        // Extrair enunciado e alternativas
        const parsed = parseQuestionBlock(questionBlock, current.number, answers);
        if (parsed && parsed.enunciado.length > 20) { // Filtrar lixo
            questions.push(parsed);
        }
    }
    
    return questions;
}

// Parse de um bloco de questão individual
function parseQuestionBlock(block, questionNumber, answers) {
    try {
        // Limpar o bloco
        let content = block.trim();
        
        // Remover o número da questão do início (ex: "01. ")
        content = content.replace(/^\s*\d{1,3}\.\s*/, '');
        
        // Detectar alternativas no formato (A), (B), etc ou A), B), etc
        // Padrão comum em provas brasileiras
        const alternativeRegex = /\(([A-J])\)|^\s*([A-J])\)/gm;
        const alternatives = {};
        const altPositions = [];
        
        let altMatch;
        while ((altMatch = alternativeRegex.exec(content)) !== null) {
            const letter = altMatch[1] || altMatch[2];
            
            // Evitar capturar letras que não são alternativas (ex: no meio de texto)
            // Verificar se há ponto ou texto antes (não é início de alternativa)
            const beforeMatch = content.substring(Math.max(0, altMatch.index - 10), altMatch.index);
            const isRealAlternative = /(\n|^)\s*$/.test(beforeMatch) || altMatch.index === 0;
            
            if (isRealAlternative) {
                altPositions.push({
                    letter: letter,
                    index: altMatch.index,
                    matchLength: altMatch[0].length
                });
            }
        }
        
        // Se encontrou menos de 3 alternativas, tentar outro padrão
        // Algumas provas usam apenas "A." ou "A)"
        if (altPositions.length < 3) {
            const simpleAltRegex = /(?:^|\n)\s*([A-J])[\.\)]\s+/gm;
            const tempPositions = [];
            
            while ((altMatch = simpleAltRegex.exec(content)) !== null) {
                tempPositions.push({
                    letter: altMatch[1],
                    index: altMatch.index,
                    matchLength: altMatch[0].length
                });
            }
            
            if (tempPositions.length > altPositions.length) {
                altPositions.length = 0;
                altPositions.push(...tempPositions);
            }
        }
        
        // Se ainda não encontrou alternativas, questão pode ter imagem
        let hasImage = altPositions.length < 3;
        
        // Extrair enunciado (texto antes da primeira alternativa)
        let enunciado = '';
        if (altPositions.length > 0) {
            enunciado = content.substring(0, altPositions[0].index).trim();
        } else {
            // Se não tem alternativas, todo o bloco é o enunciado
            enunciado = content.trim();
        }
        
        // Extrair texto de cada alternativa
        for (let i = 0; i < altPositions.length; i++) {
            const current = altPositions[i];
            const next = altPositions[i + 1];
            
            const startIdx = current.index + current.matchLength;
            const endIdx = next ? next.index : content.length;
            
            let altText = content.substring(startIdx, endIdx).trim();
            
            // Limpar quebras de linha excessivas mas manter espaçamento
            altText = altText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
            
            alternatives[current.letter] = altText;
        }
        
        // Limpar enunciado - remover quebras mas manter legibilidade
        enunciado = enunciado
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Converter resposta de letra para número
        const answerLetter = answers[questionNumber] || '';
        
        // Montar objeto da questão no formato esperado
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
        console.error(`Erro ao processar questão ${questionNumber}:`, error);
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

// Gerar arquivo Excel no formato correto do template
async function generateExcel(questions) {
    // Converter letra da resposta para número (A=1, B=2, etc)
    const letterToNumber = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
        'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10
    };
    
    // Preparar dados no formato do template
    const data = questions.map(q => {
        const row = {
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
        };
        return row;
    });
    
    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data, {
        header: ['numero', 'questao', 'alternativa_correta', 
                 'alternativa1', 'alternativa2', 'alternativa3', 'alternativa4', 'alternativa5',
                 'alternativa6', 'alternativa7', 'alternativa8', 'alternativa9', 'alternativa10']
    });
    
    // Ajustar largura das colunas
    const colWidths = [
        { wch: 8 },   // numero
        { wch: 80 },  // questao
        { wch: 10 },  // alternativa_correta
        { wch: 60 },  // alternativa1
        { wch: 60 },  // alternativa2
        { wch: 60 },  // alternativa3
        { wch: 60 },  // alternativa4
        { wch: 60 },  // alternativa5
        { wch: 60 },  // alternativa6
        { wch: 60 },  // alternativa7
        { wch: 60 },  // alternativa8
        { wch: 60 },  // alternativa9
        { wch: 60 }   // alternativa10
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // Baixar arquivo
    const fileName = currentPdfFile.name.replace('.pdf', '') + '_processado.xlsx';
    XLSX.writeFile(wb, fileName);
}
