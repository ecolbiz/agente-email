// ==================== PONTO DE ENTRADA PRINCIPAL ====================

function organizarEmails(regrasSelecionadas) {
  Logger_.clear();

  var rulesToRun = (regrasSelecionadas && regrasSelecionadas.length)
    ? RULES.filter(function(r) { return regrasSelecionadas.indexOf(r.name) !== -1; })
    : RULES;

  if (rulesToRun.length === 0) {
    return { logs: ["⚠️ Nenhuma regra selecionada."], total: 0 };
  }

  Logger_.info("Rodando: " + rulesToRun.map(function(r) { return r.name; }).join(", "));

  var threads = buscarThreads("is:unread");

  if (threads.length === 0) {
    return { logs: ["📭 Nenhum e-mail não lido encontrado."], total: 0 };
  }

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    try {
      var message   = thread.getMessages()[0];
      var dados     = extrairDadosMensagem(message);
      var processed = false;

      for (var j = 0; j < rulesToRun.length; j++) {
        var rule = rulesToRun[j];
        if (rule.condition(thread, message)) {
          var resultado = rule.action(thread, message, dados.subject, dados.body);
          Logger_.rule(rule.name, dados.subject, resultado);
          processed = true;
          break;
        }
      }

      if (!processed && dados.isUnread) {
        var analysis = chamarIAComFallback(dados.subject, dados.body);
        if (analysis && analysis.categoria) {
          aplicarLabelSimples(thread, analysis.categoria);
          Logger_.ai("IA", analysis.categoria + " | " + dados.subject);
        }
      }
    } catch (e) {
      Logger_.error("Erro: " + e.toString());
    }

    Utilities.sleep(CONFIG.SLEEP_MS);
  }

  var logs = Logger_.getLogs();
  enviarResumoEmail(logs);
  return { logs: logs, total: threads.length };
}

// Retorna a lista de regras disponíveis para o dashboard
function getRules() {
  return RULES.map(function(r) { return r.name; });
}

