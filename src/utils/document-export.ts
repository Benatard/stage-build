export type ExportCell = string | number | null | undefined;

export type ExportTable = {
  headers: string[];
  rows: ExportCell[][];
  widths?: number[];
};

export type ExportOrganization = {
  name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
};

export type ExportDocumentOptions = {
  filename: string;
  title: string;
  subtitle?: string;
  sheetName?: string;
  organization?: ExportOrganization;
  meta?: Array<[string, string]>;
  table: ExportTable;
  note?: string;
  landscape?: boolean;
};

const FALLBACK_VALUE = '—';

function text(value: ExportCell): string {
  if (value === null || value === undefined) return '';
  const result = String(value).trim();
  return result === '' ? '' : result;
}

export function displayValue(value: ExportCell, fallback = FALLBACK_VALUE): string {
  return text(value) || fallback;
}

export function escapeHtml(value: ExportCell): string {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function excelSafe(value: ExportCell): string {
  const result = text(value);
  return /^[=+\-@]/.test(result) ? `'${result}` : result;
}

function fileStem(filename: string): string {
  return filename.replace(/\.(xls|xlsx|pdf|html?)$/i, '');
}

export function safeFilenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function organizationLines(organization?: ExportOrganization): string[] {
  if (!organization) return [];
  return [organization.address, organization.phone, organization.email, organization.website].filter(
    (line): line is string => Boolean(line && line.trim()),
  );
}

function buildMetaRows(options: ExportDocumentOptions): Array<[string, string]> {
  const rows: Array<[string, string]> = [];

  if (options.organization?.name) rows.push(['Institution', options.organization.name]);
  options.meta?.forEach(([label, value]) => {
    if (text(label)) rows.push([text(label), displayValue(value)]);
  });

  return rows;
}

function buildExcelHtml(options: ExportDocumentOptions): string {
  const columns = options.table.headers.length;
  const metaRows = buildMetaRows(options);
  const orgDetails = organizationLines(options.organization);

  const titleRows = [
    `<tr><td colspan="${columns}" style="font-family:Arial,sans-serif;font-size:18pt;font-weight:bold;color:#0f172a;padding:6px 0;">${escapeHtml(options.title)}</td></tr>`,
    options.subtitle
      ? `<tr><td colspan="${columns}" style="font-family:Arial,sans-serif;font-size:10pt;color:#475569;padding:0 0 4px;">${escapeHtml(options.subtitle)}</td></tr>`
      : '',
    options.organization?.name
      ? `<tr><td colspan="${columns}" style="font-family:Arial,sans-serif;font-size:11pt;font-weight:bold;color:#0f172a;padding:2px 0;">${escapeHtml(options.organization.name)}</td></tr>`
      : '',
    ...orgDetails.map(
      (line) =>
        `<tr><td colspan="${columns}" style="font-family:Arial,sans-serif;font-size:9pt;color:#64748b;padding:1px 0;">${escapeHtml(line)}</td></tr>`,
    ),
    ...metaRows.map(
      ([label, value]) =>
        `<tr><td colspan="${columns}" style="font-family:Arial,sans-serif;font-size:9pt;color:#334155;padding:1px 0;"><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</td></tr>`,
    ),
    `<tr><td colspan="${columns}" style="height:8px;"></td></tr>`,
  ]
    .filter(Boolean)
    .join('');

  const header = options.table.headers
    .map(
      (label) =>
        `<th style="border:1px solid #94a3b8;background:#0f172a;color:#ffffff;font-family:Arial,sans-serif;font-size:9pt;font-weight:bold;padding:6px;text-align:left;vertical-align:middle;">${escapeHtml(label)}</th>`,
    )
    .join('');

  const body = options.table.rows
    .map(
      (row, index) =>
        `<tr>${options.table.headers
          .map((_, columnIndex) => {
            const value = row[columnIndex];
            return `<td style="border:1px solid #cbd5e1;background:${index % 2 === 0 ? '#ffffff' : '#f8fafc'};font-family:Arial,sans-serif;font-size:9pt;color:#0f172a;padding:5px;vertical-align:top;mso-number-format:'\\@';">${escapeHtml(excelSafe(value))}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');

  const note = options.note
    ? `<tr><td colspan="${columns}" style="font-family:Arial,sans-serif;font-size:8pt;color:#64748b;padding:8px 0 0;">${escapeHtml(options.note)}</td></tr>`
    : '';

  const colgroup = options.table.widths?.length
    ? `<colgroup>${options.table.widths
        .map((width) => `<col width="${width}">`)
        .join('')}</colgroup>`
    : '';

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeHtml(options.sheetName ?? fileStem(options.filename))}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>table{border-collapse:collapse;} td,th{white-space:normal;}</style>
</head>
<body>
<table>
${colgroup}
${titleRows}
<tr>${header}</tr>
${body}
${note}
</table>
</body>
</html>`;
}

export function downloadExcel(options: ExportDocumentOptions): void {
  const html = buildExcelHtml(options);
  const blob = new Blob(['\uFEFF', html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileStem(options.filename)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildPrintHtml(options: ExportDocumentOptions): string {
  const metaRows = buildMetaRows(options);
  const orgDetails = organizationLines(options.organization);
  const generatedAt = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const metaHtml = metaRows.length
    ? `<dl class="meta">${metaRows
        .map(
          ([label, value]) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
        )
        .join('')}</dl>`
    : '';

  const header = options.table.headers
    .map((label) => `<th>${escapeHtml(label)}</th>`)
    .join('');

  const body = options.table.rows
    .map(
      (row) =>
        `<tr>${options.table.headers
          .map((_, index) => `<td>${escapeHtml(displayValue(row[index]))}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  const colgroup = options.table.widths?.length
    ? `<colgroup>${options.table.widths
        .map((width) => `<col style="width:${width}px">`)
        .join('')}</colgroup>`
    : '';

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fileStem(options.filename))}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; color: #0f172a; }
  body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.45; }
  .tools { position: sticky; top: 0; z-index: 2; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .tools button { border: 0; background: #0f172a; color: #ffffff; font: inherit; font-weight: 600; padding: 9px 16px; cursor: pointer; }
  .tools span { margin-right: auto; align-self: center; color: #64748b; font-size: 11px; }
  .sheet { padding: 18px 20px 28px; }
  .doc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 12px; border-bottom: 3px solid #0f172a; }
  .brand-name { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
  .brand-detail { margin-top: 2px; color: #475569; font-size: 10px; }
  .doc-title { max-width: 55%; text-align: right; }
  .doc-title h1 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; }
  .doc-title p { margin: 4px 0 0; color: #475569; font-size: 10px; }
  .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 22px; margin: 14px 0 16px; padding: 10px 12px; border: 1px solid #cbd5e1; background: #f8fafc; }
  .meta div { display: flex; gap: 6px; min-width: 0; }
  .meta dt { min-width: 92px; color: #475569; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .meta dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  thead { display: table-header-group; }
  th { border: 1px solid #94a3b8; background: #0f172a; color: #ffffff; padding: 7px 6px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.03em; vertical-align: middle; }
  td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; overflow-wrap: anywhere; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .note { margin-top: 12px; padding-top: 9px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 9px; }
  .footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 14px; padding-top: 8px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 8.5px; }
  @media print {
    .tools { display: none !important; }
    .sheet { padding: 0; }
    @page { size: ${options.landscape ? 'A4 landscape' : 'A4 portrait'}; margin: 10mm 9mm 12mm; }
    body { font-size: 9.5px; }
    th { background: #e2e8f0 !important; color: #0f172a !important; }
    tbody tr:nth-child(even) td { background: #f8fafc !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="tools">
    <span>Choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.</span>
    <button type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
  </div>
  <main class="sheet">
    <header class="doc-header">
      <div>
        <div class="brand-name">${escapeHtml(options.organization?.name ?? 'StageBuild')}</div>
        ${orgDetails.length ? `<div class="brand-detail">${orgDetails.map(escapeHtml).join(' · ')}</div>` : ''}
      </div>
      <div class="doc-title">
        <h1>${escapeHtml(options.title)}</h1>
        ${options.subtitle ? `<p>${escapeHtml(options.subtitle)}</p>` : ''}
      </div>
    </header>
    ${metaHtml}
    <table>
      ${colgroup}
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    ${options.note ? `<p class="note">${escapeHtml(options.note)}</p>` : ''}
    <footer class="footer"><span>Document généré le ${escapeHtml(generatedAt)}</span><span>${escapeHtml(options.organization?.name ?? 'StageBuild')}</span></footer>
  </main>
  <script>window.addEventListener('load', function () { window.setTimeout(function () { window.focus(); window.print(); }, 350); });</script>
</body>
</html>`;
}

export function openPdfDocument(options: ExportDocumentOptions): boolean {
  const html = buildPrintHtml(options);
  const win = window.open('', '_blank', 'width=1280,height=900');
  if (!win) return false;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
