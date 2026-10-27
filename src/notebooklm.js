export function generateNotebookLmDoc(db) {
  const kpis = db.getKpis();
  const projects = db.getAllProjects();
  const alexandreActions = db.getAllAlexandreActions();
  const now = new Date().toISOString().slice(0, 10);

  let md = `# Dossiê Executivo de Portfólio de Aplicações e Projetos\n\n`;
  md += `**Data da Síntese**: ${now}\n`;
  md += `**Ambiente**: c:\\desenv\\utils\n`;
  md += `**Sistema de Controle**: AppDevelopmentControl (Local LAN Dashboard)\n`;
  md += `**Destinatário**: Alexandre / Gerência de Desenvolvimento\n\n`;

  md += `> [!NOTE]\n`;
  md += `> Este documento foi gerado pelo sistema AppDevelopmentControl como fonte de dados (Source Document) para o **Google NotebookLM**. Ele consolida métricas técnicas dos **projetos únicos canônicos**, agrupando worktrees vinculadas e eliminando duplicidades de commits e histórico.\n\n`;

  md += `## 1. Panorama Geral do Portfólio (KPIs)\n\n`;
  md += `- **Total de Projetos Únicos**: ${kpis.totalProjects}\n`;
  md += `- **Worktrees / Ambientes de Trabalho Vinculados**: ${kpis.totalWorktrees}\n`;
  md += `- **Projetos Ativos no Mês**: ${kpis.activeProjectsMonth} (${Math.round((kpis.activeProjectsMonth / (kpis.totalProjects || 1)) * 100)}% do portfólio)\n`;
  md += `- **Total Histórico de Commits (Desduplicado)**: ${kpis.totalCommits.toLocaleString('pt-BR')}\n`;
  md += `- **Alterações Recentes**: ${kpis.commits24h} (24h) | ${kpis.commits7d} (7 dias) | ${kpis.commits30d} (30 dias)\n`;
  md += `- **Maturidade de Specs (SDD)**: ${kpis.doneSpecs} Desenvolvidas / ${kpis.totalSpecs} Totais (${Math.round((kpis.doneSpecs / (kpis.totalSpecs || 1)) * 100)}% concluídas)\n`;
  md += `- **Ações/Decisões Pendentes do Alexandre**: ${kpis.alexandreActionsCount} pontos críticos de atenção\n\n`;

  // Resumo de Saúde
  const activeCount = projects.filter(p => p.health_status === 'active').length;
  const blockedCount = projects.filter(p => p.health_status === 'blocked').length;
  const stableCount = projects.filter(p => p.health_status === 'stable').length;
  const staleCount = projects.filter(p => p.health_status === 'stale').length;
  const incubatingCount = projects.filter(p => p.health_status === 'incubating').length;

  md += `### Diagnóstico de Farol de Saúde (Health Status):\n`;
  md += `- 🟢 **Em Tração**: ${activeCount} projetos ativos\n`;
  md += `- 🟡 **Bloqueados / Atenção Alexandre**: ${blockedCount} projetos com decisões abertas\n`;
  md += `- ⚪ **Estáveis / Concluídos em Produção**: ${stableCount} ferramentas finalizadas\n`;
  md += `- ⚠️ **Em Risco / Dormentes**: ${staleCount} projetos parados com pendências\n`;
  md += `- 🟣 **Em Incubação**: ${incubatingCount} projetos embrionários\n\n`;

  md += `## 2. Pontos de Atenção Crítica: Decisões e Pendências do Alexandre\n\n`;
  md += `Abaixo estão listadas todas as decisões pendentes (\`PENDING DECISION\`), bloqueios ou itens aguardando deliberação direta do Alexandre nas specs:\n\n`;

  if (alexandreActions.length === 0) {
    md += `*Nenhuma pendência ou decisão crítica em aberto registrada no momento.*\n\n`;
  } else {
    const byProject = {};
    for (const a of alexandreActions) {
      if (!byProject[a.project_name]) byProject[a.project_name] = [];
      byProject[a.project_name].push(a);
    }

    for (const [pName, actions] of Object.entries(byProject)) {
      md += `### Projeto: ${pName} (${actions.length} pendências)\n`;
      for (const a of actions) {
        md += `- **Arquivo**: \`${a.file_path}\`${a.source_worktree ? ` *(Origem: ${a.source_worktree})*` : ''}\n`;
        md += `  - **Assunto**: ${a.title}\n`;
        if (a.snippet) {
          md += `  - *Contexto*: "${a.snippet}"\n`;
        }
      }
      md += `\n`;
    }
  }

  md += `## 3. Ficha Executiva Detalhada dos Projetos Únicos\n\n`;

  for (const p of projects) {
    const specsRatio = p.total_specs > 0 ? `${p.done_specs}/${p.total_specs} (${Math.round((p.done_specs / p.total_specs) * 100)}%)` : 'Sem specs';
    const initLocal = p.created_local ? p.created_local.slice(0, 10) : 'Não rastreado';
    const initGh = p.created_github ? p.created_github.slice(0, 10) : (p.github_url ? 'GitHub configurado' : 'Sem GitHub');

    md += `### ${p.name}\n\n`;
    md += `- **Saúde Gerencial**: ${p.health_status ? p.health_status.toUpperCase() : 'N/A'}${p.health_reason ? ` (${p.health_reason})` : ''}\n`;
    md += `- **Maturidade SDD**: **${p.sdd_score || 0}%** de aderência metodológica\n`;
    if (p.last_tag) md += `- **Última Tag de Checkpoint/Release**: \`${p.last_tag}\`${p.last_tag_date ? ` (${p.last_tag_date.slice(0, 10)})` : ''}\n`;
    if (p.last_agent) md += `- **Última Atuação Registrada**: ${p.last_agent}\n`;
    md += `- **Propósito da Aplicação**: ${p.purpose}\n`;
    md += `- **Início no Computador**: ${initLocal}\n`;
    md += `- **Início no GitHub**: ${initGh}\n`;
    if (p.github_url) md += `- **Repositório GitHub**: \`${p.github_url}\`\n`;
    md += `- **Cadência de Alterações**: 24h: ${p.changes_24h} | 7d: ${p.changes_7d} | 30d: ${p.changes_30d} | Total: ${p.changes_total}\n`;
    md += `- **Dias sem Alteração Atual**: ${p.days_since_last_change} dias\n`;
    md += `- **Maior Período Contínuo sem Alteração**: ${p.max_inactive_days} dias\n`;
    md += `- **Specs SDD**: ${specsRatio}\n`;

    if (p.worktrees && p.worktrees.length > 0) {
      md += `- **Worktrees Vinculadas (${p.worktrees.length})**:\n`;
      for (const wt of p.worktrees) {
        md += `  - \`${wt.name}\` (branch: \`${wt.branch}\`)\n`;
      }
    }

    if (p.alexandre_pending_count > 0) {
      md += `- **Atenção Gerencial**: Contém ${p.alexandre_pending_count} ações/decisões atribuídas ao Alexandre!\n`;
    }
    md += `\n---\n\n`;
  }

  md += `## 4. Roteiro Sugerido para Perguntas no NotebookLM\n\n`;
  md += `1. *"Gere um resumo em áudio executivo (Audio Overview) de 5 a 10 minutos destacando o ritmo de evolução dos projetos e os principais gargalos que exigem ação do Alexandre."*\n`;
  md += `2. *"Quais projetos estão com o maior volume de alterações nos últimos 30 dias e quais estão inativos há mais tempo?"*\n`;
  md += `3. *"Quais são as principais decisões arquiteturais pendentes descritas no documento e quais os impactos se não forem tomadas?"*\n`;
  md += `4. *"Apresente um resumo executivo em tópicos pronto para ser enviado por e-mail para a diretoria."*\n\n`;

  return md;
}
