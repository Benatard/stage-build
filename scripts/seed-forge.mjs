import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const env = {};
const envPath = path.join(root, '.env.local');

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

for (const key of ['VITE_FORGE_API_URL', 'VITE_FORGE_PROJECT_KEY', 'VITE_FORGE_API_KEY']) {
  if (!env[key]) throw new Error(`Variable manquante: ${key}`);
}

const base = `${env.VITE_FORGE_API_URL.replace(/\/$/, '')}/${env.VITE_FORGE_PROJECT_KEY}`;
const headers = {
  'x-api-key': env.VITE_FORGE_API_KEY,
  'Content-Type': 'application/json',
};
const passwordHash = '$2b$10$OCmWQ3i6Vhg8NwwGX2ACNOzfA4RY.4no32RPKjoMkrMIT55W0vLu2';

function flatten(row) {
  return { id: row.id, ...(row.data ?? {}) };
}

async function request(table, method = 'GET', { id, query, body } = {}) {
  let url = `${base}/${table}`;
  if (id) url += `/${id}`;
  if (query) url += `?${query}`;
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new Error(`${method} /${table}${id ? `/${id}` : ''} -> ${error.message}`);
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    throw new Error(`${method} /${table} -> ${response.status}: ${text}`);
  }
  return payload;
}

async function listAll(table) {
  const rows = [];
  for (let offset = 0; offset < 4000; offset += 200) {
    const payload = await request(table, 'GET', { query: `limit=200&offset=${offset}` });
    const batch = Array.isArray(payload?.data) ? payload.data : [];
    rows.push(...batch.map(flatten));
    if (batch.length < 200) break;
  }
  return rows;
}

async function createRow(table, data) {
  const payload = await request(table, 'POST', { body: data });
  return flatten(payload?.data ?? payload);
}

async function updateRow(table, id, data) {
  const payload = await request(table, 'PATCH', { id, body: data });
  return flatten(payload?.data ?? payload);
}

