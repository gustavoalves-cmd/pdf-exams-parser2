#!/usr/bin/env python3
"""
Servidor Web simples para o Processador de Provas COREME
Execute com: python3 server.py
Acesse em: http://localhost:5000
"""

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
import sys
import tempfile
import subprocess
import json
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='.')
CORS(app)

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/process', methods=['POST'])
def process_exam():
    try:
        # Verificar se o arquivo PDF foi enviado
        if 'pdf' not in request.files:
            return jsonify({'error': 'Nenhum arquivo PDF enviado'}), 400
        
        pdf_file = request.files['pdf']
        if pdf_file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        if not allowed_file(pdf_file.filename):
            return jsonify({'error': 'Apenas arquivos PDF são permitidos'}), 400
        
        # Verificar gabarito
        answer_key = request.form.get('answerKey', '')
        if not answer_key:
            return jsonify({'error': 'Gabarito não fornecido'}), 400
        
        # Salvar arquivo PDF temporário
        pdf_filename = secure_filename(pdf_file.filename)
        pdf_path = os.path.join(UPLOAD_FOLDER, pdf_filename)
        pdf_file.save(pdf_path)
        
        # Criar arquivo de gabarito temporário
        gabarito_path = os.path.join(UPLOAD_FOLDER, 'gabarito_temp.txt')
        with open(gabarito_path, 'w', encoding='utf-8') as f:
            f.write(answer_key)
        
        # Caminhos dos arquivos
        script_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(script_dir)
        process_script = os.path.join(parent_dir, 'exam-parser', 'process_exam.py')
        template_path = os.path.join(parent_dir, 'exam-parser', 'template_upload_prova.xlsx')
        output_path = os.path.join(UPLOAD_FOLDER, 'prova_processada.xlsx')
        
        # Verificar se o script existe
        if not os.path.exists(process_script):
            return jsonify({'error': f'Script process_exam.py não encontrado em {process_script}'}), 500
        
        if not os.path.exists(template_path):
            return jsonify({'error': f'Template Excel não encontrado em {template_path}'}), 500
        
        # Executar o script de processamento
        result = subprocess.run(
            ['python3', process_script, pdf_path, gabarito_path, template_path, output_path],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        # Limpar arquivos temporários
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        if os.path.exists(gabarito_path):
            os.remove(gabarito_path)
        
        if result.returncode != 0:
            error_msg = result.stderr if result.stderr else result.stdout
            return jsonify({'error': f'Erro ao processar: {error_msg}'}), 500
        
        # Verificar se o arquivo foi gerado
        if not os.path.exists(output_path):
            return jsonify({'error': 'Arquivo Excel não foi gerado'}), 500
        
        # Extrair informações da saída
        output_text = result.stdout
        
        # Extrair número de questões
        total_questions = 0
        warnings = []
        
        for line in output_text.split('\n'):
            if 'questões identificadas' in line.lower():
                try:
                    total_questions = int(line.split()[1])
                except:
                    pass
            elif 'contém imagem' in line.lower():
                warnings.append(line.strip())
        
        # Retornar resposta com caminho do arquivo
        return jsonify({
            'success': True,
            'downloadUrl': f'/download/{os.path.basename(output_path)}',
            'totalQuestions': total_questions,
            'warnings': warnings
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Tempo limite excedido. O PDF pode ser muito grande.'}), 500
    except Exception as e:
        return jsonify({'error': f'Erro inesperado: {str(e)}'}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'Arquivo não encontrado'}), 404
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name='prova_processada.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*70)
    print("  🚀 SERVIDOR PROCESSADOR DE PROVAS COREME")
    print("="*70)
    print("\n  ✅ Servidor iniciado com sucesso!")
    print(f"\n  🌐 Acesse em seu navegador:")
    print(f"     http://localhost:5000")
    print(f"\n  📌 Pressione CTRL+C para parar o servidor")
    print("\n" + "="*70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
