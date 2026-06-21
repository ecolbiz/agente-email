// ==================== PONTO DE ENTRADA PRINCIPAL ====================

function organizarEmails(processarLidos) {
  Logger_.clear();
  Logger_.info("🚀 Iniciando organização...");

  const query   = processarLidos ? "label:daycoval" : "is:unread";
  const threads = buscarThreads(query);

  for (const thread of threads) {
    try {
      const message = thread.getMessages()[0];
      const dados   = extrairDadosMensagem(message);
      let processed = false;

      for (const rule of RULES) {
        if (rule.condition(thread, message)) {
          Logger_.info(`Regra: ${rule.name} → ${dados.subject}`);
          const resultado = rule.action(thread, message, dados.subject, dados.body);
          Logger_.rule(rule.name, dados.subject, resultado);
          processed = true;
          break;
        }
      }

      if (!processed && dados.isUnread) {
        const analysis = chamarIAComFallback(dados.subject, dados.body);
        if (analysis && analysis.categoria) {
          aplicarLabelSimples(thread, analysis.categoria);
        }
      }
    } catch (e) {
      Logger_.error(`Thread falhou: ${e.toString()}`);
    }

    Utilities.sleep(CONFIG.SLEEP_MS);
  }

  enviarResumoEmail(Logger_.getLogs());
  Logger_.info("🏁 Finalizado!");
}

// ---------------------------------------------------------------------------
// Resumo por e-mail
// ---------------------------------------------------------------------------

function enviarResumoEmail(logs) {
  if (logs.length === 0) return;

  const data     = new Date().toLocaleString("pt-BR");
  const htmlBody = buildSummaryHtml(logs, data);

  GmailApp.sendEmail(
    getEmailResumo(),
    `📧 Resumo de Organização de Emails — ${new Date().toLocaleDateString("pt-BR")}`,
    "",
    { htmlBody: htmlBody }
  );
}

// ---------------------------------------------------------------------------
// Dashboard Web (acessível via Deploy > Implantar como aplicativo da web)
// ---------------------------------------------------------------------------

function doGet() {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Agente de Emails</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 40px auto; }
        button { margin: 8px 4px; padding: 10px 20px; cursor: pointer; font-size: 14px; }
        #log { background: #f5f5f5; padding: 16px; border-radius: 6px; min-height: 80px; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <h1>📬 Agente de Emails</h1>
      <button onclick="rodar()">▶️ Rodar agora (não lidos)</button>
      <button onclick="rodarAntigos()">🔄 Processar Daycoval Antigos</button>
      <hr>
      <div id="log">Clique em um botão para executar...</div>
      <script>
        function rodar() {
          document.getElementById('log').innerText = '⏳ Executando...';
          google.script.run
            .withSuccessHandler(() => document.getElementById('log').innerText += '\\n✅ Execução finalizada!')
            .withFailureHandler(e  => document.getElementById('log').innerText += '\\n❌ Erro: ' + e.message)
            .organizarEmails(false);
        }
        function rodarAntigos() {
          document.getElementById('log').innerText = '⏳ Processando antigos...';
          google.script.run
            .withSuccessHandler(() => document.getElementById('log').innerText += '\\n✅ Antigos processados!')
            .withFailureHandler(e  => document.getElementById('log').innerText += '\\n❌ Erro: ' + e.message)
            .organizarEmails(true);
        }
      </script>
    </body>
    </html>
  `).setWidth(640).setHeight(520);
}
