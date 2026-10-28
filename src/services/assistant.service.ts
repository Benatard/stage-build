import guideText from '../../docs/GUIDE_UTILISATION_STAGEBUILD.txt?raw';
import type { Role } from '@/types/domain';

export type AssistantSource = {
  section: number;
  sectionTitle: string;
  subheading?: string;
  path?: string;
};

export type AssistantReply = {
  answer: string;
  sources: AssistantSource[];
  suggestions: string[];
};

type GuideBlock = {
  id: string;
  section: number;
  sectionTitle: string;
  subheading?: string;
  content: string;
  path?: string;
  titleTokens: string[];
  subheadingTokens: string[];
  contentTokens: string[];
  normalizedContent: string;
};

type GuideSection = {
  number: number;
  title: string;
  content: string;
  path?: string;
  blocks: GuideBlock[];
};

type ScoredBlock = {
  block: GuideBlock;
  score: number;
};

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'd', 'l', 'a', 'au', 'aux',
  'et', 'ou', 'en', 'dans', 'pour', 'par', 'sur', 'avec', 'sans', 'ce', 'cette',
  'ces', 'cet', 'mon', 'ma', 'mes', 'votre', 'vos', 'son', 'sa', 'ses', 'je',
  'j', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'comment', 'pourquoi',
  'quand', 'quel', 'quelle', 'quels', 'quelles', 'est', 'sont', 'etre', 'avoir',
  'fait', 'faire', 'faut', 'ne', 'pas', 'plus', 'que', 'qui', 'quoi', 'dont',
  'si', 'comme', 'application', 'stagebuild', 'page', 'guide', 'systeme', 'svp',
  'stp', 'merci', 'bonjour', 'salut', 'bonsoir', 'hello',
]);

const SYNONYMS: Record<string, string[]> = {
  note: ['notes', 'resultat', 'resultats', 'moyenne', 'cote', 'evaluation'],
  presence: ['presences', 'appel', 'absent', 'absences', 'present', 'retard'],
  inscription: ['inscrire', 'inscrit', 'enregistrer', 'dossier'],
  reservation: ['reserver', 'confirmer', 'candidat'],
  compte: ['connexion', 'connecter', 'identifiant', 'identifiants', 'utilisateur', 'motdepasse'],
  connexion: ['connecter', 'identifiant', 'compte', 'motdepasse'],
  motdepasse: ['password', 'connexion', 'identifiant'],
  bulletin: ['resultats', 'moyenne', 'document'],
  document: ['attestation', 'certificat', 'carte', 'releve', 'fichier'],
  qcm: ['quiz', 'questionnaire', 'question'],
  tp: ['travaux', 'pratiques', 'travail'],
  erreur: ['probleme', 'panne', 'impossible', 'bloque', 'echec', 'bug'],
  supprimer: ['suppression', 'effacer', 'retirer'],
  creer: ['creation', 'ajouter', 'nouveau', 'nouvelle'],
  modifier: ['modification', 'changer', 'mettre'],
  imprimer: ['impression', 'print', 'fiche'],
  exporter: ['export', 'csv', 'telecharger'],
  presence_seance: ['seance', 'appel', 'feuille'],
  stagiaire: ['stagiaires', 'candidat', 'etudiant'],
  formateur: ['enseignant', 'professeur'],
  role: ['roles', 'permission', 'permissions', 'acces'],
  archive: ['archiver', 'archivage', 'restaurer'],
  archiver: ['archive', 'archivage', 'restaurer'],
  archivage: ['archiver', 'archive', 'restaurer'],
  assistant: ['aide', 'aider', 'ia', 'chatbot'],
  ia: ['assistant', 'aide', 'chatbot'],
  aide: ['assistant', 'aider', 'support'],
  fiche: ['imprimer', 'impression', 'presence'],
  appel: ['presence', 'presences', 'feuille'],
  mot: ['motdepasse'],
  passe: ['motdepasse'],
  planning: ['seance', 'seances', 'emploi', 'temps', 'calendrier'],
  calendrier: ['seance', 'seances', 'planning', 'emploi', 'temps'],
  liste: ['rechercher', 'recherche', 'filtrer', 'filtre'],
  rechercher: ['recherche', 'liste', 'filtrer', 'filtre'],
  pdf: ['exporter', 'export', 'imprimer', 'document'],
  email: ['mail', 'courriel', 'notification', 'envoyer'],
  mail: ['email', 'courriel', 'notification', 'envoyer'],
  courriel: ['email', 'mail', 'notification', 'envoyer'],
  telephone: ['tel', 'portable', 'contact', 'profil'],
  photo: ['image', 'avatar', 'profil'],
  profil: ['compte', 'information', 'telephone', 'photo', 'adresse'],
  securite: ['motdepasse', 'connexion', 'acces', 'role', 'permission'],
  sauvegarde: ['archivage', 'archive', 'restaurer', 'export'],
  restaurer: ['archivage', 'archive', 'restauration'],
  rapport: ['export', 'statistique', 'statistiques', 'csv', 'pdf'],
  statistique: ['rapport', 'statistiques', 'export', 'tableau'],
  bouton: ['menu', 'action', 'cliquer', 'onglet'],
  menu: ['navigation', 'onglet', 'bouton'],
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ');
}

