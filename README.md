# Repertorio Arthu-rio

Site estatico para GitHub Pages com cadastro de repertorio, letra e cifras por instrumento.

## Como publicar no GitHub Pages

1. Envie este projeto para `https://github.com/ArthurCarlosF/Reper_arthu-rio.git`.
2. No GitHub, abra **Settings > Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch principal e a pasta `/root`.

## Backend com Google Apps Script

1. Crie uma planilha no Google Sheets.
2. Abra **Extensions > Apps Script**.
3. Cole o conteudo de `apps-script/Code.gs`.
4. Clique em **Deploy > New deployment > Web app**.
5. Configure:
   - **Execute as**: Me
   - **Who has access**: Anyone
6. Copie a URL do Web App.
7. Em `app.js`, cole a URL em `APP_SCRIPT_URL`.

O site funciona sem backend usando `localStorage`. Com `APP_SCRIPT_URL` configurado, ele usa o Apps Script para listar e salvar musicas na planilha.

## Conteudo das cifras

As musicas iniciais foram cadastradas apenas com titulo e artista. Para letras e cifras de obras comerciais, adicione somente conteudo autoral, licenciado, de dominio publico, ou material que voce tenha direito de usar.