async function sql(query) {
  return request('sql', 'POST', { body: { sql: query } });
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function normalize(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase());
  if (value === undefined || value === null) return [];
  return String(value).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function gradeQuestions(questions, answers) {
  let score = 0;
  let maxScore = 0;
  for (const question of questions) {
    maxScore += question.points;
    const answer = answers[question.id];
    if (answer === undefined || answer === null) continue;
    const expected = normalize(question.correct_answer);
    if (question.type === 'multiple') {
      const selected = normalize(answer);
      if (selected.length === expected.length && expected.every((item) => selected.includes(item))) {
        score += question.points;
      }
    } else if (expected.includes(String(answer).trim().toLowerCase())) {
      score += question.points;
    }
  }
  return { score, maxScore, percentage: maxScore ? Math.round((score / maxScore) * 10000) / 100 : 0 };
}

function makeAnswers(questions, correctness) {
  const answers = {};
  questions.forEach((question, index) => {
    if (correctness[index]) {
      answers[question.id] = question.correct_answer;
      return;
    }
    if (question.type === 'multiple') {
      answers[question.id] = [];
      return;
    }
    answers[question.id] = question.options.find((option) => option !== question.correct_answer) ?? 'Réponse à revoir';
  });
  return answers;
}

async function ensureUser(user) {
  const users = await listAll('users');
  const existing = users.find((item) => item.email === user.email);
  if (existing) return existing;
  return createRow('users', { ...user, password_hash: passwordHash });
}

async function deleteTableRows(table) {
  const rows = await listAll(table);
  for (const row of rows) {
    await request(table, 'DELETE', { id: row.id });
  }
  return rows.length;
}

async function reset() {
  const existingUsers = await listAll('users');
  for (const user of existingUsers) {
    if (user.stagiaire_id) {
      await updateRow('users', user.id, { stagiaire_id: null });
    }
  }
  const tables = [
    'audit_logs',
    'notifications',
    'documents',
    'bulletins',
    'final_evaluations',
    'final_projects',
    'stage_journal',
    'stage_objectives',
    'intermediate_evaluations',
    'improvement_actions',
    'improvement_plans',
    'observations',
    'comportements',
    'implications',
    'competence_levels',
    'competences',
    'travaux_soumissions',
    'travaux_pratiques',
    'qcm_attempts',
    'qcm_questions',
    'notes',
    'evaluations',
    'presences',
    'seances',
    'affectations',
    'reservations',
    'inscriptions',
    'stagiaires',
    'promotions',
    'modules',
    'formations',
  ];
  let removed = 0;
  for (const table of tables) {
    try {
      removed += await deleteTableRows(table);
    } catch (error) {
      if (table !== 'reservations') throw error;
    }
  }
  const users = await listAll('users');
  for (const user of users) {
    try {
      await sql(`DELETE FROM user_roles WHERE user_id = '${user.id}'`);
    } catch {}
    if (user.email === 'admin@stagebuild.local') continue;
    await request('users', 'DELETE', { id: user.id });
    removed += 1;
  }
  console.log(`Reset terminé: ${removed} ligne(s) supprimée(s).`);
}

async function main() {
  const formations = await listAll('formations');
  if (formations.some((item) => item.name === 'Développement Web Full-Stack')) {
    console.log('Seed déjà présent. Aucune donnée insérée.');
    return;
  }

  const settings = await listAll('settings');
  const organization = settings.find((item) => item.key === 'organization');
  if (organization) {
    await updateRow('settings', organization.id, {
      value: {
        name: 'StageBuild',
        email: 'contact@stagebuild.cd',
        phone: '+243 970 000 000',
        address: 'Lubumbashi, Haut-Katanga, RDC',
        logo_url: '/images/logo-stagebuild.svg',
      },
      description: 'Identité de l’organisation affichée dans les documents et l’interface.',
    });
  }

  const existingUsers = await listAll('users');
  const admin = existingUsers.find((item) => item.email === 'admin@stagebuild.local');
  if (!admin) throw new Error('Compte administrateur introuvable.');
  await updateRow('users', admin.id, {
    first_name: 'Admin',
    last_name: 'StageBuild',
    role: 'admin',
    statut: 'active',
  });

  const users = {};
  users.direction = await ensureUser({
    email: 'direction@stagebuild.local',
    first_name: 'Claude',
    last_name: 'Mukendi',
    phone: '+243 970 200 001',
    role: 'direction',
    statut: 'active',
    last_login_at: '2026-10-24T07:30:00.000Z',
  });
  users.formation = await ensureUser({
    email: 'resp.formation@stagebuild.local',
    first_name: 'Bernadette',
    last_name: 'Kabeya',
    phone: '+243 970 200 002',
    role: 'responsable_formation',
    statut: 'active',
    last_login_at: '2026-10-24T08:10:00.000Z',
  });
  users.pedagogie = await ensureUser({
    email: 'resp.pedagogique@stagebuild.local',
    first_name: 'Étienne',
    last_name: 'Mulumba',
    phone: '+243 970 200 003',
    role: 'responsable_pedagogique',
    statut: 'active',
    last_login_at: '2026-10-24T09:00:00.000Z',
  });
  users.formateurDev = await ensureUser({
    email: 'formateur.dev@stagebuild.local',
    first_name: 'Amani',
    last_name: 'Nkulu',
    phone: '+243 970 200 004',
    role: 'formateur',
    statut: 'active',
    last_login_at: '2026-10-24T06:55:00.000Z',
  });
  users.formateurData = await ensureUser({
    email: 'formateur.data@stagebuild.local',
    first_name: 'Grâce',
    last_name: 'Ilunga',
    phone: '+243 970 200 005',
    role: 'formateur',
    statut: 'active',
    last_login_at: '2026-10-24T07:20:00.000Z',
  });
  users.maitre = await ensureUser({
    email: 'maitre.stage@stagebuild.local',
    first_name: 'Patrick',
    last_name: 'Mwamba',
    phone: '+243 970 200 006',
    role: 'maitre_stage',
    statut: 'active',
    last_login_at: '2026-10-23T15:30:00.000Z',
  });
  users.administration = await ensureUser({
    email: 'administration@stagebuild.local',
    first_name: 'Sylvie',
    last_name: 'Kanku',
    phone: '+243 970 200 007',
    role: 'administration',
    statut: 'active',
    last_login_at: '2026-10-24T07:45:00.000Z',
  });
  users.stagiaire = await ensureUser({
    email: 'stagiaire@stagebuild.local',
    first_name: 'Sarah',
    last_name: 'Mwamba',
    phone: '+243 970 100 101',
    role: 'stagiaire',
    statut: 'active',
    last_login_at: '2026-10-24T10:15:00.000Z',
  });
  users.rh = await ensureUser({
    email: 'rh@stagebuild.local',
    first_name: 'Nadine',
    last_name: 'Tshibangu',
    phone: '+243 970 200 008',
    role: 'rh',
    statut: 'active',
    last_login_at: '2026-10-24T08:40:00.000Z',
  });
  users.auditeur = await ensureUser({
    email: 'auditeur@stagebuild.local',
    first_name: 'Marc',
    last_name: 'Kalonji',
    phone: '+243 970 200 009',
    role: 'auditeur',
    statut: 'active',
    last_login_at: '2026-10-22T13:05:00.000Z',
  });

  console.log('Étape 1/14: utilisateurs prêts.');

  const formationsByKey = {};
  formationsByKey.dev = await createRow('formations', {
    name: 'Développement Web Full-Stack',
    description: 'Parcours intensif de développement web moderne, de l’algorithmique au déploiement d’API.',
    duration_months: 6,
    objectives: 'Former des développeurs capables de concevoir, développer et déployer une application web complète.',
    level: 'Intermédiaire',
    domain: 'Développement logiciel',
    program: 'Algorithmique · HTML/CSS · JavaScript · React · Node.js · Bases de données · Git · Projet final',
    status: 'active',
    created_by: users.formation.id,
  });
  formationsByKey.data = await createRow('formations', {
    name: 'Data Analyse & Business Intelligence',
    description: 'Parcours orienté analyse de données, SQL avancé, visualisation et aide à la décision.',
    duration_months: 5,
    objectives: 'Rendre les stagiaires autonomes dans la collecte, le nettoyage et la restitution de données.',
    level: 'Intermédiaire',
    domain: 'Data & Business Intelligence',
    program: 'Python · SQL avancé · Power BI · Statistiques · Projet data',
    status: 'active',
    created_by: users.formation.id,
  });
  formationsByKey.cyber = await createRow('formations', {
    name: 'Réseaux & Cybersécurité',
    description: 'Ancien parcours en cours de révision, conservé pour l’archivage pédagogique.',
    duration_months: 4,
    objectives: 'Comprendre les fondamentaux des réseaux et les bases de la sécurité des systèmes.',
    level: 'Débutant',
    domain: 'Infrastructure & Sécurité',
    program: 'Réseaux · Sécurité des systèmes',
    status: 'archivee',
    created_by: users.formation.id,
  });

  const modules = {};
  const moduleSeed = [
    ['algo', formationsByKey.dev.id, 'Algorithmique et structures de données', 60, 2, 1, users.formateurDev.id, ['Résoudre un problème algorithmique'], ['interrogation', 'devoir', 'examen'], 'active'],
    ['html', formationsByKey.dev.id, 'HTML & CSS', 40, 1, 2, users.formateurDev.id, ['Structurer une page avec HTML/CSS'], ['interrogation', 'devoir'], 'active'],
    ['javascript', formationsByKey.dev.id, 'JavaScript moderne', 60, 2, 3, users.formateurDev.id, ['Manipuler le DOM et les données'], ['interrogation', 'qcm', 'examen'], 'active'],
    ['react', formationsByKey.dev.id, 'React & interfaces', 80, 3, 4, users.formateurDev.id, ['Développer une interface React'], ['devoir', 'travail_pratique', 'projet'], 'active'],
    ['node', formationsByKey.dev.id, 'Node.js & services', 70, 2, 5, users.formateurDev.id, ['Construire un service backend'], ['travail_pratique', 'presentation'], 'active'],
    ['database', formationsByKey.dev.id, 'Bases de données relationnelles', 50, 2, 6, users.formateurDev.id, ['Modéliser une base de données'], ['interrogation', 'examen'], 'active'],
    ['git', formationsByKey.dev.id, 'Git & collaboration', 20, 1, 7, users.formateurDev.id, ['Utiliser Git et GitHub'], ['evaluation_competence'], 'active'],
    ['api', formationsByKey.dev.id, 'API REST avancée', 40, 2, 8, users.formateurDev.id, ['Concevoir une API REST'], ['devoir', 'evaluation_orale'], 'active'],
    ['dev-project', formationsByKey.dev.id, 'Projet final Full-Stack', 80, 3, 9, users.formateurDev.id, ['Livrer une application complète'], ['projet', 'evaluation_finale'], 'active'],
    ['python', formationsByKey.data.id, 'Python pour la data', 60, 2, 1, users.formateurData.id, ['Explorer des données avec Python'], ['interrogation', 'travail_pratique'], 'active'],
    ['sql', formationsByKey.data.id, 'SQL avancé', 50, 2, 2, users.formateurData.id, ['Écrire des requêtes SQL avancées'], ['qcm', 'examen'], 'active'],
    ['powerbi', formationsByKey.data.id, 'Power BI & dataviz', 50, 2, 3, users.formateurData.id, ['Construire un tableau de bord Power BI'], ['travail_pratique', 'presentation'], 'active'],
    ['stats', formationsByKey.data.id, 'Statistiques appliquées', 40, 1, 4, users.formateurData.id, ['Interpréter des résultats statistiques'], ['devoir', 'examen'], 'active'],
    ['data-project', formationsByKey.data.id, 'Projet final Data', 60, 3, 5, users.formateurData.id, ['Restituer une analyse data complète'], ['projet', 'evaluation_finale'], 'active'],
    ['reseau', formationsByKey.cyber.id, 'Fondamentaux des réseaux', 50, 2, 1, users.pedagogie.id, ['Comprendre l’architecture réseau'], ['interrogation'], 'inactive'],
    ['securite', formationsByKey.cyber.id, 'Sécurité des systèmes', 60, 3, 2, users.pedagogie.id, ['Identifier les vulnérabilités courantes'], ['examen'], 'inactive'],
  ];
  for (const [key, formationId, name, hours, coefficient, sortOrder, formateurId, competencies, evaluationTypes, status] of moduleSeed) {
    modules[key] = await createRow('modules', {
      formation_id: formationId,
      name,
      description: `Module ${name} du parcours ${key === 'python' || key === 'sql' || key === 'powerbi' || key === 'stats' || key === 'data-project' ? 'Data' : 'Développement'}.`,
      coefficient,
      hours,
      formateur_id: formateurId,
      objectives: `Maîtriser les notions clés du module ${name}.`,
      competencies,
      evaluation_types: evaluationTypes,
      pass_mark: 10,
      sort_order: sortOrder,
      status,
    });
  }

  console.log('Étape 2/14: formations et modules prêts.');

  const promotions = {};
  promotions.dev2026 = await createRow('promotions', {
    formation_id: formationsByKey.dev.id,
    code: 'DEV-2026-A',
    name: 'Développement Web - Promotion 2026 A',
    start_date: '2026-09-01',
    end_date: '2027-02-28',
    capacity: 25,
    status: 'active',
    created_by: users.formation.id,
  });
  promotions.dev2025 = await createRow('promotions', {
    formation_id: formationsByKey.dev.id,
    code: 'DEV-2025-B',
    name: 'Développement Web - Promotion 2025 B',
    start_date: '2025-09-01',
    end_date: '2026-02-28',
    capacity: 20,
    status: 'cloturee',
    created_by: users.formation.id,
  });
  promotions.data2026 = await createRow('promotions', {
    formation_id: formationsByKey.data.id,
    code: 'DATA-2026-A',
    name: 'Data & BI - Promotion 2026 A',
    start_date: '2026-09-15',
    end_date: '2027-02-15',
    capacity: 20,
    status: 'active',
    created_by: users.formation.id,
  });
  promotions.data2025 = await createRow('promotions', {
    formation_id: formationsByKey.data.id,
    code: 'DATA-2025-B',
    name: 'Data & BI - Promotion 2025 B',
    start_date: '2025-09-01',
    end_date: '2026-01-31',
    capacity: 15,
    status: 'archivee',
    created_by: users.formation.id,
  });
  promotions.cyber2027 = await createRow('promotions', {
    formation_id: formationsByKey.cyber.id,
    code: 'CYBER-2027-A',
    name: 'Réseaux & Cybersécurité - Promotion 2027 A',
    start_date: '2027-01-10',
    end_date: '2027-05-10',
    capacity: 18,
    status: 'planifiee',
    created_by: users.formation.id,
  });

  console.log('Étape 3/14: promotions prêtes.');

  const stagiaires = {};
  const stagiaireSeed = [
    ['sarah', 'STG-2026-001', 'Mwamba', 'Kabeya', 'Sarah', 'F', '2003-04-12', 'Lubumbashi', '+243 970 100 101', 'sarah.mwamba@example.cd', 'Av. Kilela Balanda 12, Lubumbashi', 'Université de Lubumbashi', 'Licence 2', 'Baccalauréat', 'Développement logiciel', 'Développement Web Full-Stack', 'actif'],
    ['jeanluc', 'STG-2026-002', 'Mbuyi', 'Ilunga', 'Jean-Luc', 'M', '2001-11-03', 'Kolwezi', '+243 970 100 102', 'jeanluc.mbuyi@example.cd', 'Quartier Musompo, Kolwezi', 'Institut Supérieur de Kolwezi', 'Licence 3', 'Licence', 'Développement logiciel', 'Développement Web Full-Stack', 'actif'],
    ['david', 'STG-2026-003', 'Kasongo', 'Mwamba', 'David', 'M', '2000-07-21', 'Kinshasa', '+243 970 100 103', 'david.kasongo@example.cd', 'Av. de la Libération 45, Kinshasa', 'Université de Kinshasa', 'Master 1', 'Licence', 'Développement logiciel', 'Développement Web Full-Stack', 'actif'],
    ['rachel', 'STG-2026-004', 'Tshibangu', 'Kalala', 'Rachel', 'F', '2002-02-18', 'Mbuji-Mayi', '+243 970 100 104', 'rachel.tshibangu@example.cd', 'Quartier Bipemba, Mbuji-Mayi', 'Université de Mbuji-Mayi', 'Licence 2', 'Baccalauréat', 'Développement logiciel', 'Développement Web Full-Stack', 'actif'],
    ['emmanuel', 'STG-2026-005', 'Mutombo', 'Kanku', 'Emmanuel', 'M', '1999-12-09', 'Kananga', '+243 970 100 105', 'emmanuel.mutombo@example.cd', 'Av. Kasa-Vubu 8, Kananga', 'Institut Supérieur de Kananga', 'Licence 3', 'Licence', 'Développement logiciel', 'Développement Web Full-Stack', 'actif'],
    ['esther', 'STG-2026-006', 'Kalala', 'Mbuyi', 'Esther', 'F', '2003-06-30', 'Lubumbashi', '+243 970 100 106', 'esther.kalala@example.cd', 'Av. Lumumba 27, Lubumbashi', 'Université de Lubumbashi', 'Licence 1', 'Baccalauréat', 'Data & Business Intelligence', 'Data Analyse & Business Intelligence', 'actif'],
    ['patrick', 'STG-2026-007', 'Ngoy', 'Kasongo', 'Patrick', 'M', '2001-09-14', 'Kolwezi', '+243 970 100 107', 'patrick.ngoy@example.cd', 'Quartier Dilala, Kolwezi', 'Institut Supérieur de Kolwezi', 'Licence 3', 'Licence', 'Data & Business Intelligence', 'Data Analyse & Business Intelligence', 'actif'],
    ['alice', 'STG-2025-008', 'Mbayo', 'Tshibangu', 'Alice', 'F', '2000-03-05', 'Kinshasa', '+243 970 100 108', 'alice.mbayo@example.cd', 'Av. des Huileries 19, Kinshasa', 'Université de Kinshasa', 'Master 1', 'Licence', 'Développement logiciel', 'Développement Web Full-Stack', 'termine'],
    ['jonathan', 'STG-2026-009', 'Ilunga', 'Mutombo', 'Jonathan', 'M', '2004-01-22', 'Likasi', '+243 970 100 109', 'jonathan.ilunga@example.cd', 'Av. Mobutu 33, Likasi', 'Institut Supérieur de Likasi', 'Licence 1', 'Baccalauréat', 'Développement logiciel', 'Développement Web Full-Stack', 'candidat'],
    ['merveille', 'STG-2026-010', 'Nsimba', 'Mbala', 'Merveille', 'F', '2002-08-17', 'Matadi', '+243 970 100 110', 'merveille.nsimba@example.cd', 'Av. du Port 6, Matadi', 'Université de Matadi', 'Licence 2', 'Baccalauréat', 'Data & Business Intelligence', 'Data Analyse & Business Intelligence', 'admis'],
    ['fabrice', 'STG-2026-011', 'Lukusa', 'Ngoy', 'Fabrice', 'M', '2001-05-11', 'Kolwezi', '+243 970 100 111', 'fabrice.lukusa@example.cd', 'Quartier Manika, Kolwezi', 'Institut Supérieur de Kolwezi', 'Licence 2', 'Baccalauréat', 'Développement logiciel', 'Développement Web Full-Stack', 'archive'],
    ['grace', 'STG-2025-012', 'Muteba', 'Kalala', 'Grâce', 'F', '2003-10-02', 'Lubumbashi', '+243 970 100 112', 'grace.muteba@example.cd', 'Av. Kimbangu 22, Lubumbashi', 'Université de Lubumbashi', 'Licence 1', 'Baccalauréat', 'Data & Business Intelligence', 'Data Analyse & Business Intelligence', 'termine'],
  ];
  for (const [key, matricule, nom, postnom, prenom, sexe, dateNaissance, lieuNaissance, telephone, email, adresse, etablissement, niveau, diplome, domaine, specialite, statut] of stagiaireSeed) {
    stagiaires[key] = await createRow('stagiaires', {
      matricule,
      nom,
      postnom,
      prenom,
      sexe,
      date_naissance: dateNaissance,
      lieu_naissance: lieuNaissance,
      telephone,
      email,
      adresse,
      photo_url: null,
      contact_urgence_nom: `${prenom} ${nom} - Famille`,
      contact_urgence_telephone: telephone,
      etablissement_origine: etablissement,
      niveau_etudes: niveau,
      diplome,
      domaine,
      specialite,
      statut,
    });
  }
  await updateRow('users', users.stagiaire.id, { stagiaire_id: stagiaires.sarah.id });

  const inscriptions = {};
  const inscriptionSeed = [
    ['sarah', 'dev', 'dev2026', '2026-09-01', '2027-02-28', 'validee'],
    ['jeanluc', 'dev', 'dev2026', '2026-09-01', '2027-02-28', 'validee'],
    ['david', 'dev', 'dev2026', '2026-09-01', '2027-02-28', 'validee'],
    ['rachel', 'dev', 'dev2026', '2026-09-01', '2027-02-28', 'validee'],
    ['emmanuel', 'dev', 'dev2026', '2026-09-01', '2027-02-28', 'validee'],
    ['esther', 'data', 'data2026', '2026-09-15', '2027-02-15', 'validee'],
    ['patrick', 'data', 'data2026', '2026-09-15', '2027-02-15', 'validee'],
    ['alice', 'dev', 'dev2025', '2025-09-01', '2026-02-28', 'terminee'],
    ['jonathan', 'dev', 'dev2026', '2026-09-01', null, 'en_attente'],
    ['merveille', 'data', 'data2026', '2026-09-15', '2027-02-15', 'validee'],
    ['fabrice', 'dev', 'dev2025', '2025-09-01', '2025-10-01', 'annulee'],
    ['grace', 'data', 'data2025', '2025-09-01', '2026-01-31', 'terminee'],
  ];
  for (const [key, formation, promotion, startDate, endDate, status] of inscriptionSeed) {
    inscriptions[key] = await createRow('inscriptions', {
      stagiaire_id: stagiaires[key].id,
      formation_id: formationsByKey[formation].id,
      promotion_id: promotions[promotion].id,
      start_date: startDate,
      end_date: endDate,
      responsible_id: users.formation.id,
      status,
    });
  }

  console.log('Étape 4/14: stagiaires et inscriptions prêts.');

  const affectations = {};
  const affectationSeed = [
    ['sarah', 'dev', 'dev2026', 'Développement produit', 'A'],
    ['jeanluc', 'dev', 'dev2026', 'Développement produit', 'A'],
    ['david', 'dev', 'dev2026', 'Développement produit', 'A'],
    ['rachel', 'dev', 'dev2026', 'Développement produit', 'B'],
    ['emmanuel', 'dev', 'dev2026', 'Développement produit', 'B'],
    ['esther', 'data', 'data2026', 'Data & Analytics', 'A'],
    ['patrick', 'data', 'data2026', 'Data & Analytics', 'A'],
    ['alice', 'dev', 'dev2025', 'Direction des systèmes d’information', 'A'],
    ['merveille', 'data', 'data2026', 'Data & Analytics', 'B'],
    ['grace', 'data', 'data2025', 'Data & Analytics', 'A'],
  ];
  for (const [key, formation, promotion, service, groupe] of affectationSeed) {
    affectations[key] = await createRow('affectations', {
      stagiaire_id: stagiaires[key].id,
      inscription_id: inscriptions[key].id,
      formation_id: formationsByKey[formation].id,
      promotion_id: promotions[promotion].id,
      service,
      formateur_id: formation === 'dev' ? users.formateurDev.id : users.formateurData.id,
      maitre_stage_id: users.maitre.id,
      groupe,
    });
  }

  const seances = {};
  const seanceSeed = [
    ['react-intro', 'react', 'dev2026', users.formateurDev.id, 'React : composants et props', '2026-10-06', '08:00', '12:00', 'Salle DEV-1', 'terminee'],
    ['react-hooks', 'react', 'dev2026', users.formateurDev.id, 'React : état et hooks', '2026-10-13', '08:00', '12:00', 'Salle DEV-1', 'terminee'],
    ['react-forms', 'react', 'dev2026', users.formateurDev.id, 'React : routage et formulaires', '2026-10-20', '08:00', '12:00', 'Salle DEV-1', 'terminee'],
    ['react-review', 'react', 'dev2026', users.formateurDev.id, 'React : revue de code', '2026-10-27', '08:00', '12:00', 'Salle DEV-1', 'planifiee'],
    ['react-best', 'react', 'dev2026', users.formateurDev.id, 'React : bonnes pratiques', '2026-11-03', '08:00', '12:00', 'Salle DEV-1', 'planifiee'],
    ['js-functions', 'javascript', 'dev2026', users.formateurDev.id, 'JavaScript : fonctions et tableaux', '2026-09-22', '08:00', '12:00', 'Salle DEV-2', 'terminee'],
    ['js-async', 'javascript', 'dev2026', users.formateurDev.id, 'JavaScript : asynchrone et fetch', '2026-09-29', '08:00', '12:00', 'Salle DEV-2', 'terminee'],
    ['js-workshop', 'javascript', 'dev2026', users.formateurDev.id, 'JavaScript : atelier de consolidation', '2026-10-24', '14:00', '17:00', 'Salle DEV-2', 'en_cours'],
    ['js-extra', 'javascript', 'dev2026', users.formateurDev.id, 'JavaScript : atelier bonus', '2026-10-23', '14:00', '17:00', 'Salle DEV-2', 'annulee'],
    ['node-express', 'node', 'dev2026', users.formateurDev.id, 'Node.js : serveur Express', '2026-10-15', '13:00', '17:00', 'Salle DEV-3', 'terminee'],
    ['node-middleware', 'node', 'dev2026', users.formateurDev.id, 'Node.js : middlewares', '2026-10-22', '13:00', '17:00', 'Salle DEV-3', 'terminee'],
    ['node-auth', 'node', 'dev2026', users.formateurDev.id, 'Node.js : authentification JWT', '2026-11-05', '13:00', '17:00', 'Salle DEV-3', 'planifiee'],
    ['python-pandas', 'python', 'data2026', users.formateurData.id, 'Python : pandas et nettoyage', '2026-10-07', '09:00', '13:00', 'Salle DATA-1', 'terminee'],
    ['python-viz', 'python', 'data2026', users.formateurData.id, 'Python : visualisation', '2026-10-14', '09:00', '13:00', 'Salle DATA-1', 'terminee'],
    ['python-project', 'python', 'data2026', users.formateurData.id, 'Python : projet guidé', '2026-10-28', '09:00', '13:00', 'Salle DATA-1', 'planifiee'],
    ['sql-joins', 'sql', 'data2026', users.formateurData.id, 'SQL : jointures et agrégats', '2026-10-09', '09:00', '13:00', 'Salle DATA-2', 'terminee'],
    ['sql-window', 'sql', 'data2026', users.formateurData.id, 'SQL : fenêtres analytiques', '2026-10-16', '09:00', '13:00', 'Salle DATA-2', 'terminee'],
    ['sql-review', 'sql', 'data2026', users.formateurData.id, 'SQL : atelier de révision', '2026-11-06', '09:00', '13:00', 'Salle DATA-2', 'planifiee'],
  ];
  for (const [key, module, promotion, formateurId, title, date, startTime, endTime, room, status] of seanceSeed) {
    seances[key] = await createRow('seances', {
      module_id: modules[module].id,
      promotion_id: promotions[promotion].id,
      formateur_id: formateurId,
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      room,
      status,
    });
  }

  console.log('Étape 5/14: affectations et séances prêtes.');

  const presenceMatrix = [
    ['sarah', 'react-intro', 'present'], ['sarah', 'react-hooks', 'present'], ['sarah', 'react-forms', 'present'], ['sarah', 'js-functions', 'present'],
    ['jeanluc', 'react-intro', 'present'], ['jeanluc', 'react-hooks', 'retard'], ['jeanluc', 'react-forms', 'absence_non_justifiee'], ['jeanluc', 'js-functions', 'present'],
    ['david', 'react-intro', 'present'], ['david', 'react-hooks', 'present'], ['david', 'react-forms', 'sortie_autorisee'], ['david', 'js-functions', 'retard'],
    ['rachel', 'react-intro', 'present'], ['rachel', 'react-hooks', 'retard'], ['rachel', 'react-forms', 'present'], ['rachel', 'js-functions', 'present'],
    ['emmanuel', 'react-intro', 'present'], ['emmanuel', 'react-hooks', 'absence_justifiee'], ['emmanuel', 'react-forms', 'present'], ['emmanuel', 'js-functions', 'present'],
    ['esther', 'python-pandas', 'present'], ['esther', 'python-viz', 'present'], ['esther', 'sql-joins', 'present'],
    ['patrick', 'python-pandas', 'retard'], ['patrick', 'python-viz', 'present'], ['patrick', 'sql-joins', 'absence_justifiee'],
  ];
  for (const [stagiaire, seance, status] of presenceMatrix) {
    await createRow('presences', {
      seance_id: seances[seance].id,
      stagiaire_id: stagiaires[stagiaire].id,
      status,
      note: status === 'absence_non_justifiee' ? 'Aucun justificatif reçu.' : status === 'retard' ? 'Retard de 15 minutes.' : null,
      recorded_by: users.formateurDev.id,
      recorded_at: iso(`${seances[seance].date}T12:15:00Z`),
    });
  }

  const evaluations = {};
  const evaluationSeed = [
    ['interro-js', 'Interrogation JavaScript - fonctions', 'dev', 'javascript', users.formateurDev.id, 'interrogation', '2026-09-25', 45, 20, 1, 10, '2026-09', 'publiee', false, true, 'Répondre aux questions sans documentation.'],
    ['devoir-react', 'Devoir React - composants', 'dev', 'react', users.formateurDev.id, 'devoir', '2026-10-09', 90, 20, 2, 20, '2026-10', 'corrigee', false, true, 'Livrer un composant réutilisable et documenté.'],
    ['qcm-js', 'QCM JavaScript fondamentaux', 'dev', 'javascript', users.formateurDev.id, 'qcm', '2026-10-12', 30, 20, 1, 10, '2026-10', 'publiee', true, true, 'Une seule tentative. Lisez attentivement chaque question.'],
    ['examen-algo', 'Examen Algorithmique', 'dev', 'algo', users.formateurDev.id, 'examen', '2026-10-16', 120, 20, 2, 40, '2026-10', 'validee', false, true, 'Épreuve sur table, sans calculatrice.'],
    ['tp-react', 'TP React - tableau de bord', 'dev', 'react', users.formateurDev.id, 'travail_pratique', '2026-10-19', null, 20, 3, 30, '2026-10', 'publiee', false, true, 'Rendre le code source, une capture et un README.'],
    ['projet-react', 'Projet React - application de gestion', 'dev', 'react', users.formateurDev.id, 'projet', '2026-11-06', null, 20, 3, 20, '2026-11', 'programmee', false, true, 'Travail en binôme, soutenance de 10 minutes.'],
    ['presentation-node', 'Présentation technique Node.js', 'dev', 'node', users.formateurDev.id, 'presentation', '2026-11-12', 20, 20, 1, 10, '2026-11', 'brouillon', false, true, 'Présenter une architecture de service.'],
    ['orale-api', 'Évaluation orale - architecture API', 'dev', 'api', users.formateurDev.id, 'evaluation_orale', '2026-11-13', 20, 20, 1, 10, '2026-11', 'programmee', false, true, 'Entretien de 20 minutes.'],
    ['competence-git', 'Évaluation de compétence - Git', 'dev', 'git', users.formateurDev.id, 'evaluation_competence', '2026-10-21', 30, 20, 1, 10, '2026-10', 'terminee', false, true, 'Mise en situation sur un dépôt partagé.'],
    ['comportement-dev', 'Évaluation comportementale - période 1', 'dev', null, users.formateurDev.id, 'evaluation_comportementale', '2026-10-23', null, 20, 1, 10, '2026-10', 'soumise', false, false, 'Synthèse des observations de la période.'],
    ['finale-dev', 'Évaluation finale - Promotion DEV 2026-A', 'dev', null, users.pedagogie.id, 'evaluation_finale', '2027-02-20', null, 20, 1, 100, '2027-02', 'brouillon', false, true, 'Évaluation finale de la promotion.'],
    ['qcm-git', 'QCM Git & GitHub', 'dev', 'git', users.formateurDev.id, 'qcm', '2026-10-30', 20, 10, 1, 10, '2026-10', 'programmee', true, true, 'QCM de validation des acquis Git.'],
    ['interro-python', 'Interrogation Python - pandas', 'data', 'python', users.formateurData.id, 'interrogation', '2026-10-10', 45, 20, 1, 10, '2026-10', 'publiee', false, true, 'Manipulation de DataFrames.'],
    ['tp-powerbi', 'TP Power BI - tableau de bord ventes', 'data', 'powerbi', users.formateurData.id, 'travail_pratique', '2026-10-23', null, 20, 2, 30, '2026-10', 'terminee', false, true, 'Rendre le fichier PBIX et une capture.'],
    ['examen-sql', 'Examen SQL avancé', 'data', 'sql', users.formateurData.id, 'examen', '2026-11-04', 90, 20, 2, 40, '2026-11', 'programmee', false, true, 'Requêtes complexes sur un schéma fourni.'],
    ['qcm-sql', 'QCM SQL - requêtes', 'data', 'sql', users.formateurData.id, 'qcm', '2026-10-24', 20, 10, 1, 10, '2026-10', 'en_cours', true, true, 'QCM sur les jointures et agrégats.'],
    ['projet-data', 'Projet Data - analyse de ventes', 'data', 'data-project', users.formateurData.id, 'projet', '2027-01-20', null, 20, 3, 20, '2027-01', 'brouillon', false, true, 'Analyse complète et recommandations.'],
    ['finale-data', 'Évaluation finale - Promotion DATA 2026-A', 'data', null, users.pedagogie.id, 'evaluation_finale', '2027-02-10', null, 20, 1, 100, '2027-02', 'brouillon', false, true, 'Évaluation finale de la promotion.'],
  ];
  for (const [key, title, formation, module, formateurId, type, date, duration, maxScore, coefficient, weight, period, status, isQcm, feedsGradebook, instructions] of evaluationSeed) {
    evaluations[key] = await createRow('evaluations', {
      title,
      formation_id: formationsByKey[formation].id,
      module_id: module ? modules[module].id : null,
      formateur_id: formateurId,
      type,
      date,
      duration_minutes: duration,
      max_score: maxScore,
      coefficient,
      weight,
      period,
      status,
      is_qcm: isQcm,
      feeds_gradebook: feedsGradebook,
      instructions,
    });
  }

  console.log('Étape 6/14: présences et évaluations prêtes.');

  const noteSeed = [
    ['interro-js', { sarah: 15, jeanluc: 11, david: 17, rachel: 16, emmanuel: 10 }, 'publiee'],
    ['devoir-react', { sarah: 16, jeanluc: 12.5, david: 15, rachel: 17, emmanuel: 11 }, 'validee'],
    ['qcm-js', { sarah: 9, jeanluc: 6, david: 10, rachel: 11, emmanuel: 7 }, 'publiee'],
    ['examen-algo', { sarah: 15.5, jeanluc: 10, david: 14, rachel: 16.5, emmanuel: 9.5 }, 'validee'],
    ['tp-react', { sarah: 16, jeanluc: 12, david: 13, rachel: 17, emmanuel: 14 }, 'publiee'],
    ['competence-git', { sarah: 17, jeanluc: 13, david: 15, rachel: 18, emmanuel: 12 }, 'soumise'],
    ['comportement-dev', { sarah: 18, jeanluc: 12, david: 14, rachel: 17, emmanuel: 13 }, 'saisie'],
    ['interro-python', { esther: 16, patrick: 12 }, 'publiee'],
    ['tp-powerbi', { esther: 17, patrick: 13 }, 'validee'],
    ['examen-sql', { esther: 15, patrick: 11 }, 'soumise'],
  ];
  for (const [evaluation, scores, status] of noteSeed) {
    for (const [stagiaire, score] of Object.entries(scores)) {
      await createRow('notes', {
        evaluation_id: evaluations[evaluation].id,
        stagiaire_id: stagiaires[stagiaire].id,
        score,
        max_score: evaluations[evaluation].max_score,
        coefficient: evaluations[evaluation].coefficient,
        status,
        comment: score >= 15 ? 'Très bonne maîtrise.' : score >= 10 ? 'Résultat satisfaisant.' : 'Des difficultés subsistent.',
        graded_by: evaluations[evaluation].formateur_id,
        graded_at: iso(`${evaluations[evaluation].date}T16:00:00Z`),
        validated_by: status === 'validee' || status === 'publiee' ? users.pedagogie.id : null,
        validated_at: status === 'validee' || status === 'publiee' ? iso(`${evaluations[evaluation].date}T17:00:00Z`) : null,
      });
    }
  }

  const qcmQuestions = {};
  qcmQuestions.js = [];
  const jsQuestions = [
    ['Quel mot-clé déclare une constante en JavaScript ?', 'single', ['let', 'const', 'var', 'function'], 'const', 2, 1],
    ['Quels types sont primitifs en JavaScript ?', 'multiple', ['string', 'number', 'array', 'boolean'], ['string', 'number', 'boolean'], 3, 2],
    ['L’opérateur == compare également le type des valeurs.', 'true_false', ['Vrai', 'Faux'], 'Faux', 2, 3],
    ['Quelle méthode transforme un tableau en nouveau tableau ?', 'short_answer', [], 'map', 3, 4],
    ['Quelle méthode parse une chaîne JSON ?', 'single', ['JSON.stringify', 'JSON.parse', 'JSON.toObject', 'parseJSON'], 'JSON.parse', 2, 5],
  ];
  for (const [questionText, type, options, correctAnswer, points, sortOrder] of jsQuestions) {
    qcmQuestions.js.push(await createRow('qcm_questions', {
      evaluation_id: evaluations['qcm-js'].id,
      question_text: questionText,
      type,
      options,
      correct_answer: Array.isArray(correctAnswer) ? correctAnswer : [String(correctAnswer)],
      points,
      sort_order: sortOrder,
    }));
  }

  qcmQuestions.git = [];
  const gitQuestions = [
    ['Quelle commande crée une nouvelle branche et bascule dessus ?', 'single', ['git branch', 'git switch -c', 'git checkout', 'git merge'], 'git switch -c', 2, 1],
    ['Quels fichiers peuvent être ignorés par Git ?', 'multiple', ['node_modules/', '.env', 'src/main.tsx', 'dist/'], ['node_modules/', '.env', 'dist/'], 2, 2],
    ['Un commit peut être modifié après avoir été poussé sur une branche partagée.', 'true_false', ['Vrai', 'Faux'], 'Faux', 1, 3],
    ['Quel est le nom du fichier qui liste les fichiers à ignorer ?', 'short_answer', [], '.gitignore', 1, 4],
  ];
  for (const [questionText, type, options, correctAnswer, points, sortOrder] of gitQuestions) {
    qcmQuestions.git.push(await createRow('qcm_questions', {
      evaluation_id: evaluations['qcm-git'].id,
      question_text: questionText,
      type,
      options,
      correct_answer: Array.isArray(correctAnswer) ? correctAnswer : [String(correctAnswer)],
      points,
      sort_order: sortOrder,
    }));
  }

  qcmQuestions.sql = [];
  const sqlQuestions = [
    ['Quelle clause filtre les lignes avant le regroupement ?', 'single', ['HAVING', 'WHERE', 'GROUP BY', 'ORDER BY'], 'WHERE', 2, 1],
    ['Quelles jointures conservent toutes les lignes de la table de gauche ?', 'multiple', ['INNER JOIN', 'LEFT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN'], ['LEFT JOIN', 'FULL OUTER JOIN'], 2, 2],
    ['Une fonction de fenêtrage nécessite toujours une clause PARTITION BY.', 'true_false', ['Vrai', 'Faux'], 'Faux', 2, 3],
    ['Quelle fonction Calcule une moyenne ?', 'short_answer', [], 'AVG', 2, 4],
  ];
  for (const [questionText, type, options, correctAnswer, points, sortOrder] of sqlQuestions) {
    qcmQuestions.sql.push(await createRow('qcm_questions', {
      evaluation_id: evaluations['qcm-sql'].id,
      question_text: questionText,
      type,
      options,
      correct_answer: Array.isArray(correctAnswer) ? correctAnswer : [String(correctAnswer)],
      points,
      sort_order: sortOrder,
    }));
  }

  console.log('Étape 7/14: notes et questions QCM prêtes.');

  const attemptSeed = [
    ['qcm-js', 'sarah', [true, true, true, false, true]],
    ['qcm-js', 'jeanluc', [true, false, true, false, false]],
    ['qcm-js', 'david', [true, true, true, true, true]],
    ['qcm-git', 'sarah', [true, true, true, false]],
    ['qcm-git', 'rachel', [true, true, true, true]],
    ['qcm-sql', 'esther', [true, true, false, true]],
  ];
  for (const [evaluation, stagiaire, correctness] of attemptSeed) {
    const questions = qcmQuestions[evaluation === 'qcm-js' ? 'js' : evaluation === 'qcm-git' ? 'git' : 'sql'];
    const answers = makeAnswers(questions, correctness);
    const result = gradeQuestions(questions, answers);
    await createRow('qcm_attempts', {
      evaluation_id: evaluations[evaluation].id,
      stagiaire_id: stagiaires[stagiaire].id,
      attempt_number: 1,
      started_at: iso(`${evaluations[evaluation].date}T08:00:00Z`),
      submitted_at: iso(`${evaluations[evaluation].date}T08:28:00Z`),
      score: result.score,
      max_score: result.maxScore,
      percentage: result.percentage,
      passed: result.percentage >= 50,
      time_spent_seconds: 1680,
      answers,
      status: 'corrige',
    });
  }

  const tpByKey = {};
  const tpSeed = [
    ['react', 'TP React - tableau de bord', 'react', users.formateurDev.id, '2026-10-19', ['Code source', 'Capture d’écran', 'README'], 20, 3, 'cloture'],
    ['node', 'TP Node.js - API de gestion', 'node', users.formateurDev.id, '2026-11-02', ['API', 'Tests', 'Documentation'], 20, 2, 'publie'],
    ['python', 'TP Python - nettoyage de données', 'python', users.formateurData.id, '2026-10-17', ['Notebook', 'Jeu de données nettoyé'], 20, 2, 'cloture'],
    ['powerbi', 'TP Power BI - tableau de bord ventes', 'powerbi', users.formateurData.id, '2026-10-23', ['Fichier PBIX', 'Capture'], 20, 2, 'publie'],
    ['git', 'TP Git - workflow collaboratif', 'git', users.formateurDev.id, '2026-10-12', ['Dépôt', 'Pull request'], 20, 1, 'archive'],
    ['openapi', 'TP API REST - documentation OpenAPI', 'api', users.formateurDev.id, '2026-11-15', ['Spécification OpenAPI', 'Collection Postman'], 20, 2, 'brouillon'],
  ];
  for (const [key, title, module, formateurId, deadline, deliverables, maxScore, coefficient, status] of tpSeed) {
    tpByKey[key] = await createRow('travaux_pratiques', {
      title,
      module_id: modules[module].id,
      formateur_id: formateurId,
      description: `Travail pratique : ${title}.`,
      deadline,
      deliverables,
      max_score: maxScore,
      coefficient,
      status,
    });
  }

  console.log('Étape 8/14: tentatives QCM et travaux pratiques prêts.');

  const soumissionSeed = [
    ['react', 'sarah', 'valide', 16, 'Travail complet et bien structuré.'],
    ['react', 'jeanluc', 'corrige', 12, 'Quelques problèmes de gestion d’état.'],
    ['react', 'david', 'a_refaire', 8, 'Livrable incomplet, revoir les hooks.'],
    ['react', 'rachel', 'soumis', null, null],
    ['node', 'sarah', 'en_correction', null, null],
    ['node', 'emmanuel', 'en_correction', null, null],
    ['python', 'esther', 'valide', 17, 'Nettoyage rigoureux et bien documenté.'],
    ['python', 'patrick', 'corrige', 13, 'Bon travail, quelques valeurs aberrantes oubliées.'],
    ['powerbi', 'esther', 'soumis', null, null],
    ['git', 'david', 'valide', 15, 'Workflow respecté.'],
    ['git', 'rachel', 'valide', 18, 'Excellente collaboration.'],
  ];
  for (const [tp, stagiaire, status, score, feedback] of soumissionSeed) {
    await createRow('travaux_soumissions', {
      tp_id: tpByKey[tp].id,
      stagiaire_id: stagiaires[stagiaire].id,
      file_url: `https://files.stagebuild.local/tp/${tp}/${stagiaire}.zip`,
      file_name: `${tp}-${stagiaire}.zip`,
      link_url: `https://github.com/stagebuild-demo/${tp}-${stagiaire}`,
      submitted_at: iso(`${tpByKey[tp].deadline ?? '2026-10-15'}T16:30:00Z`),
      status,
      score,
      feedback,
      graded_by: score === null ? null : tpByKey[tp].formateur_id,
      graded_at: score === null ? null : iso(`${tpByKey[tp].deadline ?? '2026-10-15'}T18:00:00Z`),
    });
  }

  const competences = {};
  const competenceSeed = [
    ['dev-algo', 'dev', 'algo', 'Résoudre un problème algorithmique', 1],
    ['dev-html', 'dev', 'html', 'Structurer une page avec HTML/CSS', 2],
    ['dev-js', 'dev', 'javascript', 'Manipuler le DOM et les données', 3],
    ['dev-react', 'dev', 'react', 'Développer une interface React', 4],
    ['dev-api', 'dev', 'api', 'Concevoir une API REST', 5],
    ['dev-db', 'dev', 'database', 'Modéliser une base de données', 6],
    ['dev-git', 'dev', 'git', 'Utiliser Git et GitHub', 7],
    ['data-python', 'data', 'python', 'Explorer des données avec Python', 1],
    ['data-sql', 'data', 'sql', 'Écrire des requêtes SQL avancées', 2],
    ['data-powerbi', 'data', 'powerbi', 'Construire un tableau de bord Power BI', 3],
    ['data-stats', 'data', 'stats', 'Interpréter des résultats statistiques', 4],
  ];
  for (const [key, formation, module, name, sortOrder] of competenceSeed) {
    competences[key] = await createRow('competences', {
      formation_id: formationsByKey[formation].id,
      module_id: modules[module].id,
      name,
      description: `Compétence ${name}.`,
      sort_order: sortOrder,
    });
  }

  const levelByStagiaire = {
    sarah: ['acquis', 'acquis', 'maitrise', 'acquis', 'maitrise', 'acquis', 'acquis'],
    jeanluc: ['a_renforcer', 'en_cours', 'non_acquis', 'a_renforcer', 'en_cours', 'acquis', 'en_cours'],
    david: ['en_cours', 'acquis', 'acquis', 'a_renforcer', 'acquis', 'en_cours', 'acquis'],
    rachel: ['acquis', 'maitrise', 'acquis', 'acquis', 'maitrise', 'acquis', 'maitrise'],
    emmanuel: ['en_cours', 'a_renforcer', 'en_cours', 'non_acquis', 'a_renforcer', 'en_cours', 'en_cours'],
    alice: ['maitrise', 'acquis', 'acquis', 'maitrise', 'acquis', 'maitrise', 'acquis'],
    esther: ['acquis', 'maitrise', 'acquis', 'en_cours'],
    patrick: ['en_cours', 'acquis', 'a_renforcer', 'en_cours'],
    grace: ['acquis', 'acquis', 'maitrise', 'acquis'],
  };
  const devCompetences = ['dev-algo', 'dev-html', 'dev-js', 'dev-react', 'dev-api', 'dev-db', 'dev-git'];
  const dataCompetences = ['data-python', 'data-sql', 'data-powerbi', 'data-stats'];
  for (const [stagiaire, levels] of Object.entries(levelByStagiaire)) {
    const keys = levels.length === 7 ? devCompetences : dataCompetences;
    for (let index = 0; index < keys.length; index += 1) {
      const competence = keys[index];
      await createRow('competence_levels', {
        stagiaire_id: stagiaires[stagiaire].id,
        competence_id: competences[competence].id,
        level: levels[index],
        comment: levels[index] === 'non_acquis' ? 'À retravailler en priorité.' : levels[index] === 'maitrise' ? 'Compétence solide et autonome.' : null,
        evaluated_by: stagiaires[stagiaire].specialite?.includes('Data') ? users.formateurData.id : users.formateurDev.id,
        evaluated_at: iso('2026-10-23T17:00:00Z'),
      });
    }
  }

  console.log('Étape 9/14: soumissions et compétences prêtes.');

  const implicationValues = {
    sarah: [18, 17, 18, 17, 16, 18, 18, 17],
    jeanluc: [12, 11, 13, 12, 10, 13, 12, 11],
    david: [14, 12, 14, 13, 12, 15, 13, 12],
    rachel: [17, 18, 17, 16, 17, 18, 17, 16],
    emmanuel: [13, 12, 14, 13, 11, 14, 13, 12],
    esther: [17, 16, 17, 16, 16, 17, 17, 16],
    patrick: [13, 14, 13, 12, 13, 14, 13, 12],
  };
  for (const [stagiaire, values] of Object.entries(implicationValues)) {
    const averageValue = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
    await createRow('implications', {
      stagiaire_id: stagiaires[stagiaire].id,
      module_id: null,
      period: '2026-10',
      participation: values[0],
      assiduite: values[1],
      curiosite: values[2],
      questions: values[3],
      travail_personnel: values[4],
      collaboration: values[5],
      respect_consignes: values[6],
      autonomie: values[7],
      average: averageValue,
      comment: averageValue >= 16 ? 'Stagiaire très impliqué et moteur dans le groupe.' : averageValue >= 13 ? 'Implication satisfaisante, marge de progression.' : 'Implication à renforcer.',
      evaluated_by: stagiaires[stagiaire].specialite?.includes('Data') ? users.formateurData.id : users.formateurDev.id,
    });
  }

  const comportementValues = {
    sarah: [18, 18, 18, 17, 18, 18, 18, 18, 17, 18],
    jeanluc: [12, 13, 14, 12, 13, 12, 13, 12, 13, 12],
    david: [11, 14, 14, 13, 15, 13, 14, 13, 14, 13],
    rachel: [18, 17, 18, 18, 17, 17, 18, 17, 18, 17],
    emmanuel: [13, 14, 15, 14, 15, 14, 14, 13, 14, 14],
    esther: [17, 17, 17, 16, 17, 16, 17, 17, 17, 16],
    patrick: [14, 14, 15, 14, 14, 14, 15, 14, 14, 14],
  };
  for (const [stagiaire, values] of Object.entries(comportementValues)) {
    const averageValue = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
    await createRow('comportements', {
      stagiaire_id: stagiaires[stagiaire].id,
      period: '2026-10',
      ponctualite: values[0],
      discipline: values[1],
      respect: values[2],
      communication: values[3],
      esprit_equipe: values[4],
      autonomie: values[5],
      responsabilite: values[6],
      attitude_professionnelle: values[7],
      respect_materiel: values[8],
      capacite_adaptation: values[9],
      average: averageValue,
      appreciation: averageValue >= 17 ? 'Exemplaire.' : averageValue >= 14 ? 'Professionnel et fiable.' : 'Doit encore progresser sur la posture professionnelle.',
      evaluated_by: stagiaires[stagiaire].specialite?.includes('Data') ? users.formateurData.id : users.formateurDev.id,
    });
  }

  const observationSeed = [
    ['sarah', 'react', null, null, users.formateurDev.id, 'Excellente autonomie sur React. Sarah aide régulièrement ses pairs.', 'interne'],
    ['sarah', null, null, null, users.pedagogie.id, 'Participation remarquée lors de la revue de projet.', 'stagiaire'],
    ['jeanluc', 'react', null, null, users.formateurDev.id, 'Difficultés persistantes sur les hooks et la gestion des effets.', 'interne'],
    ['david', null, 'react-intro', null, users.formateurDev.id, 'Retards répétés le matin, à surveiller.', 'interne'],
    ['esther', 'python', null, null, users.formateurData.id, 'Très bonne progression sur pandas et la visualisation.', 'publiee'],
    ['patrick', 'sql', null, null, users.formateurData.id, 'Doit approfondir les jointures et les fonctions de fenêtrage.', 'interne'],
    ['alice', null, null, null, users.pedagogie.id, 'Stage validé avec un très bon projet final.', 'publiee'],
    ['fabrice', null, null, null, users.formation.id, 'Absences non justifiées ayant conduit à l’archivage du dossier.', 'interne'],
  ];
  for (const [stagiaire, module, seance, evaluation, author, content, visibility] of observationSeed) {
    await createRow('observations', {
      stagiaire_id: stagiaires[stagiaire].id,
      module_id: module ? modules[module].id : null,
      seance_id: seance ? seances[seance].id : null,
      evaluation_id: evaluation ? evaluations[evaluation].id : null,
      competence_id: null,
      author_id: author.id,
      content,
      visibility,
    });
  }

  const plans = {};
  plans.jeanluc = await createRow('improvement_plans', {
    stagiaire_id: stagiaires.jeanluc.id,
    difficulty: 'Maîtrise des hooks React',
    objective: 'Être capable de créer un composant avec état et effets sans assistance.',
    start_date: '2026-10-01',
    end_date: '2026-11-30',
    responsible_id: users.formateurDev.id,
    status: 'en_cours',
    evaluation_comment: 'Des progrès sont visibles mais l’autonomie reste fragile.',
  });
  plans.david = await createRow('improvement_plans', {
    stagiaire_id: stagiaires.david.id,
    difficulty: 'Ponctualité et régularité',
    objective: 'Arriver à l’heure à 100 % des séances sur une période de quatre semaines.',
    start_date: '2026-10-01',
    end_date: '2026-11-15',
    responsible_id: users.formateurDev.id,
    status: 'evalue',
    evaluation_comment: 'Amélioration nette sur les deux dernières semaines.',
  });
  plans.emmanuel = await createRow('improvement_plans', {
    stagiaire_id: stagiaires.emmanuel.id,
    difficulty: 'Algorithmique',
    objective: 'Résoudre dix exercices de niveau intermédiaire.',
    start_date: '2026-09-20',
    end_date: '2026-10-20',
    responsible_id: users.formateurDev.id,
    status: 'atteint',
    evaluation_comment: 'Objectif atteint, exercices réalisés avec régularité.',
  });
  plans.fabrice = await createRow('improvement_plans', {
    stagiaire_id: stagiaires.fabrice.id,
    difficulty: 'Assiduité',
    objective: 'Reprendre le stage et justifier toutes les absences.',
    start_date: '2025-10-01',
    end_date: '2025-11-01',
    responsible_id: users.formation.id,
    status: 'non_atteint',
    evaluation_comment: 'Aucune reprise effective, dossier archivé.',
  });
  plans.esther = await createRow('improvement_plans', {
    stagiaire_id: stagiaires.esther.id,
    difficulty: 'Prise de parole en public',
    objective: 'Présenter une analyse data en cinq minutes.',
    start_date: '2026-11-01',
    end_date: '2026-12-15',
    responsible_id: users.formateurData.id,
    status: 'cree',
    evaluation_comment: null,
  });

  const actionSeed = [
    ['jeanluc', 'Refaire les exercices sur les hooks', 'exercice', '2026-10-30', 'en_cours', 'Exercices 1 à 6 réalisés.'],
    ['jeanluc', 'Session de tutorat hebdomadaire', 'tutorat', '2026-11-15', 'a_faire', null],
    ['david', 'Rappel des horaires et engagement écrit', 'sensibilisation', '2026-10-15', 'termine', 'Engagement signé.'],
    ['david', 'Suivi quotidien de la ponctualité', 'suivi', '2026-11-15', 'en_cours', 'Trois retards sur les dix derniers jours.'],
    ['emmanuel', 'Exercices algorithmiques progressifs', 'exercice', '2026-10-20', 'termine', 'Dix exercices validés.'],
    ['emmanuel', 'Auto-évaluation finale', 'evaluation', '2026-10-27', 'termine', 'Auto-évaluation cohérente.'],
    ['fabrice', 'Entretien avec la direction', 'entretien', '2025-10-10', 'annule', 'Stagiaire non présent.'],
    ['esther', 'Atelier de prise de parole', 'atelier', '2026-11-20', 'a_faire', null],
  ];
  for (const [plan, title, type, dueDate, status, result] of actionSeed) {
    await createRow('improvement_actions', {
      plan_id: plans[plan].id,
      title,
      type,
      due_date: dueDate,
      status,
      result,
    });
  }

  console.log('Étape 10/14: implication, comportement et observations prêts.');

  const intermediateSeed = [
    ['sarah', 15.8, 92, 15.5, 16, 6, 17, 18, 'Excellente autonomie et très bonne participation.', 'Peut encore approfondir les tests automatisés.', 'Continuer sur cette dynamique.', 'progression_normale', 'Aucune difficulté majeure.'],
    ['jeanluc', 11.2, 78, 10, 12, 2, 11.5, 12.5, 'Bonne volonté et esprit d’équipe.', 'Hooks React et régularité du travail personnel.', 'Plan d’amélioration et tutorat hebdomadaire.', 'plan_amelioration', 'Suivi renforcé nécessaire.'],
    ['david', 13.4, 70, 13, 13, 4, 13, 13.5, 'Bon niveau technique sur JavaScript.', 'Ponctualité et assiduité.', 'Suivi de la ponctualité et entretien si nécessaire.', 'surveillance', 'Deux absences non justifiées.'],
    ['rachel', 16.4, 100, 17, 17, 6, 17, 17.8, 'Très bonne maîtrise technique et grande fiabilité.', 'Prise de risque limitée dans les projets.', 'Encourager des projets plus ambitieux.', 'progression_normale', 'Profil moteur.'],
    ['emmanuel', 10.8, 75, 9, 11, 2, 12.5, 14, 'Progression régulière en JavaScript.', 'Algorithmique et autonomie.', 'Entretien obligatoire avec le responsable pédagogique.', 'entretien_obligatoire', 'Besoin d’un accompagnement ciblé.'],
    ['esther', 16.2, 90, 16, 17, 4, 17, 17, 'Très bonne analyse et restitution claire.', 'Prise de parole en public.', 'Atelier de présentation.', 'progression_normale', 'Très bonne progression.'],
    ['patrick', 12.6, 85, 12, 13, 2, 13, 14, 'Bon esprit d’équipe.', 'SQL avancé et storytelling data.', 'Exercices SQL supplémentaires.', 'surveillance', 'À consolider avant le projet final.'],
  ];
  for (const [stagiaire, averageValue, attendance, qcmAverage, tpAverage, competencies, implication, behavior, strengths, improvements, recommendations, decision, observations] of intermediateSeed) {
    await createRow('intermediate_evaluations', {
      stagiaire_id: stagiaires[stagiaire].id,
      date: '2026-10-15',
      average: averageValue,
      attendance_rate: attendance,
      qcm_average: qcmAverage,
      tp_average: tpAverage,
      competencies_acquired: competencies,
      implication_average: implication,
      behavior_average: behavior,
      strengths,
      improvements,
      recommendations,
      decision,
      observations,
      evaluator_id: users.pedagogie.id,
    });
  }

  const objectiveSeed = [
    ['sarah', 'Maîtriser les fondamentaux de React', 'Créer des composants réutilisables et gérer l’état local.', 'depasse', 'Objectif largement dépassé.'],
    ['sarah', 'Livrer un projet full-stack', 'Concevoir et déployer une application complète.', 'en_cours', 'Projet en cours de finalisation.'],
    ['sarah', 'Documenter une API', 'Rédiger une documentation OpenAPI claire.', 'non_commence', null],
    ['sarah', 'Présenter le projet final', 'Préparer une soutenance de dix minutes.', 'atteint', 'Soutenance blanche réussie.'],
    ['jeanluc', 'Maîtriser les hooks React', 'Utiliser useState et useEffect sans assistance.', 'non_atteint', 'Objectif à retravailler.'],
    ['jeanluc', 'Livrer un projet complet', 'Terminer le projet React dans les délais.', 'en_cours', 'Avancement partiel.'],
    ['david', 'Améliorer la ponctualité', 'Être présent à l’heure à toutes les séances.', 'en_cours', 'Amélioration progressive.'],
    ['david', 'Concevoir une API REST', 'Développer une API documentée avec Node.js.', 'non_commence', null],
    ['esther', 'Construire un tableau de bord Power BI', 'Restituer les ventes par région et produit.', 'atteint', 'Tableau de bord validé.'],
    ['esther', 'Nettoyer un jeu de données', 'Traiter les valeurs manquantes et aberrantes.', 'depasse', 'Nettoyage exemplaire.'],
    ['patrick', 'Maîtriser SQL avancé', 'Écrire des requêtes avec jointures et fenêtres.', 'en_cours', 'En consolidation.'],
    ['patrick', 'Raconter une histoire avec les données', 'Présenter une analyse synthétique et actionnable.', 'non_commence', null],
    ['alice', 'Réaliser le projet final', 'Livrer une application intranet complète.', 'atteint', 'Projet validé.'],
    ['alice', 'Réussir la soutenance', 'Présenter et défendre les choix techniques.', 'depasse', 'Soutenance remarquable.'],
    ['grace', 'Analyser les ventes', 'Produire un tableau de bord décisionnel.', 'atteint', 'Travail validé par le jury.'],
  ];
  for (const [stagiaire, title, description, status, validationComment] of objectiveSeed) {
    await createRow('stage_objectives', {
      stagiaire_id: stagiaires[stagiaire].id,
      title,
      description,
      status,
      validation_comment: validationComment,
    });
  }

  const journalSeed = [
    ['sarah', '2026-10-06', 'Développement de composants React pour le tableau de bord.', 'React', 7, 'Bonne autonomie sur la composition.', 'valide', users.formateurDev.id, 'Travail conforme.'],
    ['sarah', '2026-10-13', 'Mise en place des hooks et gestion des formulaires.', 'React', 7, 'Quelques difficultés sur useEffect.', 'commente', users.formateurDev.id, 'Revoir la gestion des dépendances.'],
    ['sarah', '2026-10-20', 'Intégration du routage et des appels API.', 'React / API', 8, 'Routage fonctionnel.', 'soumis', null, null],
    ['jeanluc', '2026-10-06', 'Création de composants de base et exercices pratiques.', 'React', 6, 'Doit revoir les props.', 'soumis', null, null],
    ['jeanluc', '2026-10-13', 'Exercices sur les hooks.', 'React', 5, 'Difficultés persistantes.', 'commente', users.formateurDev.id, 'Plan d’amélioration activé.'],
    ['david', '2026-10-20', 'Travail sur les formulaires React.', 'React', 6, 'Retard de 20 minutes.', 'soumis', null, null],
    ['esther', '2026-10-07', 'Nettoyage du jeu de données des ventes.', 'Python / pandas', 7, 'Bon traitement des valeurs manquantes.', 'valide', users.formateurData.id, 'Résultat de qualité.'],
    ['esther', '2026-10-14', 'Visualisation des ventes par région.', 'Python / matplotlib', 6, 'Graphiques pertinents.', 'soumis', null, null],
    ['patrick', '2026-10-09', 'Écriture de requêtes SQL avec jointures.', 'SQL', 5, 'Jointures à consolider.', 'commente', users.formateurData.id, 'Refaire les exercices 3 et 4.'],
    ['alice', '2026-01-12', 'Finalisation du portail intranet.', 'React / Node.js', 8, 'Livrable complet.', 'valide', users.formateurDev.id, 'Projet validé.'],
    ['alice', '2026-01-26', 'Préparation de la soutenance finale.', 'Communication', 4, 'Bonne structuration.', 'valide', users.formateurDev.id, 'Soutenance prête.'],
    ['grace', '2025-12-10', 'Construction du tableau de bord des ventes.', 'Power BI', 7, 'Modèle de données solide.', 'valide', users.formateurData.id, 'Validé.'],
  ];
  for (const [stagiaire, date, activity, competence, duration, observation, status, validatedBy, comment] of journalSeed) {
    await createRow('stage_journal', {
      stagiaire_id: stagiaires[stagiaire].id,
      date,
      activity,
      competence,
      duration_hours: duration,
      observation,
      status,
      validated_by: validatedBy ? validatedBy.id : null,
      comment,
    });
  }

  const finalProjects = {};
  finalProjects.sarah = await createRow('final_projects', {
    stagiaire_id: stagiaires.sarah.id,
    title: 'StageBuild - Portail de suivi des stagiaires',
    description: 'Application de gestion des stagiaires, des évaluations et des documents.',
    supervisor_id: users.formateurDev.id,
    objectives: 'Concevoir une application complète avec React, Node.js et PostgreSQL.',
    start_date: '2026-10-01',
    end_date: '2026-12-15',
    deliverables: ['Application déployée', 'Documentation technique', 'Présentation'],
    members: [],
    defense_date: '2026-12-18',
    jury: [],
    score: null,
    appreciation: null,
    comments: 'Projet en cours, première version fonctionnelle.',
    status: 'en_cours',
  });
  finalProjects.alice = await createRow('final_projects', {
    stagiaire_id: stagiaires.alice.id,
    title: 'Refonte du portail intranet',
    description: 'Modernisation du portail interne et migration vers React.',
    supervisor_id: users.formateurDev.id,
    objectives: 'Améliorer l’expérience utilisateur et réduire les temps de chargement.',
    start_date: '2025-10-01',
    end_date: '2026-01-31',
    deliverables: ['Application React', 'API Node.js', 'Guide de déploiement'],
    members: [],
    defense_date: '2026-02-06',
    jury: [
      { name: 'Claude Mukendi', role: 'Président du jury' },
      { name: 'Amani Nkulu', role: 'Superviseur technique' },
    ],
    score: 16.5,
    appreciation: 'Très bon travail, solution robuste et bien documentée.',
    comments: 'Projet validé à l’unanimité.',
    status: 'valide',
  });
  finalProjects.grace = await createRow('final_projects', {
    stagiaire_id: stagiaires.grace.id,
    title: 'Tableau de bord décisionnel des ventes',
    description: 'Analyse des ventes et restitution via Power BI.',
    supervisor_id: users.formateurData.id,
    objectives: 'Identifier les produits et régions les plus performants.',
    start_date: '2025-10-15',
    end_date: '2026-01-15',
    deliverables: ['Fichier PBIX', 'Rapport d’analyse', 'Présentation'],
    members: [],
    defense_date: '2026-01-23',
    jury: [
      { name: 'Claude Mukendi', role: 'Président du jury' },
      { name: 'Grâce Ilunga', role: 'Superviseure data' },
    ],
    score: 14.75,
    appreciation: 'Bon travail, analyse pertinente et bien présentée.',
    comments: 'Projet soutenu avec succès.',
    status: 'soutenu',
  });
  finalProjects.fabrice = await createRow('final_projects', {
    stagiaire_id: stagiaires.fabrice.id,
    title: 'Application de gestion de stock',
    description: 'Prototype de gestion des entrées et sorties de stock.',
    supervisor_id: users.formateurDev.id,
    objectives: 'Livrer une application fonctionnelle et sécurisée.',
    start_date: '2025-10-01',
    end_date: '2025-12-01',
    deliverables: ['Code source', 'Rapport'],
    members: [],
    defense_date: '2025-12-12',
    jury: [{ name: 'Amani Nkulu', role: 'Superviseur technique' }],
    score: 8.5,
    appreciation: 'Projet incomplet, fonctionnalités principales non abouties.',
    comments: 'Décision de non-validation.',
    status: 'non_valide',
  });
  finalProjects.esther = await createRow('final_projects', {
    stagiaire_id: stagiaires.esther.id,
    title: 'Analyse des performances commerciales',
    description: 'Étude des ventes et recommandations d’optimisation.',
    supervisor_id: users.formateurData.id,
    objectives: 'Produire une analyse actionnable pour la direction commerciale.',
    start_date: '2026-11-01',
    end_date: '2027-01-10',
    deliverables: ['Notebook', 'Tableau de bord', 'Recommandations'],
    members: [],
    defense_date: '2027-01-15',
    jury: [],
    score: null,
    appreciation: null,
    comments: 'Projet en cours.',
    status: 'en_cours',
  });
  finalProjects.patrick = await createRow('final_projects', {
    stagiaire_id: stagiaires.patrick.id,
    title: 'Tableau de bord RH',
    description: 'Ancien projet archivé après réorientation du stagiaire.',
    supervisor_id: users.formateurData.id,
    objectives: 'Suivre les indicateurs RH.',
    start_date: '2026-09-20',
    end_date: '2026-10-01',
    deliverables: ['Maquette'],
    members: [],
    defense_date: null,
    jury: [],
    score: null,
    appreciation: null,
    comments: 'Projet abandonné au profit d’un sujet data.',
    status: 'archive',
  });

  console.log('Étape 11/14: plans, évaluations intermédiaires, objectifs et journal prêts.');

  const finalEvaluations = {};
  const finalEvaluationSeed = [
    ['alice', { modules: 15.2, qcm: 14, tp: 16, project: 16.5, implication: 17, professionalism: 18, attendance: 95, final: 15.8, decision: 'valide', appreciation: 'Stage validé avec mention. Très bon niveau technique et excellente posture professionnelle.', published: '2026-02-20T10:00:00Z' }],
    ['grace', { modules: 14.5, qcm: 13, tp: 15, project: 14.75, implication: 16, professionalism: 17, attendance: 92, final: 14.9, decision: 'valide', appreciation: 'Stage validé. Analyse de qualité et bonne capacité de restitution.', published: '2026-02-05T09:30:00Z' }],
    ['fabrice', { modules: 8.5, qcm: 7, tp: 9, project: 8.5, implication: 9, professionalism: 10, attendance: 60, final: 8.7, decision: 'non_valide', appreciation: 'Stage non validé en raison des absences et d’un projet incomplet.', published: null }],
    ['sarah', { modules: 14.8, qcm: 16, tp: 15.5, project: null, implication: 17, professionalism: 18, attendance: 92, final: 15.4, decision: 'en_attente', appreciation: 'Très bonne progression, en attente du projet final.', published: null }],
    ['esther', { modules: 15.5, qcm: 15, tp: 16, project: null, implication: 16, professionalism: 17, attendance: 90, final: 15.6, decision: 'en_attente', appreciation: 'Très bon niveau, projet final en cours.', published: null }],
    ['patrick', { modules: 12.4, qcm: 11, tp: 13, project: null, implication: 13, professionalism: 14, attendance: 85, final: 12.5, decision: 'en_attente', appreciation: 'Résultats corrects, consolidation nécessaire en SQL.', published: null }],
  ];
  for (const [stagiaire, values] of finalEvaluationSeed) {
    finalEvaluations[stagiaire] = await createRow('final_evaluations', {
      stagiaire_id: stagiaires[stagiaire].id,
      modules_average: values.modules,
      qcm_average: values.qcm,
      tp_average: values.tp,
      project_average: values.project,
      implication_average: values.implication,
      professionalism_average: values.professionalism,
      attendance_rate: values.attendance,
      coefficients: { modules: 40, qcm: 10, tp: 20, project: 20, implication: 5, professionalism: 5 },
      final_average: values.final,
      decision: values.decision,
      appreciation: values.appreciation,
      validated_by: values.decision === 'en_attente' ? null : users.pedagogie.id,
      published_at: values.published,
    });
  }

  function bulletinContent(stagiaire, finalEvaluation, modulesAverage, attendanceRate) {
    return {
      organization: { name: 'StageBuild', address: 'Plateforme de gestion et de suivi des stagiaires' },
      stagiaire: {
        id: stagiaire.id,
        matricule: stagiaire.matricule,
        nom: `${stagiaire.prenom} ${stagiaire.nom}`,
        domaine: stagiaire.domaine,
        specialite: stagiaire.specialite,
      },
      final: {
        modules_average: finalEvaluation.modules_average,
        qcm_average: finalEvaluation.qcm_average,
        tp_average: finalEvaluation.tp_average,
        project_average: finalEvaluation.project_average,
        implication_average: finalEvaluation.implication_average,
        professionalism_average: finalEvaluation.professionalism_average,
        attendance_rate: finalEvaluation.attendance_rate,
        final_average: finalEvaluation.final_average,
        decision: finalEvaluation.decision,
        appreciation: finalEvaluation.appreciation,
      },
      modules: modulesAverage,
      attendance_rate: attendanceRate,
      generated_at: '2026-10-24T18:00:00.000Z',
    };
  }

  const bulletinSeed = [
    ['alice', '2026-02', 'publie', 95, [{ name: 'Algorithmique et structures de données', average: 15.5, coefficient: 2 }], users.pedagogie.id, users.direction.id, '2026-02-20T11:00:00Z'],
    ['grace', '2026-01', 'archive', 92, [{ name: 'Python pour la data', average: 15, coefficient: 2 }, { name: 'SQL avancé', average: 14, coefficient: 2 }], users.pedagogie.id, users.direction.id, '2026-02-05T10:00:00Z'],
    ['fabrice', '2026-02', 'brouillon', 60, [{ name: 'JavaScript moderne', average: 8.5, coefficient: 2 }], users.formateurDev.id, null, null],
    ['sarah', '2026-10', 'valide', 92, [{ name: 'JavaScript moderne', average: 15.2, coefficient: 2 }, { name: 'React & interfaces', average: 15.7, coefficient: 3 }], users.pedagogie.id, null, null],
  ];
  for (const [stagiaire, period, status, attendance, modulesAverage, generatedBy, publishedBy, publishedAt] of bulletinSeed) {
    await createRow('bulletins', {
      stagiaire_id: stagiaires[stagiaire].id,
      final_evaluation_id: finalEvaluations[stagiaire].id,
      period,
      content: bulletinContent(stagiaires[stagiaire], finalEvaluations[stagiaire], modulesAverage, attendance),
      status,
      generated_by: generatedBy.id,
      generated_at: iso(publishedAt ?? '2026-10-24T18:00:00Z'),
      published_by: publishedBy ? publishedBy.id : null,
      published_at: publishedAt ? iso(publishedAt) : null,
      file_url: `https://files.stagebuild.local/bulletins/${stagiaires[stagiaire].matricule}-${period}.pdf`,
    });
  }

  console.log('Étape 12/14: projets finaux, évaluations finales et bulletins prêts.');

  const documentSeed = [
    ['sarah', 'fiche_inscription', 'Fiche d’inscription - Sarah Mwamba', users.administration.id, { formation: 'Développement Web Full-Stack', promotion: 'DEV-2026-A', date: '2026-09-01' }],
    ['sarah', 'fiche_stagiaire', 'Fiche stagiaire - Sarah Mwamba', users.administration.id, { matricule: 'STG-2026-001', nom: 'Sarah Mwamba', statut: 'actif' }],
    ['sarah', 'carte_stagiaire', 'Carte de stagiaire - Sarah Mwamba', users.administration.id, { matricule: 'STG-2026-001', validite: '2027-02-28' }],
    ['alice', 'attestation_stage', 'Attestation de stage - Alice Mbayo', users.administration.id, { date_debut: '2025-09-01', date_fin: '2026-02-28', formation: 'Développement Web Full-Stack' }],
    ['alice', 'certificat_reussite', 'Certificat de réussite - Alice Mbayo', users.pedagogie.id, { final_average: 15.8, mention: 'Bien' }],
    ['alice', 'releve_notes', 'Relevé de notes - Alice Mbayo', users.pedagogie.id, { modules: [{ name: 'React', score: 16.5 }], final_average: 15.8 }],
    ['alice', 'bulletin', 'Bulletin - Alice Mbayo - 2026-02', users.pedagogie.id, { period: '2026-02', final_average: 15.8 }],
    ['alice', 'fiche_evaluation_finale', 'Fiche d’évaluation finale - Alice Mbayo', users.pedagogie.id, { decision: 'valide', final_average: 15.8 }],
    ['grace', 'certificat_formation', 'Certificat de formation - Grâce Muteba', users.pedagogie.id, { formation: 'Data Analyse & Business Intelligence', mention: 'Assez bien' }],
    ['grace', 'rapport_stage', 'Rapport de stage - Grâce Muteba', users.administration.id, { projet: 'Tableau de bord décisionnel des ventes', score: 14.75 }],
    ['fabrice', 'rapport_evaluation', 'Rapport d’évaluation - Fabrice Lukusa', users.pedagogie.id, { decision: 'non_valide', final_average: 8.7 }],
  ];
  for (const [stagiaire, type, title, generatedBy, content] of documentSeed) {
    await createRow('documents', {
      stagiaire_id: stagiaires[stagiaire].id,
      type,
      title,
      file_url: `https://files.stagebuild.local/documents/${stagiaires[stagiaire].matricule}-${type}.pdf`,
      content,
      generated_by: generatedBy.id,
    });
  }

  console.log('Étape 13/14: documents prêts.');

  const notificationSeed = [
    [users.direction.id, null, 'Bulletin publié - Alice Mbayo', 'Le bulletin de la promotion DEV 2025-B est disponible.', 'bulletin', 'email', 'read', '/app/bulletins', '2026-02-20T12:00:00Z'],
    [users.formation.id, stagiaires.jonathan.id, 'Inscription en attente - Jonathan Ilunga', 'Une nouvelle candidature attend une validation.', 'info', 'internal', 'unread', '/app/inscriptions', null],
    [users.pedagogie.id, stagiaires.sarah.id, 'Évaluation finale à valider - Sarah Mwamba', 'Les résultats intermédiaires sont prêts pour contrôle.', 'resultat', 'internal', 'unread', '/app/evaluation-finale', null],
    [users.formateurDev.id, null, 'TP React à corriger', 'Quatre soumissions attendent une correction.', 'echeance', 'internal', 'unread', '/app/travaux', null],
    [users.formateurData.id, null, 'Séance Python planifiée', 'La séance projet guidé est prévue le 28 octobre.', 'evaluation', 'internal', 'read', '/app/seances', '2026-10-22T08:00:00Z'],
    [users.maitre.id, stagiaires.sarah.id, 'Journal de stage à commenter', 'Sarah a soumis une nouvelle entrée de journal.', 'info', 'internal', 'unread', '/app/journal', null],
    [users.stagiaire.id, stagiaires.sarah.id, 'Votre bulletin est validé', 'Le bulletin de la période 2026-10 est disponible.', 'bulletin', 'internal', 'read', '/app/bulletins', '2026-10-24T09:00:00Z'],
    [users.stagiaire.id, stagiaires.sarah.id, 'Nouvelle note publiée en React', 'Une note du devoir React a été publiée.', 'resultat', 'email', 'unread', '/app/notes', null],
    [users.stagiaire.id, stagiaires.sarah.id, 'Affectation confirmée - Groupe A', 'Votre affectation au groupe A est confirmée.', 'affectation', 'internal', 'read', '/app/affectations', '2026-09-05T08:00:00Z'],
    [users.rh.id, stagiaires.jeanluc.id, 'Plan d’amélioration en cours - Jean-Luc Mbuyi', 'Un plan d’amélioration a été ouvert pour ce stagiaire.', 'plan', 'internal', 'read', '/app/plans', '2026-10-02T09:00:00Z'],
    [users.formateurDev.id, stagiaires.david.id, 'Absence non justifiée enregistrée', 'David Kasongo a été marqué absent sans justificatif.', 'presence', 'internal', 'unread', '/app/presences', null],
    [users.administration.id, stagiaires.merveille.id, 'Bienvenue à StageBuild', 'Votre dossier d’admission est complet. Bienvenue !', 'info', 'sms', 'read', '/app/stagiaires', '2026-09-20T10:00:00Z'],
    [users.formateurDev.id, null, 'Séance dans 15 minutes', 'La séance React commence à 14 h 00.', 'echeance', 'push', 'unread', '/app/seances', null],
    [users.auditeur.id, null, 'Nouvel audit disponible', 'Les journaux d’audit de la semaine sont disponibles.', 'info', 'internal', 'unread', '/app/audit', null],
    [users.stagiaire.id, stagiaires.esther.id, 'Rappel TP Power BI', 'Le TP est à rendre avant le 23 octobre.', 'echeance', 'internal', 'unread', '/app/travaux', null],
  ];
  for (const [userId, stagiaireId, title, message, type, channel, status, link, readAt] of notificationSeed) {
    await createRow('notifications', {
      user_id: userId,
      stagiaire_id: stagiaireId,
      title,
      message,
      type,
      channel,
      status,
      link,
      read_at: readAt ? iso(readAt) : null,
    });
  }

  console.log('Étape 14/14: notifications prêtes.');

  const auditSeed = [
    [admin.id, 'create', 'stagiaires', stagiaires.sarah.id, null, { matricule: 'STG-2026-001', statut: 'actif' }, 'Création du dossier stagiaire', null, '192.168.10.21'],
    [users.formation.id, 'update', 'affectations', affectations.jeanluc.id, { groupe: 'B' }, { groupe: 'A' }, 'Réaffectation demandée par le formateur', users.formation.id, '192.168.10.32'],
    [users.pedagogie.id, 'validate', 'notes', null, { statut: 'soumise' }, { statut: 'validee' }, 'Validation des notes React', users.pedagogie.id, '192.168.10.33'],
    [users.direction.id, 'publish', 'bulletins', null, { statut: 'valide' }, { statut: 'publie' }, 'Publication du bulletin DEV 2025-B', users.direction.id, '192.168.10.34'],
    [users.formateurDev.id, 'create', 'evaluations', evaluations['qcm-js'].id, null, { title: 'QCM JavaScript fondamentaux', type: 'qcm' }, 'Création du QCM', null, '192.168.10.35'],
    [users.pedagogie.id, 'publish', 'final_evaluations', finalEvaluations.grace.id, { decision: 'en_attente' }, { decision: 'valide', final_average: 14.9 }, 'Validation finale après délibération', users.direction.id, '192.168.10.36'],
    [admin.id, 'update', 'settings', organization?.id ?? null, { name: 'FLASH EMPIRE' }, { name: 'StageBuild' }, 'Mise à jour de l’identité de l’organisation', admin.id, '192.168.10.21'],
    [users.administration.id, 'create', 'documents', null, null, { type: 'certificat_reussite', stagiaire: 'Alice Mbayo' }, 'Génération du certificat de réussite', null, '192.168.10.37'],
    [users.auditeur.id, 'login', 'users', users.auditeur.id, null, { email: 'auditeur@stagebuild.local' }, 'Connexion auditeur', null, '192.168.10.40'],
    [admin.id, 'delete', 'notifications', null, { title: 'Brouillon de notification' }, null, 'Suppression d’un brouillon', null, '192.168.10.21'],
  ];
  for (const [userId, action, entity, entityId, oldValues, newValues, reason, validatedBy, ipAddress] of auditSeed) {
    await createRow('audit_logs', {
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      reason,
      validated_by: validatedBy,
      ip_address: ipAddress,
      created_at: iso('2026-10-24T12:00:00Z'),
    });
  }

  try {
    const roleResult = await sql('SELECT id, name FROM roles');
    const roleIds = Object.fromEntries((roleResult.rows ?? []).map(([id, name]) => [name, id]));
    const userRoles = [
      [admin.id, 'admin'],
      [users.direction.id, 'direction'],
      [users.formation.id, 'responsable_formation'],
      [users.pedagogie.id, 'responsable_pedagogique'],
      [users.formateurDev.id, 'formateur'],
      [users.formateurData.id, 'formateur'],
      [users.maitre.id, 'maitre_stage'],
      [users.administration.id, 'administration'],
      [users.stagiaire.id, 'stagiaire'],
      [users.rh.id, 'rh'],
      [users.auditeur.id, 'auditeur'],
    ].filter(([, role]) => roleIds[role]);
    for (const [userId, role] of userRoles) {
      await sql(`INSERT INTO user_roles (user_id, role_id) VALUES ('${userId}', '${roleIds[role]}')`);
    }
  } catch (error) {
    console.warn(`user_roles non alimenté: ${error.message}`);
  }

  console.log('Seed StageBuild terminé.');
  console.log(`Utilisateurs: ${Object.keys(users).length + 1} | Stagiaires: ${Object.keys(stagiaires).length} | Formations: ${Object.keys(formationsByKey).length}`);
  console.log(`Modules: ${Object.keys(modules).length} | Promotions: ${Object.keys(promotions).length} | Séances: ${Object.keys(seances).length}`);
  console.log('Comptes de démonstration : mot de passe Admin@123 (admin@stagebuild.local, direction@stagebuild.local, formateur.dev@stagebuild.local, stagiaire@stagebuild.local).');
}

try {
  if (process.argv.includes('--reset')) {
    await reset();
  }
  await main();
} catch (error) {
  console.error(`Échec du seed: ${error.message}`);
  console.error('Des données partielles peuvent subsister. Relancez avec --reset pour repartir proprement.');
  process.exit(1);
}