// Verifica quais chaves de API estão configuradas no PropertiesService
function testarAPIs() {
  var resultado = {};
  try {
    var keys = getApiKeys();
    CONFIG.PROVIDERS_ORDER.forEach(function(p) {
      resultado[p] = keys[p] ? "ok" : "sem_chave";
    });
  } catch (e) {
    CONFIG.PROVIDERS_ORDER.forEach(function(p) { resultado[p] = "erro"; });
    resultado._erro = e.toString();
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Resumo por e-mail
// ---------------------------------------------------------------------------

function enviarResumoEmail(logs) {
  if (logs.length === 0) return;
  var data = new Date().toLocaleString("pt-BR");
  GmailApp.sendEmail(
    getEmailResumo(),
    "📧 Resumo de Organização de Emails — " + new Date().toLocaleDateString("pt-BR"),
    "",
    { htmlBody: buildSummaryHtml(logs, data) }
  );
}

// ---------------------------------------------------------------------------
// Dashboard Web — Deploy > Implantar como aplicativo da web
// ---------------------------------------------------------------------------

function doGet() {
  var html =
'<!DOCTYPE html>\n' +
'<html>\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <title>Agente de Emails</title>\n' +
'  <style>\n' +
'    *{box-sizing:border-box;margin:0;padding:0}\n' +
'    body{font-family:-apple-system,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px}\n' +
'    .card{background:#fff;border-radius:12px;padding:28px;width:100%;max-width:660px;box-shadow:0 2px 12px rgba(0,0,0,.08)}\n' +
'    h1{font-size:21px;color:#1a1a2e;margin-bottom:4px}\n' +
'    .sub{color:#888;font-size:13px;margin-bottom:22px}\n' +
'    .section-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}\n' +
'    .rules-box{border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:20px;min-height:48px}\n' +
'    .rule-item{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9}\n' +
'    .rule-item:last-child{border:none}\n' +
'    .rule-item label{font-size:13px;color:#334155;cursor:pointer;flex:1}\n' +
'    .rule-item input[type=checkbox]{width:15px;height:15px;cursor:pointer;accent-color:#4f46e5}\n' +
'    .btn-row{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}\n' +
'    button{padding:10px 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s}\n' +
'    button:hover{opacity:.85}\n' +
'    button:disabled{opacity:.4;cursor:not-allowed}\n' +
'    .btn-run{background:#4f46e5;color:#fff}\n' +
'    .btn-diag{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}\n' +
'    .btn-api{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}\n' +
'    #status{font-size:13px;color:#6b7280;margin-bottom:10px;min-height:20px}\n' +
'    #log-box{background:#0f172a;border-radius:8px;padding:16px;min-height:140px;max-height:400px;overflow-y:auto}\n' +
'    .log-empty{color:#475569;font-size:13px;font-style:italic}\n' +
'    .log-item{font-size:13px;color:#e2e8f0;padding:4px 0;border-bottom:1px solid #1e293b;line-height:1.5}\n' +
'    .log-item:last-child{border:none}\n' +
'    .api-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}\n' +
'    .api-badge{font-size:12px;padding:3px 10px;border-radius:20px;font-weight:600}\n' +
'    .api-ok{background:#dcfce7;color:#166534}\n' +
'    .api-err{background:#fee2e2;color:#991b1b}\n' +
'    .diag-thread{background:#1e293b;border-radius:6px;padding:10px 12px;margin-bottom:8px}\n' +
'    .diag-from{color:#94a3b8;font-size:11px;margin-bottom:2px}\n' +
'    .diag-subject{color:#e2e8f0;font-size:13px;font-weight:600;margin-bottom:4px}\n' +
'    .tag{font-size:11px;padding:2px 8px;border-radius:20px;display:inline-block;margin-right:4px}\n' +
'    .tag-match{background:#166534;color:#bbf7d0}\n' +
'    .tag-ai{background:#1e3a5f;color:#93c5fd}\n' +
'    .tag-none{background:#1e293b;color:#64748b}\n' +
'    .diag-labels{color:#64748b;font-size:11px;margin-top:4px}\n' +
'    .spinner{display:inline-block;width:13px;height:13px;border:2px solid #6b7280;border-top-color:#4f46e5;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:5px}\n' +
'    @keyframes spin{to{transform:rotate(360deg)}}\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'<div class="card">\n' +
'  <h1>&#x1F4EC; Agente de Emails</h1>\n' +
'  <p class="sub">Google Apps Script</p>\n' +
'  <div class="section-title">Regras disponíveis</div>\n' +
'  <div class="rules-box" id="rules-box"><div class="log-empty">Carregando regras...</div></div>\n' +
'  <div class="btn-row">\n' +
'    <button class="btn-run" onclick="rodar()">&#x25B6;&#xFE0F; Executar selecionadas</button>\n' +
'    <button class="btn-diag" onclick="diagnosticar()">&#x1F50D; Diagnóstico</button>\n' +
'    <button class="btn-api" onclick="testarAPIs()">&#x1F511; Testar APIs</button>\n' +
'  </div>\n' +
'  <div id="status">—</div>\n' +
'  <div id="log-box"><div class="log-empty">Os resultados aparecerão aqui.</div></div>\n' +
'</div>\n' +
'<script>\n' +
'  google.script.run.withSuccessHandler(function(names){\n' +
'    var box = document.getElementById("rules-box");\n' +
'    if (!names || !names.length) { box.innerHTML = "<span style=\\"color:#f87171\\">Nenhuma regra encontrada.</span>"; return; }\n' +
'    box.innerHTML = names.map(function(n,i){\n' +
'      return "<div class=\\"rule-item\\">" +\n' +
'        "<input type=\\"checkbox\\" id=\\"r"+i+"\\" value=\\""+n+"\\" checked>" +\n' +
'        "<label for=\\"r"+i+"\\">"+n+"</label></div>";\n' +
'    }).join("");\n' +
'  }).withFailureHandler(function(e){\n' +
'    document.getElementById("rules-box").innerHTML = "<span style=\\"color:#f87171\\">"+e.message+"</span>";\n' +
'  }).getRules();\n' +
'\n' +
'  function getSelected(){\n' +
'    return Array.from(document.querySelectorAll(".rule-item input:checked")).map(function(cb){return cb.value;});\n' +
'  }\n' +
'\n' +
'  function rodar(){\n' +
'    var sel = getSelected();\n' +
'    if (!sel.length) { setStatus("&#x26A0;&#xFE0F; Selecione ao menos uma regra.", false); return; }\n' +
'    setBusy("Executando: " + sel.join(", ") + "...");\n' +
'    google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onError).organizarEmails(sel);\n' +
'  }\n' +
'\n' +
'  function diagnosticar(){\n' +
'    setBusy("Lendo caixa (sem modificar)...");\n' +
'    google.script.run.withSuccessHandler(onDiag).withFailureHandler(onError).diagnosticar();\n' +
'  }\n' +
'\n' +
'  function testarAPIs(){\n' +
'    setBusy("Verificando chaves de API...");\n' +
'    google.script.run.withSuccessHandler(onAPIs).withFailureHandler(onError).testarAPIs();\n' +
'  }\n' +
'\n' +
'  function onSuccess(r){\n' +
'    var logs=r.logs||[], total=r.total||0;\n' +
'    setStatus("&#x2705; Concluído — "+total+" thread(s) · "+new Date().toLocaleTimeString("pt-BR"), false);\n' +
'    var box=document.getElementById("log-box");\n' +
'    box.innerHTML = logs.length\n' +
'      ? logs.map(function(l){return "<div class=\\"log-item\\">"+l+"</div>";}).join("")\n' +
'      : "<div class=\\"log-empty\\">Nenhuma ação registrada.</div>";\n' +
'    box.scrollTop=box.scrollHeight;\n' +
'  }\n' +
'\n' +
'  function onDiag(r){\n' +
'    var threads=r.threads||[];\n' +
'    setStatus("&#x1F50D; "+threads.length+" não lido(s) · "+r.timestamp, false);\n' +
'    var box=document.getElementById("log-box");\n' +
'    if (!threads.length){box.innerHTML="<div class=\\"log-empty\\">Caixa vazia.</div>";return;}\n' +
'    box.innerHTML=threads.map(function(t){\n' +
'      if(t.erro) return "<div class=\\"diag-thread\\" style=\\"color:#f87171\\">"+t.erro+"</div>";\n' +
'      var cls = t.regra!=="nenhuma"?"tag-match":"tag-ai";\n' +
'      var tag = t.regra!=="nenhuma"?t.regra:"→ IA geral";\n' +
'      return "<div class=\\"diag-thread\\">" +\n' +
'        "<div class=\\"diag-from\\">"+t.from+"</div>" +\n' +
'        "<div class=\\"diag-subject\\">"+t.subject+"</div>" +\n' +
'        "<span class=\\"tag "+cls+"\\">"+tag+"</span>" +\n' +
'        "<div class=\\"diag-labels\\">"+(t.labels.length?"Labels: "+t.labels.join(", "):"Sem labels")+"</div>" +\n' +
'      "</div>";\n' +
'    }).join("");\n' +
'  }\n' +
'\n' +
'  function onAPIs(r){\n' +
'    var order=["GEMINI","GROQ","CLAUDE","OPENAI"];\n' +
'    var badges=order.map(function(p){\n' +
'      var ok=r[p]==="ok";\n' +
'      return "<span class=\\"api-badge "+(ok?"api-ok":"api-err")+"\\">"+(ok?"✓":"✗")+" "+p+"</span>";\n' +
'    }).join("");\n' +
'    setStatus("&#x1F511; Status das chaves:", false);\n' +
'    var box=document.getElementById("log-box");\n' +
'    box.innerHTML="<div style=\\"padding:8px 0\\"><div class=\\"api-row\\">"+badges+"</div>" +\n' +
'      (r._erro?"<div style=\\"color:#f87171;font-size:12px;margin-top:8px\\">"+r._erro+"</div>":"") +\n' +
'      "<div style=\\"color:#64748b;font-size:12px;margin-top:12px\\">Chaves ausentes: configure em <strong>Configurações do projeto → Propriedades do script</strong> no GAS.</div></div>";\n' +
'  }\n' +
'\n' +
'  function onError(err){\n' +
'    setStatus("&#x274C; "+err.message, false);\n' +
'    document.getElementById("log-box").innerHTML="<div style=\\"color:#f87171;font-size:13px\\">"+err.message+"</div>";\n' +
'  }\n' +
'\n' +
'  function setBusy(msg){\n' +
'    document.querySelectorAll("button").forEach(function(b){b.disabled=true;});\n' +
'    document.getElementById("log-box").innerHTML="<div class=\\"log-empty\\"><span class=\\"spinner\\"></span>"+msg+"</div>";\n' +
'    document.getElementById("status").innerHTML="<span class=\\"spinner\\"></span>"+msg;\n' +
'  }\n' +
'  function setStatus(html, busy){\n' +
'    if (!busy) document.querySelectorAll("button").forEach(function(b){b.disabled=false;});\n' +
'    document.getElementById("status").innerHTML=html;\n' +
'  }\n' +
'<\/script>\n' +
'</body>\n' +
'</html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle("Agente de Emails")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
