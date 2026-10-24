import Swal from 'sweetalert2';

export type AlertKind = 'success' | 'error' | 'warning' | 'info';

export function toast(kind: AlertKind, title: string): void {
  void Swal.fire({
    toast: true,
    position: 'top-end',
    icon: kind,
    title,
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
  });
}
