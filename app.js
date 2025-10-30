// app.js - Processador Universal de Provas (VERSÃO 5.0 - ML-Enhanced)
// Versão com detecção inteligente e adaptativa para múltiplos formatos de PDF
// Melhorias: Detecção multi-padrão, análise contextual, e aprendizado adaptativo

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ===========================
// SISTEMA DE DETECÇÃO INTELIGENTE
// ===========================

class IntelligentQuestionParser {
    constructor() {
        // Padrões de detecção de questões (ordem de prioridade)
        this.patterns = [
            // Padrão 1: {01} ou {1} com chaves (USP 2024)
            {
                name: 'chaves',
                regex: /\{(\d{1,3})\}/g,
                confidence: 0.95,
                validator: (num, text) => num >= 1 && num <= 200
            },
            // Padrão 2: 01. ou 1. no início de linha
            {
                name: 'ponto_inicio',
                regex: /(?:^|\n)\s*(\d{1,3})\.\s+/g,
                confidence: 0.9,
                validator: (num, text) => num >= 1 && num <= 200 && text.length > 20
            },
            // Padrão 3: QUESTÃO 01 ou Questão 1
            {
                name: 'questao_palavra',
                regex: /(?:^|\n)\s*(?:QUESTÃO|Questão|questão)\s*(\d{1,3})/gi,
                confidence: 0.95,
                validator: (num) => num >= 1 && num <= 200
            },
            // Padrão 4: 01) ou 1) no início
            {
                name: 'parentese',
                regex: /(?:^|\n)\s*(\d{1,3})\)\s+/g,
                confidence: 0.85,
                validator: (num, text) => num >= 1 && num <= 200 && text.length > 20
            },
            // Padrão 5: Q01 ou Q1
            {
                name: 'q_numero',
                regex: /(?:^|\n)\s*Q(\d{1,3})\s+/gi,
                confidence: 0.9,
                validator: (num) => num >= 1 && num <= 200
            },
            // Padrão 6: [01] ou [1] com colchetes
            {
                name: 'colchetes',
                regex: /\[(\d{1,3})\]/g,
                confidence: 0.85,
                validator: (num) => num >= 1 && num <= 200
            }
        ];
        