function stem(word: string): string {
  if (word.length <= 4) return word;

  const suffixes = [
    'issements', 'issement', 'ements', 'ement', 'ations', 'ation', 'issions',
    'ission', 'ances', 'ance', 'ences', 'ence', 'iques', 'ique', 'euses', 'euse',
    'ables', 'able', 'ibles', 'ible', 'er', 'ez', 'ant', 'ent', 'ons', 'es', 's',
  ];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map(stem)
    .filter(Boolean);
}

const SYNONYM_TOKENS = new Map<string, Set<string>>();

Object.entries(SYNONYMS).forEach(([key, aliases]) => {
  const tokens = new Set<string>([stem(normalize(key))]);
  aliases.forEach((alias) => tokenize(alias).forEach((token) => tokens.add(token)));

  tokens.forEach((token) => {
    const cluster = SYNONYM_TOKENS.get(token) ?? new Set<string>();
    tokens.forEach((value) => cluster.add(value));
    SYNONYM_TOKENS.set(token, cluster);
  });
});

function expandQueryTokens(value: string): string[] {
  const base = tokenize(value);
  const expanded = new Set(base);

  base.forEach((word) => {
    SYNONYM_TOKENS.get(word)?.forEach((token) => expanded.add(token));
  });

  return Array.from(expanded);
}

function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > 2) return 3;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];

    for (let col = 1; col <= right.length; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      current[col] = Math.min(
        previous[col] + 1,
        current[col - 1] + 1,
        previous[col - 1] + cost,
      );
    }

    previous = current;
  }

  return previous[right.length];
}

function tokensMatch(left: string, right: string): boolean {
  if (left === right) return true;

  const shortest = Math.min(left.length, right.length);
  if (shortest < 5) return false;
  if (left.startsWith(right) || right.startsWith(left)) return true;

  if (shortest < 6 || Math.abs(left.length - right.length) > 2) return false;
  if (left.slice(0, 2) !== right.slice(0, 2)) return false;

  return editDistance(left, right) <= (shortest >= 9 ? 2 : 1);
}

function cleanSubheading(value?: string): string | undefined {
  return value?.replace(/^\d+\.\d+\s+/, '').trim() || undefined;
}

