export function basePath() {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  if (!raw || raw === "/") return "";
  return raw.replace(/\/$/, "");
}

export function apiUrl(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${basePath()}${path}`;
}
