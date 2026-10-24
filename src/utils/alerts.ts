import Swal, { type SweetAlertResult } from 'sweetalert2';

const primary = '#4A6CF7';
const danger = '#E11D48';

export function notifySuccess(title: string, text?: string): void {
  void Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: primary,
    timer: 2200,
    timerProgressBar: true,
  });
}

export function notifyError(title: string, text?: string): void {
  void Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: primary,
  });
}

export function notifyInfo(title: string, text?: string): void {
  void Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonColor: primary,
  });
}

export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result: SweetAlertResult = await Swal.fire({
    icon: options.danger ? 'warning' : 'question',
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Confirmer',
    cancelButtonText: options.cancelText ?? 'Annuler',
    confirmButtonColor: options.danger ? danger : primary,
    cancelButtonColor: '#788293',
    reverseButtons: true,
  });

  return result.isConfirmed;
}

export async function confirmDelete(label: string): Promise<boolean> {
  return confirmAction({
    title: 'Confirmer la suppression',
    text: `Voulez-vous vraiment supprimer « ${label} » ? Cette action est irréversible.`,
    confirmText: 'Supprimer',
    danger: true,
  });
}

export async function promptText(options: {
  title: string;
  label: string;
  value?: string;
  confirmText?: string;
}): Promise<string | null> {
  const result = await Swal.fire({
    title: options.title,
    input: 'textarea',
    inputLabel: options.label,
    inputValue: options.value ?? '',
    inputAttributes: { rows: '5' },
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Enregistrer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: primary,
    cancelButtonColor: '#788293',
    reverseButtons: true,
    inputValidator: (value) => (value.trim() ? null : 'Ce champ est obligatoire.'),
  });

  return result.isConfirmed ? String(result.value ?? '') : null;
}
