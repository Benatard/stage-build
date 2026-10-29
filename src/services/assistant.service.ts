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

type SocialIntent =
  | 'greeting'
  | 'thanks'
  | 'positive'
  | 'acknowledgement'
  | 'farewell'
  | 'wellbeing'
  | 'apology'
  | 'distress'
  | 'identity'
  | 'help';

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'd', 'l', 'a', 'au', 'aux',
  'et', 'ou', 'en', 'dans', 'pour', 'par', 'sur', 'avec', 'sans', 'ce', 'cette',
  'ces', 'cet', 'mon', 'ma', 'mes', 'votre', 'vos', 'son', 'sa', 'ses', 'je',
  'j', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'comment', 'pourquoi',
  'quand', 'quel', 'quelle', 'quels', 'quelles', 'est', 'sont', 'etre', 'avoir',
  'fait', 'faire', 'faut', 'ne', 'pas', 'plus', 'que', 'qui', 'quoi', 'dont',
  'si', 'comme', 'application', 'stagebuild', 'page', 'guide', 'systeme', 'svp',
  'stp', 'merci', 'bonjour', 'salut', 'bonsoir', 'hello', 'coucou', 'hey',
  'bjr', 'slt', 'bsr', 'cc', 'mrc', 'ouais', 'yep', 'voila',
  'cool', 'super', 'genial', 'genialissime', 'parfait', 'nickel', 'top', 'bravo',
  'excellent', 'impeccable', 'formidable', 'tres', 'bien', 'ok', 'okay', 'daccord',
  'pardon', 'desole', 'desolee', 'excuse', 'excuses',
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

