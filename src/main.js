// ==================== PONTO DE ENTRADA PRINCIPAL ====================

function organizarEmails(regrasSelecionadas) {
  Logger_.clear();

  var dynRules = [];
  try {
    dynRules = getDynamicRules()
      .filter(function(r) { return r.enabled !== false; })
      .map(function(r) { return { _dynamic: true, id: r.id, name: r.name, conditions: r.conditions, logic: r.logic, dynAction: r.action }; });
  } catch(e) {}

  var allRules = dynRules.concat(RULES); // RULES = [Geral (IA)]

  var rulesToRun = (regrasSelecionadas && regrasSelecionadas.length)
    ? allRules.filter(function(r) { return regrasSelecionadas.indexOf(r.name) !== -1; })
    : allRules;

  if (!rulesToRun.length) {
    return { logs: ["⚠️ Nenhuma regra selecionada."], total: 0 };
  }

  var globalConfig = {};
  try { globalConfig = getGlobalConfig(); } catch(e) {}

  var maxThreads = globalConfig.maxThreads || CONFIG.MAX_THREADS;
  var sleepMs    = globalConfig.sleepMs    || CONFIG.SLEEP_MS;

  var availableLabels = [];
  try { availableLabels = GmailApp.getUserLabels().map(function(l) { return l.getName(); }); } catch(e) {}

  var threads = buscarThreads(maxThreads);
  if (!threads.length) {
    return { logs: ["📭 Nenhum e-mail não lido no inbox."], total: 0 };
  }

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    try {
      var messages = thread.getMessages();

      for (var j = 0; j < rulesToRun.length; j++) {
        var rule = rulesToRun[j];

        if (rule.action === null) {
          // Geral (IA): usa a última mensagem não lida (ou a última do thread)
          var msgIA = messages[messages.length - 1];
          for (var m = messages.length - 1; m >= 0; m--) {
            if (messages[m].isUnread()) { msgIA = messages[m]; break; }
          }
          var dadosIA  = extrairDadosMensagem(msgIA);
          var analysis = chamarIAComFallback(dadosIA.subject, dadosIA.body, availableLabels);
          if (analysis && analysis.categoria) {
            aplicarLabel(thread, analysis.categoria);
            marcarProcessado(thread);
            Logger_.ai("IA", analysis.categoria + " | " + dadosIA.subject);
          }
          break;
        }

        if (rule._dynamic) {
          var matchMsg = null;
          for (var m = 0; m < messages.length; m++) {
            if (avaliarCondicaoDinamica(messages[m], rule.conditions, rule.logic)) {
              matchMsg = messages[m]; break;
            }
          }
          if (!matchMsg) continue;

          var dados     = extrairDadosMensagem(matchMsg);
          var dynAction = rule.dynAction || {};
          var resultado = "ok";

          (dynAction.labels || []).forEach(function(labelName) { aplicarLabel(thread, labelName); });

          if (dynAction.encaminhar) {
            try {
              matchMsg.forward(dynAction.encaminhar);
              resultado += " | encaminhado → " + dynAction.encaminhar;
            } catch(fe) {
              Logger_.error("Falha ao encaminhar para " + dynAction.encaminhar + ": " + fe.toString());
            }
          }

          if (dynAction.arquivar) arquivarThread(thread);
          marcarProcessado(thread);

          var info = (dynAction.labels || []).length ? dynAction.labels.join(", ") : "(sem label)";
          Logger_.rule(rule.name, dados.subject, resultado + " | " + info);
          break;
        }
      }
    } catch (e) {
      Logger_.error("Erro: " + e.toString());
    }

    Utilities.sleep(sleepMs);
  }

  var logs = Logger_.getLogs();
  enviarResumoEmail(logs);
  return { logs: logs, total: threads.length };
}

// ---------------------------------------------------------------------------
// Funções expostas ao dashboard
// ---------------------------------------------------------------------------

function getRules() {
  var dynNames = [];
  try {
    dynNames = getDynamicRules()
      .filter(function(r) { return r.enabled !== false; })
      .map(function(r) { return r.name; });
  } catch(e) {}
  return dynNames.concat(RULES.map(function(r) { return r.name; }));
}

function getLabelsDisponiveis() {
  return GmailApp.getUserLabels()
    .map(function(l) { return l.getName(); })
    .sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
}

function getDynamicRules() {
  var stored = PropertiesService.getScriptProperties().getProperty("DYNAMIC_RULES");
  return stored ? JSON.parse(stored) : [];
}

function saveDynamicRules(rules) {
  PropertiesService.getScriptProperties().setProperty("DYNAMIC_RULES", JSON.stringify(rules));
  return true;
}

function getGlobalConfig() {
  var stored   = PropertiesService.getScriptProperties().getProperty("GLOBAL_CONFIG");
  var defaults = { maxThreads: CONFIG.MAX_THREADS, sleepMs: CONFIG.SLEEP_MS };
  if (!stored) return defaults;
  var parsed = JSON.parse(stored);
  return { maxThreads: parsed.maxThreads || defaults.maxThreads, sleepMs: parsed.sleepMs || defaults.sleepMs };
}

function salvarGlobalConfig(config) {
  PropertiesService.getScriptProperties().setProperty("GLOBAL_CONFIG", JSON.stringify(config));
  return true;
}

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
  if (!logs.length) return;
  GmailApp.sendEmail(
    getEmailResumo(),
    "📧 Resumo de Organização de Emails — " + new Date().toLocaleDateString("pt-BR"),
    "",
    { htmlBody: buildSummaryHtml(logs, new Date().toLocaleString("pt-BR")) }
  );
}

// ---------------------------------------------------------------------------
// Dashboard Web
// ---------------------------------------------------------------------------

function doGet() {
  return HtmlService.createTemplateFromFile("src/dashboard")
    .evaluate()
    .setTitle("Agente de Emails " + VERSION)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
