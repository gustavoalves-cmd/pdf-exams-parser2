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
    
    // Normalizar texto
    const normalized = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Regex para identificar início de questões
    // Formato: "01." ou "1." seguido de texto
    const questionRegex = /(\d{1,3})\.\s+([^\n]+)/g;
    
    let match;
    const questionStarts = [];
    
    while ((match = questionRegex.exec(normalized)) !== null) {
        questionStarts.push({
            number: parseInt(match[1]),
            startIndex: match.index,
            fullMatch: match[0]
        });
    }
    
    // Processar cada questão
    for (let i = 0; i < questionStarts.length; i++) {
        const current = questionStarts[i];
        const next = questionStarts[i + 1];
        
        const startIdx = current.startIndex;
        const endIdx = next ? next.startIndex : normalized.length;
        const questionBlock = normalized.substring(startIdx, endIdx);
        
        // Extrair enunciado e alternativas
        const parsed = parseQuestionBlock(questionBlock, current.number, answers);
        if (parsed) {
            questions.push(parsed);
        }
    }
    
    return questions;
}

// Parse de um bloco de questão individual
function parseQuestionBlock(block, questionNumber, answers) {
    try {
        // Remover o número da questão do início
        let content = block.replace(/^\d{1,3}\.\s*/, '');
        
        // Detectar alternativas (A) até (J) ou A. até J.
        const alternativeRegex = /\(([A-J])\)|([A-J])\./g;
        const alternatives = {};
        const altPositions = [];
        
        let altMatch;
        while ((altMatch = alternativeRegex.exec(content)) !== null) {
            const letter = altMatch[1] || altMatch[2];
            altPositions.push({
                letter: letter,
                index: altMatch.index,
                matchLength: altMatch[0].length
            });
        }
        
        // Se não encontrou alternativas, a questão pode ter imagem
        let hasImage = false;
        if (altPositions.length < 3) {
            hasImage = true;
        }
        
        // Extrair enunciado (antes da primeira alternativa)
        let enunciado = '';
        if (altPositions.length > 0) {
            enunciado = content.substring(0, altPositions[0].index).trim();
        } else {
            enunciado = content.trim();
        }
        
        // Extrair texto de cada alternativa
        for (let i = 0; i < altPositions.length; i++) {
            const current = altPositions[i];
            const next = altPositions[i + 1];
            
            const startIdx = current.index + current.matchLength;
            const endIdx = next ? next.index : content.length;
            
            const altText = content.substring(startIdx, endIdx).trim();
            alternatives[current.letter] = altText;
        }
        
        // Limpar enunciado
        enunciado = enunciado
            .replace(/\s+/g, ' ')
            .trim();
        
        // Montar objeto da questão
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
            resposta_correta: answers[questionNumber] || '',
            tem_imagem: hasImage
        };
        
        return question;
        
    } catch (error) {
        console.error(`Erro ao processar questão ${questionNumber}:`, error);
        return null;
    }
}

// Gerar arquivo Excel
async function generateExcel(questions) {
    // Preparar dados para o Excel
    const data = questions.map(q => ({
        'Número': q.numero,
        'Enunciado': q.enunciado,
        'A': q.alternativa_a,
        'B': q.alternativa_b,
        'C': q.alternativa_c,
        'D': q.alternativa_d,
        'E': q.alternativa_e,
        'F': q.alternativa_f,
        'G': q.alternativa_g,
        'H': q.alternativa_h,
        'I': q.alternativa_i,
        'J': q.alternativa_j,
        'Resposta Correta': q.resposta_correta,
        'Tem Imagem?': q.tem_imagem ? 'SIM' : 'NÃO'
    }));
    
    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar largura das colunas
    const colWidths = [
        { wch: 8 },  // Número
        { wch: 60 }, // Enunciado
        { wch: 40 }, // A
        { wch: 40 }, // B
        { wch: 40 }, // C
        { wch: 40 }, // D
        { wch: 40 }, // E
        { wch: 40 }, // F
        { wch: 40 }, // G
        { wch: 40 }, // H
        { wch: 40 }, // I
        { wch: 40 }, // J
        { wch: 15 }, // Resposta
        { wch: 12 }  // Imagem
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Questões');
    
    // Baixar arquivo
    const fileName = currentPdfFile.name.replace('.pdf', '') + '_processado.xlsx';
    XLSX.writeFile(wb, fileName);
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
