# 🌐 Processador de Provas COREME - Interface Web

Interface web moderna e simples para processar provas em PDF e converter para Excel.

---

## 🚀 Instalação Rápida (3 passos)

### Passo 1: Instalar Dependências

Abra o terminal/prompt de comando na pasta do projeto e execute:

```bash
pip install -r requirements.txt --break-system-packages
```

Ou se estiver no Windows:
```bash
pip install -r requirements.txt
```

### Passo 2: Iniciar o Servidor

Execute o servidor:

```bash
python3 server.py
```

Ou no Windows:
```bash
python server.py
```

### Passo 3: Acessar a Interface

Abra seu navegador e acesse:

```
http://localhost:5000
```

---

## 📖 Como Usar a Interface Web

### 1️⃣ **Faça Upload do PDF**
- Clique na área de upload OU
- Arraste o arquivo PDF direto para a área

### 2️⃣ **Cole o Gabarito**
Aceita dois formatos:

**Formato 1: Separado por vírgulas**
```
32-A, 33-B, 34-C, 35-D, 36-A, 37-E
```

**Formato 2: Um por linha**
```
32: A
33: B
34: C
35: D
```

### 3️⃣ **Processar**
- Clique em "🚀 Processar Prova"
- Aguarde o processamento (pode levar alguns segundos)

### 4️⃣ **Baixar o Excel**
- Quando concluir, clique em "📥 Baixar Arquivo Excel"
- O arquivo será baixado automaticamente

---

## 📁 Estrutura dos Arquivos

```
exam-parser-web/
├── index.html          ← Interface web bonita
├── server.py           ← Servidor Flask
├── requirements.txt    ← Dependências
└── README.md          ← Este arquivo
```

---

## ⚙️ Requisitos do Sistema

- **Python 3.8+** instalado
- **pip** (gerenciador de pacotes Python)
- Navegador moderno (Chrome, Firefox, Edge, Safari)

---

## 🎯 Vantagens da Interface Web

✅ **Simples e Intuitiva**: Não precisa usar linha de comando  
✅ **Visual Moderna**: Design limpo e profissional  
✅ **Drag & Drop**: Arraste o PDF direto para a área  
✅ **Feedback Visual**: Veja o progresso em tempo real  
✅ **Detecção de Imagens**: Avisa quando há imagens nas questões  
✅ **Estatísticas**: Mostra quantas questões foram processadas  

---

## ⚠️ Avisos Importantes

### Questões com Imagens

O sistema **DETECTA** mas **NÃO EXTRAI** imagens do PDF.

Quando houver questões com imagens, você verá um aviso:
```
⚠️ Questão 24 contém imagem - adicione manualmente
```

**O que fazer:**
1. Abra o PDF original
2. Copie a imagem da questão
3. Cole no Excel gerado

### Limitações

✅ **Funciona:**
- PDFs com texto selecionável
- Questões numeradas (formato: "32.")
- Alternativas A até J

❌ **NÃO funciona:**
- PDFs escaneados (apenas imagem)
- PDFs protegidos/criptografados
- Extração automática de imagens

---

## 🔧 Solução de Problemas

### ❌ "Erro: Nenhum módulo chamado flask"

**Solução:** Instale as dependências:
```bash
pip install -r requirements.txt --break-system-packages
```

### ❌ "Porta 5000 já está em uso"

**Solução 1:** Encerre o processo que usa a porta  
**Solução 2:** Edite `server.py` e mude a linha:
```python
app.run(debug=True, host='0.0.0.0', port=8080)  # Mude 5000 para 8080
```

### ❌ "Script process_exam.py não encontrado"

**Causa:** A estrutura de pastas não está correta

**Estrutura correta:**
```
📁 projeto/
  ├── 📁 exam-parser/          ← Projeto original
  │   ├── process_exam.py
  │   ├── template_upload_prova.xlsx
  │   └── ...
  └── 📁 exam-parser-web/      ← Interface web
      ├── index.html
      ├── server.py
      └── ...
```

### ❌ Questões não foram identificadas

**Verifique:**
- O PDF tem texto selecionável? (teste selecionando texto com o mouse)
- As questões seguem o formato "32." ?
- O PDF não está protegido?

### ❌ Alternativas incompletas

**Solução:**
1. Complete manualmente no Excel
2. Revise a formatação do PDF original
3. Pode ser problema de formatação no PDF

---

## 💡 Dicas de Uso

### 📄 PDFs de Qualidade
- **Use PDFs gerados digitalmente** (não escaneados)
- Evite PDFs com OCR ruim
- Teste selecionando texto antes de processar

### ✍️ Gabarito
- Confira se o formato está correto
- Use sempre o número da questão seguido da alternativa
- Não precisa de espaços extras

### 📊 Revisão Final
**SEMPRE revise o Excel gerado:**
1. ✓ Todas as questões foram extraídas?
2. ✓ As alternativas estão completas?
3. ✓ As respostas corretas estão associadas?
4. ✓ Adicione imagens onde necessário

---

## 🔐 Segurança e Privacidade

✅ **100% Local**: Tudo roda no seu computador  
✅ **Sem Internet**: Não envia dados para servidores externos  
✅ **Arquivos Temporários**: Limpa automaticamente após processar  
✅ **Código Aberto**: Você pode revisar o código  

---

## 📞 Suporte

### Antes de pedir ajuda, verifique:

1. ✓ Python 3.8+ instalado?
2. ✓ Dependências instaladas?
3. ✓ PDF tem texto selecionável?
4. ✓ Gabarito no formato correto?
5. ✓ Estrutura de pastas correta?

### Se ainda tiver problemas:

1. Veja a aba "Console" do navegador (F12)
2. Leia a mensagem de erro completa
3. Verifique os logs no terminal onde o servidor roda

---

## 🎨 Personalizações

### Mudar a porta do servidor

Edite `server.py`, última linha:
```python
app.run(debug=True, host='0.0.0.0', port=NOVA_PORTA)
```

### Mudar cores da interface

Edite `index.html`, seção `<style>`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

---

## 📄 Formatos Aceitos

### PDF
- ✅ PDF com texto selecionável
- ❌ PDF escaneado (apenas imagem)
- ❌ PDF protegido

### Gabarito
- ✅ `32-A, 33-B, 34-C`
- ✅ `32: A` (um por linha)
- ❌ Outros formatos não suportados

---

## 🔄 Fluxo de Trabalho Recomendado

```
1. Receba o PDF da prova
2. Obtenha o gabarito oficial
3. Inicie o servidor (python3 server.py)
4. Acesse http://localhost:5000
5. Faça upload do PDF
6. Cole o gabarito
7. Clique em "Processar Prova"
8. Baixe o Excel
9. Revise e adicione imagens
10. Faça upload do Excel final
```

---

## 📦 O que está incluído

### Interface (`index.html`)
- Design moderno e responsivo
- Drag & Drop para upload
- Feedback visual do processamento
- Estatísticas de questões
- Download automático do Excel

### Servidor (`server.py`)
- API REST simples
- Upload de arquivos
- Processamento em background
- Limpeza automática de arquivos temporários

---

## 🚀 Atualizações Futuras

Possíveis melhorias:
- [ ] Upload múltiplo de PDFs
- [ ] Histórico de processamentos
- [ ] Pré-visualização do PDF
- [ ] Edição do gabarito na interface
- [ ] Exportar em outros formatos

---

## 📜 Licença

Uso interno - COREME

---

**Desenvolvido com ❤️ para facilitar o trabalho da equipe COREME**
