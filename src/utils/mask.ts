export function maskSecret(value: string, visible = 4): string {
  if (!value) return 'non défini';
  if (value.length <= visible) return '••••';
  return `${'•'.repeat(Math.min(value.length - visible, 12))}${value.slice(-visible)}`;
}
