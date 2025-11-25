@echo off

echo Iniciando o Servidor do Gerador de Escala...

echo (Uma janela do navegador abrira automaticamente. Voce pode fechar esta janela preta quando terminar de usar o app.)



REM Muda o diretorio para a pasta onde este arquivo (.bat) esta localizado

cd /d %~dp0



REM Inicia o aplicativo e abre o navegador

npm run dev -- --open