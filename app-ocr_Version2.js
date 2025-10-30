// app-ocr.js
// Versão com OCR usando Tesseract.js + extração com PDF.js + export XLSX com SheetJS

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const logEl = document.getElementById('log');
const langSelect = document.getElementById('langSelect');
const forceOcrCheckbox = document.getElementById('forceOcr');

let currentFile = null;
fileInput.addEventListener('change', (ev) => {
  currentFile = ev.target.files && ev.target.files[0];
  processBtn.disabled = !currentFile;
  log(`Arquivo selecionado: ${currentFile ? currentFile.name : 'nenhum'}`);
});

processBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  processBtn.disabled = true;
  status('Iniciando...');
  try {
    const arrayBuffer = await readFileAsArrayBuffer(currentFile);
    status('Carregando PDF (PDF.js)...');
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    log(`PDF com ${numPages} página(s)`);

    // Tenta extrair texto com PDF.js (rápido). Se falhar/forçar, roda OCR.
    status('Extraindo texto com PDF.js...');
    let extractedText = await extractTextFromPDF(pdf, (p, total) => {
      status(`Extraindo páginas: ${p}/${total}`);
    });

    const MIN_TEXT_LENGTH = 50; // se o texto for muito curto, consideramos como "sem texto"
    const wantOCR = forceOcrCheckbox.checked || (extractedText.trim().length < MIN_TEXT_LENGTH);
    if (wantOCR) {
      log('Texto extraído insuficiente ou OCR forçado. Iniciando OCR (Tesseract.js)...');
      const lang = langSelect.value || 'eng';
      // Executa OCR página a página (renderiza cada página em canvas)
      extractedText = await ocrPdfWithTesseract(pdf, lang, (p, total, progressMsg) => {
        status(`OCR: página ${p}/${total} ${progressMsg ? '- ' + progressMsg : ''}`);
      });
    } else {
      log('Texto extraído suficiente; OCR pulado.');
    }

    previewEl.value = extractedText.slice(0, 20000);
    status('Parsing do texto...');
    const rows = parseExamText(extractedText);
    log(`Linhas extraídas: ${rows.length}`);
    status('Gerando Excel...');
    downloadXLSX(rows, currentFile.name.replace(/\.pdf$/i, '') + '-extracted.xlsx');
    status('Concluído');
  } catch (err) {
    console.error(err);
    log('Erro: ' + (err.message || err));
    status('Erro');
  } finally {
    processBtn.disabled = false;
  }
});

function status(msg) {
  statusEl.textContent = msg;
}
function log(msg) {
  const now = new Date().toLocaleTimeString();
  logEl.innerText += `[${now}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsArrayBuffer(file);
  });
}

async function extractTextFromPDF(pdf, onProgress) {
  const numPages = pdf.numPages;
  let fullText = '';
  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(i, numPages);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(it => it.str).join(' ');
    fullText += '\n===PAGE ' + i + '===\n' + pageText + '\n';
  }
  return fullText;
}

async function ocrPdfWithTesseract(pdf, lang = 'eng', onProgress) {
  // Cria worker do Tesseract
  const worker = Tesseract.createWorker({
    // logger: m => log(`Tesseract: ${JSON.stringify(m)}`) // opcional detalhamento
    logger: m => {
      if (m.status && m.progress !== undefined) {
        // m.progress é número 0..1
        const percent = Math.round(m.progress * 100);
        if (onProgress && m.jobId) {
          // jobId tem info, mas simplificamos
          onProgress(``, pdf.numPages, `${m.status} (${percent}%)`);
        } else {
          onProgress(``, pdf.numPages, `${m.status} (${percent}%)`);
        }
      } else if (m.status) {
        onProgress(``, pdf.numPages, m.status);
      }
    }
  });

  await worker.load();
  // Carrega o idioma (Tesseract baixa os tessdata automaticamente da CDN do tesseract.js)
  try {
    await worker.loadLanguage(lang);
    await worker.initialize(lang);
  } catch (e) {
    log(`Erro ao carregar/initializar idioma Tesseract ("${lang}"): ${e.message || e}. Tentando 'eng'...`);
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
  }

  const numPages = pdf.numPages;
  let fullText = '';
  for (let i = 1; i <= numPages; i++) {
    onProgress(i, numPages, 'renderizando página');
    const page = await pdf.getPage(i);
    // Renderiza a página para um canvas (maior escala => melhor OCR)
    const scale = 2.0; // aumente se precisar de melhor qualidade (custa mais tempo)
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    onProgress(i, numPages, 'executando OCR');
    const { data: { text } } = await worker.recognize(canvas);
    fullText += '\n===PAGE ' + i + '===\n' + text + '\n';
    log(`OCR: página ${i} concluída (aprox ${Math.round(text.length/100)} unidades de texto)`);
  }

  await worker.terminate();
  return fullText;
}

/*
  parseExamText(text)
  - Mesma função básica do exemplo anterior; ajuste conforme o layout do seu PDF
*/
function parseExamText(text) {
  const normalized = text.replace(/\r/g, '\n').replace(/\n{2,}/g, '\n');
  const questionStartRegex = /(^|\n)\s*(\d{1,3})[\.\)\-]\s*/g;
  const starts = [];
  let m;
  while ((m = questionStartRegex.exec(normalized)) !== null) {
    starts.push({ index: m.index + m[1].length, num: m[2], matchEnd: questionStartRegex.lastIndex });
  }
  const rows = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].matchEnd;
    const end = i + 1 < starts.length ? starts[i + 1].index : normalized.length;
    const block = normalized.slice(start, end).trim();

    const optionRegex = /([A-Z])[\.\)\-]\s*/g;
    const options = {};
    const optionPositions = [];
    let om;
    while ((om = optionRegex.exec(block)) !== null) {
      optionPositions.push({ key: om[1], pos: om.index + om[0].length });
    }
    for (let j = 0; j < optionPositions.length; j++) {
      const key = optionPositions[j].key;
      const startPos = optionPositions[j].pos;
      const endPos = j + 1 < optionPositions.length ? optionPositions[j + 1].pos - optionPositions[j + 1].key.length - 2 : block.length;
      let optText = block.slice(startPos, endPos).trim();
      optText = optText.replace(/\s+/g, ' ');
      options[key] = optText;
    }

    let questionText = block;
    if (optionPositions.length) {
      questionText = block.slice(0, optionPositions[0].pos - (optionPositions[0].key.length + 2)).trim();
    } else {
      questionText = block.split(/(?:Resposta|Gabarito|Answer)[:\s]/i)[0].trim();
    }
    const answerMatch = block.match(/(?:Resposta|Gabarito|Answer)[:\s]*([A-D])/i);
    const answer = answerMatch ? answerMatch[1].toUpperCase() : '';

    rows.push({
      number: starts[i].num,
      question: questionText.replace(/\s+/g, ' '),
      A: options['A'] || '',
      B: options['B'] || '',
      C: options['C'] || '',
      D: options['D'] || '',
      answer: answer
    });
  }

  return rows;
}

function downloadXLSX(rows, filename) {
  if (!rows || rows.length === 0) {
    rows = [{ number: '', question: '', A: '', B: '', C: '', D: '', answer: '' }];
  }
  const ws = XLSX.utils.json_to_sheet(rows, { header: ['number','question','A','B','C','D','answer'] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Exams');
  XLSX.writeFile(wb, filename);
}