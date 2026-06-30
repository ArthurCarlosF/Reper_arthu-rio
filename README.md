# ReperArthuRio

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

O Apps Script e a planilha sao a fonte principal do repertorio. O `localStorage` e usado apenas como cache do navegador para manter a ultima lista carregada.

## Conteudo das cifras

Para letras e cifras de obras comerciais, adicione somente conteudo autoral, licenciado, de dominio publico, ou material que voce tenha direito de usar.