function splitBlocks(section: {
  number: number;
  title: string;
  content: string;
  path?: string;
}): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  const lines = section.content.split(/\r?\n/);
  let subheading: string | undefined;
  let currentLines: string[] = [];
  let blockIndex = 0;

  const pushBlock = () => {
    const content = currentLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!content) return;

    blocks.push({
      id: `${section.number}-${blockIndex}`,
      section: section.number,
      sectionTitle: section.title,
      subheading,
      content,
      path: section.path,
      titleTokens: tokenize(`${section.title} ${subheading ?? ''}`),
      subheadingTokens: subheading ? tokenize(subheading) : [],
      contentTokens: tokenize(content),
      normalizedContent: normalize(content),
    });
    blockIndex += 1;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (/^(Page|Menu|Accès)\s*:/.test(line)) return;

    const heading = line.trim().match(/^(\d+\.\d+)\s+(.+)$/);
    if (heading) {
      pushBlock();
      subheading = `${heading[1]} ${heading[2].trim()}`;
      currentLines = [];
      return;
    }

    currentLines.push(line);
  });

  pushBlock();
  return blocks;
}

function parseGuide(raw: string): GuideSection[] {
  const sections: GuideSection[] = [];
  const pattern =
    /^-{80}\r?\n(\d+)\.\s+([^\r\n]+)\r?\n-{80}\r?\n([\s\S]*?)(?=^-{80}\r?\n\d+\.\s+[^\r\n]+\r?\n-{80}|^={80}\r?\nPARTIE|(?![\s\S]))/gm;

  for (const match of raw.matchAll(pattern)) {
    const number = Number(match[1]);
    const title = match[2].trim();
    const content = match[3].trim();
    const path = content.match(/^Page\s*:\s*(\S+)/m)?.[1];

    const section: GuideSection = {
      number,
      title,
      content,
      path,
      blocks: [],
    };
    section.blocks = splitBlocks(section);
    sections.push(section);
  }

  return sections;
}

const guideSections = parseGuide(guideText);
const guideBlocks = guideSections.flatMap((section) => section.blocks);

function roleSuggestions(role?: Role): string[] {
  if (role === 'stagiaire') {
    return [
      'Comment consulter mes notes ?',
      'Comment voir mes présences ?',
      'Comment télécharger mon bulletin ?',
      'Que faire si je n’arrive pas à me connecter ?',
    ];
  }

  if (role === 'formateur') {
    return [
      'Comment faire l’appel d’une séance ?',
      'Comment saisir une note ?',
      'Comment organiser un QCM ?',
      'Comment créer un travail pratique ?',
    ];
  }

  if (role === 'maitre_stage') {
    return [
      'Comment ajouter une observation ?',
      'Comment suivre le journal de stage ?',
      'Comment évaluer les objectifs de stage ?',
      'Comment consulter le dossier d’un stagiaire ?',
    ];
  }

  return [
    'Comment inscrire un stagiaire ?',
    'Comment confirmer une réservation ?',
    'Comment générer un bulletin ?',
    'Que faire si un utilisateur n’arrive pas à se connecter ?',
  ];
}

function roleLabel(role?: Role): string {
  if (role === 'stagiaire') return 'votre espace stagiaire';
  if (role === 'formateur') return 'vos page pédagogiques';
  if (role === 'maitre_stage') return 'le suivi de stage';
  return 'les pages de gestion';
}

function sourceFromBlock(block: GuideBlock): AssistantSource {
  return {
    section: block.section,
    sectionTitle: block.sectionTitle,
    subheading: block.subheading,
    path: block.path,
  };
}

function buildExcerpt(content: string): string {
  const trimmed = content.replace(/\r/g, '').replace(/[ \t]+$/gm, '').trim();
  if (trimmed.length <= 1800) return trimmed;
  return `${trimmed.slice(0, 1800).replace(/\s+\S*$/, '').trim()}…`;
}

type StagiaireHint = {
  pattern: RegExp;
  sections: number[];
  boost: number;
  subheading?: RegExp;
};

