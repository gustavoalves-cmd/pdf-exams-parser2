#!/bin/bash

echo "========================================"
echo " PROCESSADOR DE PROVAS COREME - WEB"
echo "========================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python3 não encontrado!"
    echo "Por favor, instale Python 3.8+ primeiro"
    exit 1
fi
echo "[OK] Python3 encontrado!"
echo ""

# Instalar dependências
echo "Instalando dependências..."
pip3 install -r requirements.txt --break-system-packages --quiet
if [ $? -ne 0 ]; then
    echo "[AVISO] Tentando sem --break-system-packages..."
    pip3 install -r requirements.txt --quiet
fi
echo "[OK] Dependências instaladas!"
echo ""

# Iniciar servidor
echo "Iniciando servidor..."
echo ""
echo "========================================"
echo " Acesse no navegador:"
echo " http://localhost:5000"
echo "========================================"
echo ""
echo "Pressione CTRL+C para parar o servidor"
echo ""

python3 server.py
