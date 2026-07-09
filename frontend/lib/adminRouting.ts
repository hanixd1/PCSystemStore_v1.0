export function isAdminRoute(pathname: string | null | undefined): boolean {
  return pathname === '/admin' || Boolean(pathname?.startsWith('/admin/'));
}
