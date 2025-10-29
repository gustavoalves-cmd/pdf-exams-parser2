@echo off
echo ========================================
echo  PROCESSADOR DE PROVAS COREME - WEB
echo ========================================
echo.
echo Verificando dependencias...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado!
    echo Por favor, instale Python 3.8+ de python.org
    pause
    exit /b 1
)
echo [OK] Python encontrado!
echo.
echo Instalando dependencias...
pip install -r requirements.txt --quiet --break-system-packages
if errorlevel 1 (
    echo [AVISO] Tentando sem --break-system-packages...
    pip install -r requirements.txt --quiet
)
echo [OK] Dependencias instaladas!
echo.
echo Iniciando servidor...
echo.
echo ========================================
echo  Acesse no navegador:
echo  http://localhost:5000
echo ========================================
echo.
python server.py
pause
