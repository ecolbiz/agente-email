// ==================== PONTO DE ENTRADA PRINCIPAL ====================

function organizarEmails(processarLidos) {
  Logger_.clear();
  Logger_.info("Iniciando organização...");

  const query   = processarLidos ? "label:daycoval" : "is:unread";
  const threads = buscarThreads(query);

  if (threads.length === 0) {
    return { logs: ["📭 Nenhum e-mail encontrado para processar."], total: 0 };
  }

  for (const thread of threads) {
    try {
      const message = thread.getMessages()[0];
      const dados   = extrairDadosMensagem(message);
      let processed = false;

      for (const rule of RULES) {
        if (rule.condition(thread, message)) {
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
          Logger_.ai("IA", `${analysis.categoria} | ${dados.subject}`);
        } else {
          Logger_.warn(`Sem classificação: ${dados.subject}`);
        }
      }
    } catch (e) {
      Logger_.error(`Erro: ${e.toString()}`);
    }

    Utilities.sleep(CONFIG.SLEEP_MS);
  }

  const logs = Logger_.getLogs();
  enviarResumoEmail(logs);

  return { logs: logs, total: threads.length };
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
// Dashboard Web — Deploy > Implantar como aplicativo da web
// ---------------------------------------------------------------------------

function doGet() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Agente de Emails</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 32px 16px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; width: 100%; max-width: 580px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    h1 { font-size: 22px; color: #1a1a2e; margin-bottom: 6px; }
    .subtitle { color: #888; font-size: 13px; margin-bottom: 24px; }
    .btn-group { display: flex; gap: 10px; margin-bottom: 24px; }
    button { flex: 1; padding: 11px 16px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
    button:hover { opacity: .85; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary { background: #4f46e5; color: #fff; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    #status { font-size: 13px; color: #6b7280; margin-bottom: 10px; min-height: 20px; }
    #log-box { background: #0f172a; border-radius: 8px; padding: 16px; min-height: 180px; max-height: 380px; overflow-y: auto; }
    .log-empty { color: #475569; font-size: 13px; font-style: italic; }
    .log-item { font-size: 13px; color: #e2e8f0; padding: 3px 0; border-bottom: 1px solid #1e293b; line-height: 1.5; }
    .log-item:last-child { border: none; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 20px; margin-right: 6px; }
    .badge-total { background: #1e293b; color: #94a3b8; float: right; font-weight: 500; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #6b7280; border-top-color: #4f46e5; border-radius: 50%; animation: spin .7s linear infinite; vertical-align: middle; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
<div class="card">
  <h1>📬 Agente de Emails</h1>
  <p class="subtitle">Google Apps Script — organização automática da caixa de entrada</p>

  <div class="btn-group">
    <button class="btn-primary" id="btn-unread" onclick="rodar(false)">▶️ Não lidos</button>
    <button class="btn-secondary" id="btn-old" onclick="rodar(true)">🔄 Daycoval Antigos</button>
  </div>

  <div id="status">Clique em um botão para executar.</div>

  <div id="log-box">
    <div class="log-empty" id="log-empty">Os logs aparecerão aqui após a execução.</div>
  </div>
</div>

<script>
  function rodar(processarLidos) {
    setBusy(true, processarLidos ? "Processando antigos..." : "Processando não lidos...");
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onError)
      .organizarEmails(processarLidos);
  }

  function onSuccess(result) {
    setBusy(false);
    const logs  = result.logs || [];
    const total = result.total || 0;
    const box   = document.getElementById('log-box');

    document.getElementById('status').innerHTML =
      '✅ Concluído — <strong>' + total + '</strong> thread(s) processada(s) · ' + new Date().toLocaleTimeString('pt-BR');

    if (logs.length === 0) {
      box.innerHTML = '<div class="log-empty">Nenhuma ação registrada.</div>';
      return;
    }

    box.innerHTML = '<span class="badge badge-total">' + logs.length + ' eventos</span>' +
      logs.map(function(l) { return '<div class="log-item">' + l + '</div>'; }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function onError(err) {
    setBusy(false);
    document.getElementById('status').innerHTML = '❌ Erro: ' + err.message;
    document.getElementById('log-box').innerHTML =
      '<div style="color:#f87171;font-size:13px">' + err.message + '</div>';
  }

  function setBusy(busy, msg) {
    var btns = document.querySelectorAll('button');
    btns.forEach(function(b) { b.disabled = busy; });
    document.getElementById('log-box').innerHTML = busy
      ? '<div class="log-empty"><span class="spinner"></span>' + (msg || 'Executando...') + '</div>'
      : '';
    document.getElementById('status').innerHTML = busy
      ? '<span class="spinner"></span>' + (msg || 'Executando...')
      : '';
  }
</script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle("Agente de Emails")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
