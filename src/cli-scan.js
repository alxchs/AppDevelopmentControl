import { AppDb } from './db.js';
import { ProjectScanner } from './scanner.js';

console.log('--- Iniciando Varredura Executiva de Projetos ---');
const db = new AppDb();
const scanner = new ProjectScanner(db);

const startTime = Date.now();
const projects = scanner.scanAll();
const duration = Date.now() - startTime;

console.log(`Varredura concluída em ${duration}ms! Total de projetos catalogados: ${projects.length}`);

const kpis = db.getKpis();
console.log('KPIs do Portfólio:', JSON.stringify(kpis, null, 2));

const alexandreActions = db.getAllAlexandreActions();
console.log(`Ações pendentes do Alexandre encontradas: ${alexandreActions.length}`);
for (const a of alexandreActions.slice(0, 5)) {
  console.log(` - [${a.project_name}] ${a.title}`);
}