        // Padrões de alternativas (múltiplos formatos)
        this.alternativePatterns = [
            { regex: /\(([A-E])\)\s*/g, priority: 1 },
            { regex: /(?:^|\n)\s*([A-E])\)\s*/gm, priority: 2 },
            { regex: /(?:^|\n)\s*([A-E])\.\s*/gm, priority: 3 },
            { regex: /\[([A-E])\]/g, priority: 4 },
            { regex: /(?:^|\n)\s*([A-E])\s*[-–]\s*/gm, priority: 5 }
        ];
        
        // Palavras-chave que indicam início de questão
        this.questionKeywords = [
            // Português
            'homem', 'mulher', 'paciente', 'criança', 'lactente', 'recém-nascido', 'adolescente',
            'gestante', 'puérpera', 'idoso', 'senhor', 'senhora', 'menino', 'menina',
            'assinale', 'marque', 'indique', 'qual', 'quais', 'quanto', 'quantos',
            'sobre', 'acerca', 'referente', 'considerando', 'com base', 'segundo',
            'de acordo', 'em relação', 'durante', 'após', 'antes', 'quando',
            'um', 'uma', 'o', 'a', 'no', 'na', 'do', 'da',
            // Termos médicos comuns
            'diagnóstico', 'tratamento', 'conduta', 'exame', 'procedimento',
            'medicamento', 'droga', 'fármaco', 'cirurgia', 'operação'
        ];
        
        // Estatísticas de detecção (para aprendizado)
        this.detectionStats = {
            patternsUsed: {},
            averageQuestionLength: 0,
            totalQuestions: 0
        };
    }
    
    // Método principal de parsing
    parse(text, gabarito = {}) {
        console.log('🧠 Iniciando detecção inteligente de questões...');
        
        // Limpar texto
        const cleaned = this.cleanText(text);
        
        // Detectar formato do documento
        const format = this.detectFormat(cleaned);
        console.log(`📄 Formato detectado: ${format.name} (confiança: ${format.confidence})`);
        
        // Extrair questões usando o melhor padrão
        const questions = this.extractQuestions(cleaned, format, gabarito);
        
        // Atualizar estatísticas
        this.updateStats(questions);
        
        // Log de resultados
        console.log(`✅ Total de questões detectadas: ${questions.length}`);
        if (questions.length > 0) {
            console.log('🔍 Primeira questão:', questions[0]);
            console.log('🔍 Última questão:', questions[questions.length - 1]);
        }
        
        return questions;
    }
    
    // Detectar formato do documento
    detectFormat(text) {
        const formats = [];
        
        // Testar cada padrão
        for (const pattern of this.patterns) {
            pattern.regex.lastIndex = 0;
            const matches = [...text.matchAll(pattern.regex)];
            
            if (matches.length > 0) {
                // Validar sequencialidade
                const numbers = matches
                    .map(m => parseInt(m[1]))
                    .filter(n => pattern.validator(n, text))
                    .sort((a, b) => a - b);
                
                // Calcular score baseado em sequencialidade
                let sequentialScore = 0;
                for (let i = 1; i < Math.min(numbers.length, 10); i++) {
                    if (numbers[i] === numbers[i-1] + 1) {
                        sequentialScore++;
                    }
                }
                
                const confidence = pattern.confidence * 
                    (matches.length / 100) * 
                    (sequentialScore / 10 + 0.5);
                
                formats.push({
                    name: pattern.name,
                    pattern: pattern,
                    matches: matches.length,
                    confidence: Math.min(confidence, 1),
                    numbers: numbers
                });
            }
        }
        
        // Ordenar por confiança
        formats.sort((a, b) => b.confidence - a.confidence);
        
        // Se nenhum formato detectado, usar padrão default
        if (formats.length === 0) {
            console.warn('⚠️ Nenhum formato específico detectado, usando padrão genérico');
            return {
                name: 'generico',
                pattern: this.patterns[1], // padrão de ponto
                confidence: 0.5,
                matches: 0
            };
        }
        
        return formats[0];
    }
    
    // Limpar texto
    cleanText(text) {
        return text
            // Remover marcas d'água comuns
            .replace(/pcimarkpci\s+[A-Za-z0-9+/=:]+/g, '')
            .replace(/www\.[a-z]+\.com\.br/gi, '')
            // Remover headers/footers comuns
            .replace(/Processo Seletivo.+?PROVA [A-Z]\d+/gi, '')
            .replace(/Página \d+ de \d+/gi, '')
            .replace(/Confidencial.+?aplicação/gi, '')
            // Remover códigos de prova
            .replace(/[A-Z]{2,}\d{4}\/\d{3}-[A-Z]+/g, '')
            // Normalizar espaços e quebras
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s+/g, ' ')
            // Preservar quebras importantes
            .replace(/(\d{1,3}[.)}\]])\s*\n\s*/g, '$1\n');
    }
    
    // Extrair questões
    extractQuestions(text, format, gabarito) {
        const questions = [];
        const pattern = format.pattern || this.patterns[1];
        
        // Resetar regex
        pattern.regex.lastIndex = 0;
        
        // Encontrar todas as questões
        const matches = [...text.matchAll(pattern.regex)];
        const validMatches = [];
        
        // Filtrar e validar matches
        for (const match of matches) {
            const num = parseInt(match[1]);
            
            if (pattern.validator(num, text)) {
                validMatches.push({
                    number: num,
                    index: match.index,
                    match: match[0]
                });
            }
        }
        
        // Remover duplicatas (manter primeira ocorrência)
        const uniqueMatches = [];
        const seenNumbers = new Set();
        
        for (const vm of validMatches) {
            if (!seenNumbers.has(vm.number)) {
                seenNumbers.add(vm.number);
                uniqueMatches.push(vm);
            }
        }
        
        // Ordenar por número
        uniqueMatches.sort((a, b) => a.number - b.number);
        
        // Processar cada questão
        for (let i = 0; i < uniqueMatches.length; i++) {
            const current = uniqueMatches[i];
            const next = uniqueMatches[i + 1];
            
            const startIdx = current.index;
            const endIdx = next ? next.index : text.length;
            
            const questionBlock = text.substring(startIdx, endIdx);
            const parsed = this.parseQuestionBlock(questionBlock, current.number, gabarito);
            
            if (parsed) {
                questions.push(parsed);
            }
        }
        
        // Tentar encontrar questões faltando
        if (questions.length < 100 && questions.length > 50) {
            console.log('🔍 Procurando questões faltantes...');
            this.findMissingQuestions(text, questions, gabarito);
        }
        
        return questions;
    }
    
    // Parsear bloco de questão individual
    parseQuestionBlock(block, number, gabarito) {
        try {
            // Remover marcador da questão
            let content = block
                .replace(/^\s*\{?\d{1,3}\}?\s*[.)]\s*/g, '')
                .trim();
            
            // Detectar alternativas
            const alternatives = this.extractAlternatives(content);
            
            // Extrair enunciado (antes das alternativas)
            let statement = content;
            if (alternatives.firstIndex !== -1) {
                statement = content.substring(0, alternatives.firstIndex).trim();
            }
            
            // Limpar enunciado
            statement = statement
                .replace(/\n+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Validar tamanho mínimo
            if (statement.length < 20 && !alternatives.hasAlternatives) {
                return null;
            }
            
            // Detectar se tem imagem/gráfico
            const hasImage = this.detectImage(content, alternatives.hasAlternatives);
            
            // Obter resposta do gabarito
            const answerLetter = gabarito[number] || '';
            
            // Montar questão final
            return {
                numero: number,
                enunciado: statement,
                alternativa_a: alternatives.options['A'] || '',
                alternativa_b: alternatives.options['B'] || '',
                alternativa_c: alternatives.options['C'] || '',
                alternativa_d: alternatives.options['D'] || '',
                alternativa_e: alternatives.options['E'] || '',
                resposta_correta: answerLetter,
                tem_imagem: hasImage,
                formato_detectado: alternatives.patternUsed
            };
            
        } catch (error) {
            console.error(`⚠️ Erro ao processar questão ${number}:`, error);
            return null;
        }
    }
    
    // Extrair alternativas com detecção inteligente
    extractAlternatives(content) {
        let bestResult = {
            options: {},
            hasAlternatives: false,
            firstIndex: -1,
            patternUsed: 'none'
        };
        
        // Testar cada padrão de alternativa
        for (const pattern of this.alternativePatterns) {
            pattern.regex.lastIndex = 0;
            const matches = [...content.matchAll(pattern.regex)];
            
            if (matches.length >= 3) { // Mínimo 3 alternativas
                const options = {};
                let firstIndex = Infinity;
                
                for (const match of matches) {
                    const letter = match[1].toUpperCase();
                    const startIdx = match.index + match[0].length;
                    
                    // Encontrar próxima alternativa ou fim
                    let endIdx = content.length;
                    for (const nextMatch of matches) {
                        if (nextMatch.index > match.index && nextMatch.index < endIdx) {
                            endIdx = nextMatch.index;
                        }
                    }
                    
                    const text = content.substring(startIdx, endIdx)
                        .trim()
                        .replace(/\n+/g, ' ')
                        .replace(/\s+/g, ' ');
                    
                    options[letter] = text;
                    firstIndex = Math.min(firstIndex, match.index);
                }
                
                // Verificar se é sequencial (A, B, C...)
                const letters = Object.keys(options).sort();
                const isSequential = letters.length >= 3 && 
                    ['A', 'B', 'C'].every(l => letters.includes(l));
                
                if (isSequential) {
                    bestResult = {
                        options: options,
                        hasAlternatives: true,
                        firstIndex: firstIndex,
                        patternUsed: pattern.regex.toString()
                    };
                    break; // Usar primeiro padrão que funciona
                }
            }
        }
        
        return bestResult;
    }
    
    // Detectar se questão tem imagem
    detectImage(content, hasAlternatives) {
        // Indicadores de imagem
        const imageIndicators = [
            /figura/i,
            /imagem/i,
            /gráfico/i,
            /tabela/i,
            /quadro/i,
            /diagrama/i,
            /esquema/i,
            /ilustração/i,
            /foto/i,
            /radiografia/i,
            /tomografia/i,
            /ultrassom/i,
            /ecg/i,
            /eletrocardiograma/i,
            /exame de imagem/i,
            /a seguir/i,
            /abaixo/i,
            /acima/i
        ];
        
        // Se não tem alternativas, provavelmente tem imagem
        if (!hasAlternatives) {
            return true;
        }
        
        // Verificar indicadores no texto
        for (const indicator of imageIndicators) {
            if (indicator.test(content)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Procurar questões faltantes
    findMissingQuestions(text, existingQuestions, gabarito) {
        const existingNumbers = new Set(existingQuestions.map(q => q.numero));
        const maxNumber = Math.max(...existingNumbers);
        
        for (let num = 1; num <= maxNumber; num++) {
            if (!existingNumbers.has(num)) {
                console.log(`🔍 Procurando questão ${num} faltante...`);
                
                // Tentar padrões alternativos
                const patterns = [
                    new RegExp(`\\b${num}\\s*[.)\\]}]\\s*([^\\n]{20,})`, 'g'),
                    new RegExp(`\\{${num}\\}\\s*([^\\n]{20,})`, 'g'),
                    new RegExp(`questão\\s+${num}\\b`, 'gi')
                ];
                
                for (const pattern of patterns) {
                    const match = pattern.exec(text);
                    if (match) {
                        console.log(`✅ Encontrada questão ${num} com padrão alternativo`);
                        
                        // Extrair bloco da questão
                        const startIdx = match.index;
                        let endIdx = text.length;
                        
                        // Procurar próxima questão
                        for (let nextNum = num + 1; nextNum <= maxNumber + 1; nextNum++) {
                            const nextPattern = new RegExp(`\\b${nextNum}\\s*[.)\\]}]`, 'g');
                            const nextMatch = nextPattern.exec(text.substring(startIdx));
                            if (nextMatch) {
                                endIdx = startIdx + nextMatch.index;
                                break;
                            }
                        }
                        
                        const questionBlock = text.substring(startIdx, endIdx);
                        const parsed = this.parseQuestionBlock(questionBlock, num, gabarito);
                        
                        if (parsed) {
                            existingQuestions.push(parsed);
                        }
                        break;
                    }
                }
            }
        }
        
        // Re-ordenar questões
        existingQuestions.sort((a, b) => a.numero - b.numero);
    }
    
    // Atualizar estatísticas (para "aprendizado")
    updateStats(questions) {
        if (questions.length > 0) {
            this.detectionStats.totalQuestions = questions.length;
            
            // Calcular tamanho médio das questões
            const totalLength = questions.reduce((sum, q) => 
                sum + (q.enunciado ? q.enunciado.length : 0), 0);
            this.detectionStats.averageQuestionLength = 
                Math.round(totalLength / questions.length);
            
            // Registrar formatos detectados
            questions.forEach(q => {
                const format = q.formato_detectado || 'unknown';
                this.detectionStats.patternsUsed[format] = 
                    (this.detectionStats.patternsUsed[format] || 0) + 1;
            });
            
            console.log('📊 Estatísticas de detecção:', this.detectionStats);
        }
    }
}

// ===========================
// CÓDIGO PRINCIPAL DO APP
// ===========================

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
let intelligentParser = new IntelligentQuestionParser();

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
        
        // Passo 2: Extrair texto com melhor preservação de formato
        showProgress(30, `Extraindo texto (${numPages} páginas)...`);
        extractedText = await extractTextEnhanced(pdf);
        
        console.log('📄 Texto extraído:', extractedText.length, 'caracteres');
        console.log('📄 Preview:', extractedText.substring(0, 1000));
        
        // Passo 3: Parse do gabarito
        showProgress(50, 'Processando gabarito...');
        const answers = parseAnswerKey(answerKey);
        
        console.log('✅ Gabarito parseado:', Object.keys(answers).length, 'respostas');
        
        // Passo 4: Parse inteligente das questões
        showProgress(60, 'Aplicando detecção inteligente...');
        const questions = intelligentParser.parse(extractedText, answers);
        
        if (questions.length === 0) {
            showStatus('⚠️ Nenhuma questão foi identificada. Tentando método alternativo...', 'warning');
            
            // Tentar método legado como fallback
            const legacyQuestions = parseQuestionsLegacy(extractedText, answers);
            if (legacyQuestions.length > 0) {
                questions.push(...legacyQuestions);
                console.log('✅ Método legado encontrou:', legacyQuestions.length, 'questões');
            }
        }
        
        if (questions.length === 0) {
            showStatus('⚠️ Não foi possível identificar questões. Verifique o formato do PDF.', 'error');
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

// Extrair texto com melhor preservação
async function extractTextEnhanced(pdf) {
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Agrupar items por linha (baseado em posição Y)
        const lines = {};
        let lastY = null;
        
        textContent.items.forEach(item => {
            const y = Math.round(item.transform[5]);
            
            if (!lines[y]) {
                lines[y] = [];
            }
            lines[y].push(item);
        });
        
        // Ordenar linhas por Y (de cima para baixo)
        const sortedYs = Object.keys(lines)
            .map(y => parseFloat(y))
            .sort((a, b) => b - a);
        
        // Construir texto preservando estrutura
        let pageText = '';
        for (const y of sortedYs) {
            const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
            const lineText = lineItems.map(item => item.str).join(' ');
            
            if (lineText.trim()) {
                pageText += lineText + '\n';
            }
        }
        
        fullText += pageText + '\n\n';
        
        // Atualizar progresso
        const progress = 30 + ((pageNum / numPages) * 20);
        showProgress(progress, `Extraindo página ${pageNum}/${numPages}...`);
    }
    
    return fullText;
}

// Parse do gabarito
function parseAnswerKey(answerKeyText) {
    const answers = {};
    
    const normalized = answerKeyText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    
    // Tentar diferentes formatos
    
    // Formato 1: "01-A, 02-B" ou "01:A, 02:B"
    let matches = normalized.match(/(\d+)\s*[-:]\s*([A-E])/gi);
    if (matches && matches.length > 0) {
        matches.forEach(match => {
            const parts = match.match(/(\d+)\s*[-:]\s*([A-E])/i);
            if (parts) {
                const num = parseInt(parts[1]);
                const answer = parts[2].toUpperCase();
                answers[num] = answer;
            }
        });
        return answers;
    }
    
    // Formato 2: Apenas letras separadas por vírgula ou espaço
    const letters = normalized.match(/[A-E]/gi);
    if (letters && letters.length > 0) {
        letters.forEach((letter, index) => {
            answers[index + 1] = letter.toUpperCase();
        });
        return answers;
    }
    
    // Formato 3: Números (1-5) representando alternativas
    const numbers = normalized.match(/[1-5]/g);
    if (numbers && numbers.length > 0) {
        const letterMap = {'1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'};
        numbers.forEach((num, index) => {
            answers[index + 1] = letterMap[num] || '';
        });
    }
    
    return answers;
}

// Método legado de parsing (fallback)
function parseQuestionsLegacy(text, answers) {
    const questions = [];
    
    // Padrão simples: número + ponto
    const pattern = /(?:^|\n)\s*(\d{1,3})\.\s+([^\n]+)/g;
    const matches = [...text.matchAll(pattern)];
    
    matches.forEach((match, index) => {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 200) {
            const nextMatch = matches[index + 1];
            const startIdx = match.index;
            const endIdx = nextMatch ? nextMatch.index : text.length;
            
            const block = text.substring(startIdx, endIdx);
            const enunciado = block
                .replace(/^\s*\d{1,3}\.\s*/, '')
                .replace(/\([A-E]\).*/gs, '')
                .trim()
                .substring(0, 500);
            
            if (enunciado.length > 20) {
                questions.push({
                    numero: num,
                    enunciado: enunciado,
                    alternativa_a: '',
                    alternativa_b: '',
                    alternativa_c: '',
                    alternativa_d: '',
                    alternativa_e: '',
                    resposta_correta: answers[num] || '',
                    tem_imagem: false
                });
            }
        }
    });
    
    return questions;
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
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5
    };
    
    const data = questions.map(q => ({
        'numero': q.numero,
        'questao': q.enunciado,
        'alternativa_correta': letterToNumber[q.resposta_correta] || null,
        'alternativa1': q.alternativa_a || null,
        'alternativa2': q.alternativa_b || null,
        'alternativa3': q.alternativa_c || null,
        'alternativa4': q.alternativa_d || null,
        'alternativa5': q.alternativa_e || null
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data, {
        header: ['numero', 'questao', 'alternativa_correta', 
                 'alternativa1', 'alternativa2', 'alternativa3', 
                 'alternativa4', 'alternativa5']
    });
    
    // Ajustar larguras das colunas
    const colWidths = [
        { wch: 8 },   // numero
        { wch: 80 },  // questao
        { wch: 10 },  // alternativa_correta
        { wch: 60 },  // alternativa1
        { wch: 60 },  // alternativa2
        { wch: 60 },  // alternativa3
        { wch: 60 },  // alternativa4
        { wch: 60 }   // alternativa5
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Questões');
    
    const fileName = currentPdfFile.name.replace('.pdf', '') + '_processado_v5.xlsx';
    XLSX.writeFile(wb, fileName);
    
    console.log('📊 Excel gerado:', fileName);
}

console.log('🚀 Processador Universal de Provas v5.0 carregado com sucesso!');
console.log('🧠 Sistema de detecção inteligente ativado');
