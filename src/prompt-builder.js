// ==================== CONSTRUTOR DE PROMPTS ====================

function buildCategorizationPrompt(subject, body, availableLabels) {
  var labelInstrucao = (availableLabels && availableLabels.length)
    ? "Escolha EXATAMENTE uma destas labels (copie o nome sem alterações): " + availableLabels.join(" | ")
    : 'Sugira uma categoria curta (ex: "Marketing", "Suporte", "Pessoal", "Financeiro")';

  return "Você é um assistente de organização de e-mails.\n\n" +
    "Analise o e-mail abaixo e retorne SOMENTE um JSON válido com:\n" +
    '- "categoria": ' + labelInstrucao + "\n" +
    '- "prioridade": "alta" | "media" | "baixa"\n' +
    '- "resumo": string de até 80 caracteres\n\n' +
    "Assunto: " + subject + "\n\n" +
    "Corpo:\n" + body + "\n\n" +
    "Responda apenas com JSON, sem explicações.";
}

function buildSummaryHtml(logs, dataExecucao) {
  const itens = logs.map(l => `<li style="margin:4px 0">${l}</li>`).join('');
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2c3e50">📊 Resumo de Processamento</h2>
      <p style="color:#7f8c8d;font-size:13px">${dataExecucao}</p>
      <ul style="padding-left:20px">${itens}</ul>
      <hr style="border:none;border-top:1px solid #eee">
      <p style="color:#bdc3c7;font-size:11px">Executado via Google Apps Script</p>
    </div>
  `;
}