const QUERY_HINTS: StagiaireHint[] = [
  { pattern: /\b(inscri|inscription|inscrit)\b/, sections: [8], boost: 6 },
  { pattern: /\b(inscri|inscription|inscrit)\b/, sections: [8], boost: 4, subheading: /inscri/i },
  { pattern: /\b(identifiant|identifiants)\b/, sections: [8], boost: 8 },
  { pattern: /\b(identifiant|identifiants)\b/, sections: [8], boost: 4, subheading: /inscri/i },
  { pattern: /\b(envoyer|envoi|envoye)\b/, sections: [8], boost: 4, subheading: /inscri/i },
  { pattern: /\b(imprim\w*|impression)\b/, sections: [15], boost: 8, subheading: /imprim|export|fiche/i },
  { pattern: /\b(imprim\w*|impression)\b/, sections: [31], boost: 6, subheading: /imprim/i },
  { pattern: /\b(bulletin|bulletins)\b/, sections: [31], boost: 4 },
  { pattern: /\b(bulletin|bulletins)\b/, sections: [31], boost: 6, subheading: /bulletin/i },
  {
    pattern: /\bpublier\b.*\bnotes?\b|\bnotes?\b.*\bpublier\b/,
    sections: [17],
    boost: 14,
    subheading: /publication|publier/i,
  },
  { pattern: /\b(note|notes|resultat|resultats)\b/, sections: [17], boost: 2 },
  { pattern: /\b(qcm|quiz)\b/, sections: [18], boost: 2 },
  { pattern: /\b(reservation|reservations|reserver)\b/, sections: [10], boost: 4 },
  { pattern: /\b(compte|comptes|utilisateur|utilisateurs)\b/, sections: [34], boost: 2 },
  { pattern: /\b(motdepasse|connexion)\b/, sections: [34], boost: 4 },
  { pattern: /\b(archiv\w*)\b/, sections: [37], boost: 4 },
  { pattern: /\b(seance|seances)\b/, sections: [14], boost: 2 },
  { pattern: /\b(formation|formations)\b/, sections: [11], boost: 2 },
  { pattern: /\b(document|documents)\b/, sections: [32], boost: 2 },
  { pattern: /\b(notification|notifications)\b/, sections: [38], boost: 2 },
  { pattern: /\b(parametre|parametres)\b/, sections: [36], boost: 2 },
];

const STAGIAIRE_HINTS: StagiaireHint[] = [
  { pattern: /\b(note|notes|resultat|resultats|moyenne)\b/, sections: [47], boost: 12 },
  { pattern: /\b(evaluation|evaluations)\b/, sections: [46], boost: 6 },
  { pattern: /\b(presence|presences|absence|absences)\b/, sections: [45], boost: 18 },
  { pattern: /\b(qcm|quiz)\b/, sections: [48], boost: 6 },
  { pattern: /\b(travaux|tp|pratique|pratiques)\b/, sections: [49], boost: 6 },
  { pattern: /\b(competence|competences)\b/, sections: [50], boost: 4 },
  { pattern: /\b(progression)\b/, sections: [51], boost: 4 },
  { pattern: /\b(journal)\b/, sections: [52], boost: 4 },
  { pattern: /\b(objectif|objectifs)\b/, sections: [53], boost: 4 },
  { pattern: /\b(bulletin|bulletins)\b/, sections: [54], boost: 6 },
  { pattern: /\b(bulletin|bulletins)\b/, sections: [54], boost: 6, subheading: /bulletin/i },
  { pattern: /\b(document|documents)\b/, sections: [54], boost: 6, subheading: /document/i },
  { pattern: /\b(profil|telephone|adresse)\b/, sections: [42], boost: 6 },
  { pattern: /\b(formation|module|modules)\b/, sections: [43], boost: 4 },
  { pattern: /\b(notification|notifications)\b/, sections: [44], boost: 4 },
  { pattern: /\b(parametre|parametres|theme|historique)\b/, sections: [55], boost: 4 },
];

