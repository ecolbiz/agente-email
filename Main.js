// ==================== CONFIGURAÇÃO - CHAVES API ====================
// No Main.js (mude para usar process.env)
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;

const API_KEYS = {
  GEMINI: geminiKey,
  CLAUDE: anthropicKey,
  OPENAI: openaiKey,
  GROQ:   groqKey
};



const PROVIDERS_ORDER = ["GEMINI", "GROQ", "CLAUDE", "OPENAI"];

const EMAIL_RESUMO_PARA = Session.getActiveUser().getEmail(); // seu email

// ==================== REGRAS (adicione aqui) ====================
const RULES = [
  {
    name: "Daycoval Seguros (Atual)",
    condition: (thread, message) => {
      const from = message.getFrom().toLowerCase();
      return from.includes("@daycovalseguros.com.br") || from.includes("daycoval");
    },
    action: processarDaycoval
  },
  {
    name: "Daycoval Seguros (Antigos)",
    condition: (thread, message) => {
      const from = message.getFrom().toLowerCase();
      const subject = message.getSubject().toLowerCase();
      return (from.includes("daycoval") || subject.includes("daycoval")) && !message.isUnread();
    },
    action: processarDaycovalAntigos
  }
  // Adicione novas regras aqui embaixo
];

// ==================== FUNÇÃO PRINCIPAL ====================
function organizarEmails(processarLidos = false) {
  console.log("🚀 Iniciando organização...");

  let query = "is:unread";
  if (processarLidos) query = "label:daycoval"; // para rodar nos antigos

  const threads = GmailApp.search(query, 0, 15);
  let logProcessamento = [];

  for (let thread of threads) {
    try {
      const message = thread.getMessages()[0];
      const subject = message.getSubject();
      const body = message.getPlainBody().substring(0, 4500);

      let processed = false;

      for (let rule of RULES) {
        if (rule.condition(thread, message)) {
          console.log(`🔧 Regra: ${rule.name} → ${subject}`);
          const resultado = rule.action(thread, message, subject, body);
          logProcessamento.push(`✅ ${rule.name} | ${subject} → ${resultado}`);
          processed = true;
          break;
        }
      }

      if (!processed) {
        // IA Geral só em não lidos
        if (message.isUnread()) {
          const analysis = chamarIAComFallback(subject, body);
          if (analysis && analysis.categoria) {
            aplicarLabelSimples(thread, analysis.categoria);
            logProcessamento.push(`🤖 IA Geral → ${analysis.categoria} | ${subject}`);
          }
        }
      }
    } catch (e) {
      console.log(`❌ Erro: ${e}`);
      logProcessamento.push(`❌ Erro em ${subject}`);
    }

    Utilities.sleep(1200);
  }

  enviarResumoEmail(logProcessamento);
  console.log("🏁 Finalizado!");
}

// ==================== PROCESSAMENTO DAYCOVAL ====================
function processarDaycoval(thread, message, subject, body) {
  let sub = "Geral";
  const s = subject.toLowerCase();

  if (s.includes("renovacao") || s.includes("renovação")) sub = "Renovacao";
  else if (s.includes("fatura") || s.includes("boleto") || s.includes("pagamento")) sub = "Financeiro";
  else if (s.includes("aviso") || s.includes("alerta") || s.includes("disco")) sub = "Avisos";

  const labelName = `Daycoval/${sub}`;
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) label = GmailApp.createLabel(labelName);

  thread.addLabel(label);
  thread.markRead();           // ← Marca como lido só aqui

  return labelName;
}

function processarDaycovalAntigos(thread, message, subject, body) {
  // Mesma lógica, mas sem marcar como lido automaticamente
  return processarDaycoval(thread, message, subject, body);
}

// ==================== OUTRAS FUNÇÕES (IA, etc) ====================
// Cole aqui as funções chamarIAComFallback, fazerRequisicao, aplicarLabelSimples 
// (da versão anterior que funcionou)

function chamarIAComFallback(subject, body) { /* ... */ }   // ← cole completa
function fazerRequisicao(url, payload, provider, extraHeaders = {}) { /* ... */ }
function aplicarLabelSimples(thread, categoria) { /* ... */ }

// ==================== RESUMO POR EMAIL ====================
function enviarResumoEmail(logs) {
  if (logs.length === 0) return;

  const html = `
    <h2>📊 Resumo de Processamento - ${new Date().toLocaleString('pt-BR')}</h2>
    <ul>${logs.map(l => `<li>${l}</li>`).join('')}</ul>
    <p><small>Executado via Google Apps Script</small></p>
  `;

  GmailApp.sendEmail(
    EMAIL_RESUMO_PARA,
    `📧 Resumo de Organização de Emails - ${new Date().toLocaleDateString('pt-BR')}`,
    "",
    { htmlBody: html }
  );
}

// ==================== DASHBOARD (PAINEL) ====================
function doGet() {
  const html = HtmlService.createHtmlOutput(`
    <h1>📬 Agente de Emails</h1>
    <button onclick="rodar()">▶️ Rodar agora (não lidos)</button>
    <button onclick="rodarAntigos()">🔄 Processar Daycoval Antigos</button>
    <hr>
    <pre id="log">Clique em um botão para executar...</pre>

    <script>
      function rodar() {
        google.script.run
          .withSuccessHandler(() => document.getElementById('log').innerHTML += '<br>✅ Execução finalizada!')
          .withFailureHandler(err => document.getElementById('log').innerHTML += '<br>❌ Erro: ' + err)
          .organizarEmails(false);
      }
      function rodarAntigos() {
        google.script.run
          .withSuccessHandler(() => document.getElementById('log').innerHTML += '<br>✅ Antigos processados!')
          .withFailureHandler(err => document.getElementById('log').innerHTML += '<br>❌ Erro: ' + err)
          .organizarEmails(true);
      }
    </script>
  `).setWidth(600).setHeight(500);
  
  return html;
}