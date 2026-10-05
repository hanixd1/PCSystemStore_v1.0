function publicBuildValue(value: string | undefined, fallback: string): string {
  const normalized = value
    ?.trim()
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 64);
  return normalized || fallback;
}

export const APP_VERSION = publicBuildValue(process.env.NEXT_PUBLIC_APP_VERSION, 'development');
export const COMMIT_SHA = publicBuildValue(process.env.NEXT_PUBLIC_COMMIT_SHA, 'local');
export const BUILD_IDENTIFIER = `${APP_VERSION}-${COMMIT_SHA.slice(0, 12)}`;