function socialKey(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
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

const SOCIAL_FILLERS = new Set([
  'a', 'au', 'aux', 'avec', 'avoir', 'ai', 'as', 'avons', 'avez', 'ont', 'etre',
  'beaucoup', 'c', 'ca', 'ce', 'cela', 'ceci', 'cet', 'cette', 'ces', 'comment',
  'd', 'dans', 'de', 'des', 'dire', 'du', 'elle', 'en', 'es', 'est', 'et', 'etes',
  'eux', 'fin', 'franchement', 'honnetement', 'il', 'j', 'je', 'juste', 'l', 'la',
  'le', 'les', 'leur', 'leurs', 'lui', 'm', 'ma', 'mais', 'me', 'mes', 'moi',
  'mon', 'n', 'ne', 'nos', 'notre', 'nous', 'on', 'ou', 'par', 'pas', 'plus',
  'pour', 'pourquoi', 'qu', 'que', 'qui', 'quoi', 's', 'se', 'serai', 'serais',
  'serait', 'simplement', 'sincerement', 'sommes', 'sont', 'suis', 'sur', 't',
  'ta', 'te', 'tes', 'toi', 'ton', 'tous', 'tout', 'toute', 'toutes', 'tres',
  'trop', 'tu', 'un', 'une', 'votre', 'vos', 'vraiment', 'vous', 'y', 'peux',
  'peut', 'pouvez', 'puis', 'veux', 'veut', 'voulez', 'voudrais', 'aimerais',
  'souhaite', 'souhaitez', 'trouve', 'trouves', 'trouvez', 'pense', 'penses',
  'pensez', 'crois', 'croit', 'croyez', 'application', 'stagebuild', 'page',
  'guide', 'systeme', 'app', 'logiciel', 'reponse', 'reponses', 'retour',
  'information', 'informations', 'explication', 'explications', 'temps',
  'patience', 'avance', 'repondu', 'idee', 'idees', 'monde', 'mea', 'tellement',
]);

const SOCIAL_WORD_INTENTS: Record<string, SocialIntent> = {
  bonjour: 'greeting',
  salut: 'greeting',
  bonsoir: 'greeting',
  hello: 'greeting',
  coucou: 'greeting',
  hey: 'greeting',
  salutations: 'greeting',
  bjr: 'greeting',
  slt: 'greeting',
  bsr: 'greeting',
  cc: 'greeting',
  merci: 'thanks',
  mercis: 'thanks',
  thanks: 'thanks',
  remercie: 'thanks',
  infiniment: 'thanks',
  encore: 'thanks',
  mrc: 'thanks',
  cool: 'positive',
  super: 'positive',
  genial: 'positive',
  genialissime: 'positive',
  parfait: 'positive',
  nickel: 'positive',
  top: 'positive',
  bravo: 'positive',
  excellent: 'positive',
  impeccable: 'positive',
  formidable: 'positive',
  bon: 'positive',
  bonne: 'positive',
  content: 'positive',
  contente: 'positive',
  satisfait: 'positive',
  satisfaite: 'positive',
  gentil: 'positive',
  gentille: 'positive',
  gentils: 'positive',
  gentilles: 'positive',
  plait: 'positive',
  plaisent: 'positive',
  fallait: 'positive',
  joue: 'positive',
  ok: 'acknowledgement',
  okay: 'acknowledgement',
  daccord: 'acknowledgement',
  accord: 'acknowledgement',
  entendu: 'acknowledgement',
  compris: 'acknowledgement',
  recu: 'acknowledgement',
  oui: 'acknowledgement',
  ouais: 'acknowledgement',
  yep: 'acknowledgement',
  voila: 'acknowledgement',
  exact: 'acknowledgement',
  effectivement: 'acknowledgement',
  bien: 'acknowledgement',
  revoir: 'farewell',
  bientot: 'farewell',
  journee: 'farewell',
  soiree: 'farewell',
  nuit: 'farewell',
  week: 'farewell',
  end: 'farewell',
  bye: 'farewell',
  ciao: 'farewell',
  prochaine: 'farewell',
  continuation: 'farewell',
  soin: 'farewell',
  forme: 'wellbeing',
  roule: 'wellbeing',
  gaze: 'wellbeing',
  pardon: 'apology',
  desole: 'apology',
  desolee: 'apology',
  excuse: 'apology',
  excusez: 'apology',
  excuses: 'apology',
  culpa: 'apology',
  bloque: 'distress',
  bloquee: 'distress',
  coince: 'distress',
  coincee: 'distress',
  perdu: 'distress',
  perdue: 'distress',
  galere: 'distress',
  bug: 'distress',
  erreur: 'distress',
  probleme: 'distress',
  panne: 'distress',
  secours: 'distress',
  comprends: 'distress',
  comprend: 'distress',
  arrive: 'distress',
  nul: 'distress',
  bof: 'distress',
  robot: 'identity',
  ia: 'identity',
  humain: 'identity',
  humaine: 'identity',
  intelligence: 'identity',
  artificielle: 'identity',
  aide: 'help',
  aider: 'help',
  aidez: 'help',
  maider: 'help',
  besoin: 'help',
};

const SOCIAL_PRIORITY: readonly SocialIntent[] = [
  'distress',
  'apology',
  'identity',
  'thanks',
  'help',
  'wellbeing',
  'farewell',
  'positive',
  'acknowledgement',
  'greeting',
];

const SOCIAL_PATTERNS: Array<{ intent: SocialIntent; pattern: RegExp }> = [
  {
    intent: 'greeting',
    pattern:
      /^(bonjour|salut|bonsoir|hello|coucou|hey|bonjour tout le monde|salut tout le monde|bonjour a tous|salut a tous|salutations)$/,
  },
  {
    intent: 'thanks',
    pattern:
      /^(merci|merci beaucoup|merci infiniment|merci encore|encore merci|merci pour tout|merci pour votre aide|merci pour ton aide|mille mercis|merci a toi|merci a vous|merci a tous|thanks|thank you|ok merci|d accord merci|super merci|parfait merci|nickel merci|cool merci|genial merci|top merci)$/,
  },
  {
    intent: 'positive',
    pattern:
      /^(cool|super|genial|genialissime|parfait|nickel|nickel chrome|top|bravo|excellent|impeccable|formidable|tres bien|bien joue|ca marche|ca a marche|trop bien|pas mal|pas mal du tout|c est cool|c est super|c est bon|c est nickel|c est parfait|c est top|c est genial|c est gentil|c est pas mal|tu es gentil|vous etes gentils|je suis content|je suis contente|ca me plait|c est ce qu il me fallait)$/,
  },
  {
    intent: 'acknowledgement',
    pattern:
      /^(ok|okay|d accord|daccord|entendu|compris|compris merci|bien recu|recu|c est note|oui|exact|effectivement|bien)$/,
  },
  {
    intent: 'farewell',
    pattern:
      /^(au revoir|a bientot|a plus|a plus tard|a demain|a tout a l heure|bonne journee|bonne soiree|bonne nuit|bon week end|bonne fin de journee|bonne journee a vous|bonne soiree a vous|bye|ciao|a la prochaine|bonne continuation|prends soin de toi|prenez soin de vous|portez vous bien)$/,
  },
  {
    intent: 'wellbeing',
    pattern:
      /^(ca va|ca va bien|ca va toi|ca roule|ca gaze|je vais bien|comment ca va|comment vas tu|comment va tu|comment tu vas|tu vas bien|vous allez bien|comment allez vous|la forme|comment te sens tu|et toi|et vous|quoi de neuf)$/,
  },
  {
    intent: 'apology',
    pattern:
      /^(pardon|desole|desolee|je suis desole|je suis desolee|excuse moi|excusez moi|toutes mes excuses|mea culpa)$/,
  },
  {
    intent: 'distress',
    pattern:
      /^(je suis bloque|je suis bloquee|je n y arrive pas|je n arrive pas|j y arrive pas|j arrive pas|ca ne marche pas|ca marche pas|ca ne marche plus|ca ne fonctionne pas|ca bloque|ca bug|au secours|help|je ne comprends pas|je comprends pas|je ne comprends rien|je ne sais pas|je suis perdu|je suis perdue|je suis coince|je suis coincee|je galere|rien ne marche|bug|erreur|probleme|panne|c est nul|pas terrible|bof)$/,
  },
  {
    intent: 'identity',
    pattern:
      /^(qui es tu|tu es qui|t es qui|tu es un robot|t es un robot|tu es une ia|t es une ia|tu es une intelligence artificielle|es tu humain|tu es humain|t es humain|es tu une ia)$/,
  },
  {
    intent: 'help',
    pattern:
      /^(tu peux m aider|pouvez vous m aider|tu peux maider|aidez moi|aide moi|j ai besoin d aide|besoin d aide|un coup de main|besoin d un coup de main|peux tu m aider)$/,
  },
];

function detectSocialIntent(value: string): SocialIntent | null {
  const key = socialKey(value);
  const direct = SOCIAL_PATTERNS.find((entry) => entry.pattern.test(key));
  if (direct) return direct.intent;

  const meaningful = key.split(' ').filter((word) => word && !SOCIAL_FILLERS.has(word));
  if (meaningful.length === 0 || meaningful.length > 4) return null;

  const intents = new Set<SocialIntent>();

  for (const word of meaningful) {
    const intent = SOCIAL_WORD_INTENTS[word];
    if (!intent) return null;
    intents.add(intent);
  }

  return SOCIAL_PRIORITY.find((intent) => intents.has(intent)) ?? null;
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function socialReply(intent: SocialIntent, role?: Role): AssistantReply {
  const suggestions = roleSuggestions(role);

  if (intent === 'greeting') {
    return {
      answer: pick([
        'Bonjour !\n\nRavi de vous retrouver sur StageBuild. Que puis-je faire pour vous aujourd’hui ?',
        `Bonjour !\n\nJe suis l’assistant StageBuild. Je peux vous guider dans ${roleLabel(role)}. Posez-moi votre question.`,
        'Bonjour !\n\nComment puis-je vous aider aujourd’hui ?',
      ]),
      sources: [],
      suggestions,
    };
  }

  if (intent === 'thanks') {
    return {
      answer: pick([
        'Avec plaisir !\n\nContent que cela vous ait été utile. N’hésitez pas si vous avez une autre question.',
        'Je vous en prie.\n\nC’est toujours un plaisir de vous aider. Je reste disponible si besoin.',
        'Avec plaisir !\n\nSi vous avez besoin d’autre chose, je suis là.',
      ]),
      sources: [],
      suggestions,
    };
  }

  if (intent === 'positive') {
    return {
      answer: pick([
        'Content de vous servir !\n\nMerci pour votre retour. Si vous voulez, je peux aussi vous guider sur une autre page ou une autre procédure.',
        'Merci, ça me fait plaisir !\n\nQue puis-je faire pour vous ensuite ?',
        'Super !\n\nJe suis content que cela vous aide. Une autre question ?',
        'Ravi que cela vous convienne !\n\nOn continue ?',
      ]),
      sources: [],
      suggestions,
    };
  }

  if (intent === 'acknowledgement') {
    return {
      answer: pick([
        'Parfait, c’est noté.\n\nSi vous avez besoin d’autre chose, je reste disponible.',
        'Très bien.\n\nN’hésitez pas si une autre question vous vient.',
        'Entendu !\n\nJe suis là si besoin.',
      ]),
      sources: [],
      suggestions,
    };
  }

  if (intent === 'farewell') {
    return {
      answer: pick([
        'À bientôt !\n\nBonne continuation sur StageBuild. N’hésitez pas à revenir si vous avez besoin d’aide.',
        'Au revoir !\n\nJe reste disponible pour vos prochaines questions.',
        'Bonne journée !\n\nÀ très bientôt sur StageBuild.',
      ]),
      sources: [],
      suggestions,
    };
  }

  if (intent === 'wellbeing') {
    return {
      answer: pick([
        'Je vais très bien, merci !\n\nC’est gentil de demander. Je suis prêt à vous aider sur StageBuild. Que puis-je faire pour vous ?',
        'Tout va bien, merci !\n\nToujours prêt à vous guider. Comment puis-je vous aider aujourd’hui ?',
      ]),
      sources: [],
      suggestions,
    };
  }

  if (intent === 'apology') {
    return {
      answer: pick([
        'Pas de souci !\n\nCela arrive à tout le monde. Dites-moi ce que vous cherchez et je vais vous aider.',
        'Aucun problème !\n\nOn reprend quand vous voulez. Quelle est votre question ?',
      ]),
      sources: [],
      suggestions,
    };
  }

  if (intent === 'distress') {
    return {
      answer: pick([
        'Je comprends.\n\nPour vous aider efficacement, décrivez-moi la page, l’action et le message affiché. Je vais vous guider pas à pas.',
        'Pas de panique, on va trouver ensemble.\n\nDites-moi sur quelle page vous êtes et ce qui se passe.',
      ]),
      sources: [],
      suggestions,
    };
  }

  if (intent === 'identity') {
    return {
      answer:
        'Je suis un assistant virtuel.\n\nJe ne suis pas une personne, mais je suis conçu pour vous répondre naturellement et vous guider dans StageBuild.',
      sources: [],
      suggestions,
    };
  }

  return {
    answer: pick([
      'Bien sûr !\n\nJe suis là pour ça. Dites-moi ce que vous voulez faire (inscrire, noter, publier, imprimer…) ou la page qui vous pose problème.',
      'Avec plaisir !\n\nExpliquez-moi votre besoin ou la page concernée, et je vous indique la procédure.',
    ]),
    sources: [],
    suggestions,
  };
}

function greetingReply(role?: Role): AssistantReply {
  return socialReply('greeting', role);
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
      'Et bien sûr, je réponds aussi aux messages simples comme « bonjour », « merci » ou « cool ».\n\n' +
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
    /\b(erreur|probleme|panne|impossible|bloque|echec|bug|fonctionne pas|marche pas|arrive pas|coince|perdu|galere)\b/.test(
      normalized,
    )
  ) {
    return 'Je comprends. Voici les points à vérifier et la procédure de référence.\n\n';
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

  const socialIntent = detectSocialIntent(trimmed);
  if (socialIntent) return socialReply(socialIntent, options.role);

  let workingQuestion = trimmed;
  const greetingPrefix = workingQuestion.match(
    /^(bonjour|salut|bonsoir|hello|coucou|hey)\b[\s,!.;:?…-]*/i,
  );

  if (greetingPrefix) {
    const rest = workingQuestion.slice(greetingPrefix[0].length).trim();
    if (rest) {
      const restIntent = detectSocialIntent(rest);
      if (restIntent) return socialReply(restIntent, options.role);
      workingQuestion = rest;
    }
  }

  const capabilityKey = socialKey(workingQuestion);

  if (
    /\b(qui es tu|que peux tu|que sais tu faire|tu fais quoi|comment tu fonctionnes|tu fonctionnes comment|comment fonctionnes tu|tes capacites|tes fonctions|ton role|tu sers a quoi)\b/.test(
      capabilityKey,
    )
  ) {
    return capabilityReply(options.role);
  }

  const results = matchScore(workingQuestion, options.role, options.previousSection);

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
  const lead = buildLead(workingQuestion);

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
