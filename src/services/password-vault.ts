const recentPasswords = new Map<string, string>();
let ownerId: string | null = null;

function ensureOwner(owner: string | null | undefined): void {
  const id = owner ?? '';
  if (ownerId !== id) {
    recentPasswords.clear();
    ownerId = id;
  }
}

export function rememberPassword(
  owner: string | null | undefined,
  userId: string,
  password: string,
): void {
  ensureOwner(owner);
  recentPasswords.set(userId, password);
}

export function getRememberedPassword(
  owner: string | null | undefined,
  userId: string,
): string | undefined {
  ensureOwner(owner);
  return recentPasswords.get(userId);
}

export function forgetRememberedPassword(
  owner: string | null | undefined,
  userId: string,
): void {
  ensureOwner(owner);
  recentPasswords.delete(userId);
}

export function clearRememberedPasswords(): void {
  recentPasswords.clear();
  ownerId = null;
}