function hintBoost(block: GuideBlock, normalizedQuestion: string, hints: StagiaireHint[]): number {
  return hints.reduce((boost, hint) => {
    if (!hint.sections.includes(block.section)) return boost;
    if (!hint.pattern.test(normalizedQuestion)) return boost;
    if (hint.subheading && !hint.subheading.test(block.subheading ?? '')) return boost;
    return boost + hint.boost;
  }, 0);
}

function matchScore(question: string, role: Role | undefined, previousSection?: number): ScoredBlock[] {
  const queryTokens = expandQueryTokens(question);
  const normalizedQuestion = normalize(question).trim();
  const sectionMatch = normalizedQuestion.match(/\bsection\s+(\d+)\b/);
  const pathMatch = normalizedQuestion.match(/\/app\/[a-z0-9/_-]+/);

  if (queryTokens.length === 0) return [];

  return guideBlocks
    .map((block) => {
      let score = 0;

      queryTokens.forEach((queryToken) => {
        if (block.titleTokens.some((titleToken) => tokensMatch(queryToken, titleToken))) {
          score += 9;
        }

        if (block.subheadingTokens.some((subheadingToken) => tokensMatch(queryToken, subheadingToken))) {
          score += 4;
        }

        if (block.contentTokens.some((contentToken) => tokensMatch(queryToken, contentToken))) {
          score += 1;
        }
      });

      if (normalizedQuestion.length >= 6 && block.normalizedContent.includes(normalizedQuestion)) {
        score += 12;
      }

      if (sectionMatch && block.section === Number(sectionMatch[1])) {
        score += 24;
      }

      if (pathMatch && block.path) {
        const blockPath = block.path.toLowerCase();
        const queryPath = pathMatch[0].replace(/\/+$/, '');
        if (
          blockPath === queryPath ||
          blockPath.startsWith(`${queryPath}/`) ||
          queryPath.startsWith(`${blockPath}/`)
        ) {
          score += 20;
        }
      }

      if (score === 0) return { block, score: 0 };

      if (role === 'stagiaire') {
        if (block.section >= 40 && block.section <= 55) score += 12;
        score += hintBoost(block, normalizedQuestion, STAGIAIRE_HINTS);
      } else {
        score += hintBoost(block, normalizedQuestion, QUERY_HINTS);
        if (block.section >= 6 && block.section <= 39) score += 2;
      }

      if (previousSection === block.section) {
        score += 2;
      }

      return { block, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

function relatedSuggestions(results: ScoredBlock[], role?: Role): string[] {
  const suggestions = new Set<string>();

  results.slice(0, 2).forEach((result) => {
    const label = cleanSubheading(result.block.subheading) ?? result.block.sectionTitle.toLowerCase();
    suggestions.add(`Que dit le guide sur « ${label} » ?`);
  });

  roleSuggestions(role).forEach((suggestion) => suggestions.add(suggestion));
  return Array.from(suggestions).slice(0, 4);
}

function greetingReply(role?: Role): AssistantReply {
  return {
    answer:
      `Bonjour. Je suis l’assistant StageBuild. Je réponds à partir du guide utilisateur, ` +
      `avec des réponses adaptées à ${roleLabel(role)}.\n\n` +
      'Posez-moi une question sur une page, une procédure, un rôle, une erreur ou un résultat.',
    sources: [],
    suggestions: roleSuggestions(role),
  };
}

function capabilityReply(role?: Role): AssistantReply {
  return {
    answer:
      'Je peux vous aider à :\n' +
      '- trouver la bonne page pour une action ;\n' +
      '- dérouler une procédure étape par étape ;\n' +
      '- comprendre un statut, un rôle ou une permission ;\n' +
      '- diagnostiquer un problème courant ;\n' +
      '- retrouver les bons écrans pour les notes, présences, bulletins, documents, QCM et réservations.\n\n' +
      'Je ne modifie aucune donnée : je vous guide dans le système.',
    sources: [],
    suggestions: roleSuggestions(role),
  };
}

function fallbackReply(role?: Role): AssistantReply {
  return {
    answer:
      'Je n’ai pas trouvé de passage assez précis dans le guide utilisateur. ' +
      'Reformulez avec l’action et la page concernée, par exemple : « inscrire un stagiaire », ' +
      '« publier une note », « confirmer une réservation » ou « mot de passe perdu ».',
    sources: [],
    suggestions: roleSuggestions(role),
  };
}

function buildLead(question: string): string {
  const normalized = normalize(question);

  if (
    /\b(erreur|probleme|panne|impossible|bloque|echec|bug|fonctionne pas|marche pas)\b/.test(
      normalized,
    )
  ) {
    return 'Voici les points à vérifier et la procédure de référence.\n\n';
  }

  if (
    /^(ou|a quel endroit)\b/.test(normalized) ||
    /\bou (se trouve|trouver|est)\b/.test(normalized)
  ) {
    return 'Voici où trouver cette fonction dans l’application.\n\n';
  }

  if (/\b(comment|procedure|etapes|etape|faire)\b/.test(normalized)) {
    return 'Voici la procédure à suivre.\n\n';
  }

  if (/^pourquoi\b/.test(normalized)) {
    return 'Voici l’explication et les règles associées.\n\n';
  }

  if (/^quand\b/.test(normalized)) {
    return 'Voici quand et dans quel cas utiliser cette fonction.\n\n';
  }

  if (/\b(qui|role|permission|droit|acces)\b/.test(normalized)) {
    return 'Voici les règles et le rôle concernés.\n\n';
  }

  return '';
}

export function askAssistant(
  question: string,
  options: { role?: Role; previousSection?: number } = {},
): AssistantReply {
  const trimmed = question.trim();
  if (!trimmed) return fallbackReply(options.role);

  const normalizedQuestion = normalize(trimmed);

  if (/^(bonjour|salut|bonsoir|hello|coucou)\b/.test(normalizedQuestion)) {
    return greetingReply(options.role);
  }

  if (/\b(merci|thanks)\b/.test(normalizedQuestion)) {
    return {
      answer: 'Avec plaisir. Posez une autre question si vous avez besoin d’aide sur StageBuild.',
      sources: [],
      suggestions: roleSuggestions(options.role),
    };
  }

  if (
    /\b(qui es-tu|que peux-tu|tu fais quoi|comment tu fonctionnes|tes capacites|ton role)\b/.test(
      normalizedQuestion,
    )
  ) {
    return capabilityReply(options.role);
  }

  const results = matchScore(trimmed, options.role, options.previousSection);

  if (results.length === 0 || results[0].score < 5) {
    return fallbackReply(options.role);
  }

  const topResults = results
    .filter((result, index, all) => {
      if (index === 0) return true;
      if (index >= 2) return false;
      return result.score >= all[0].score * 0.72 && result.block.id !== all[0].block.id;
    })
    .slice(0, 2);

  const [top] = topResults;
  const heading =
    cleanSubheading(top.block.subheading) ??
    `${top.block.sectionTitle.charAt(0)}${top.block.sectionTitle.slice(1).toLowerCase()}`;
  const confidenceNote =
    top.score < 12 ? 'Voici la section la plus proche dans le guide.\n\n' : '';
  const related =
    topResults[1] && topResults[1].block.id !== top.block.id
      ? `\n\nVoir aussi : ${cleanSubheading(topResults[1].block.subheading) ?? topResults[1].block.sectionTitle}.`
      : '';
  const lead = buildLead(trimmed);

  return {
    answer: `${heading}\n\n${confidenceNote}${lead}${buildExcerpt(top.block.content)}${related}`,
    sources: topResults.map((result) => sourceFromBlock(result.block)),
    suggestions: relatedSuggestions(topResults, options.role),
  };
}

export function assistantWelcome(role?: Role): AssistantReply {
  return greetingReply(role);
}

export function assistantGuideInfo(): { sections: number; blocks: number } {
  return {
    sections: guideSections.length,
    blocks: guideBlocks.length,
  };
}
