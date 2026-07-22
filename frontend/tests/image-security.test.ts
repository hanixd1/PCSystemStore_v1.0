import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';
import { createContentSecurityPolicy, REMOTE_IMAGE_HOSTS } from '../proxy';

describe('image security configuration', () => {
  it('allows only the image hosts used by product and banner data', () => {
    const policy = createContentSecurityPolicy('test-nonce', true);
    const imgSource = policy.split('; ').find((directive) => directive.startsWith('img-src'));

    expect(imgSource).toContain("'self' data: blob:");
    for (const host of REMOTE_IMAGE_HOSTS) {
      expect(imgSource).toContain(`https://${host}`);
    }
    expect(imgSource).not.toContain('*');
    expect(imgSource).not.toMatch(/(?:^|\s)https:(?=\s|$)/);
  });

  it('keeps production script sources nonce-based and does not enable unsafe eval', () => {
    const policy = createContentSecurityPolicy('test-nonce', true);

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain('unsafe-eval');
  });

  it('uses explicit Next/Image remote patterns without a host wildcard', () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    expect(remotePatterns).toContainEqual({ protocol: 'https', hostname: 'res.cloudinary.com' });
    expect(remotePatterns).not.toContainEqual(expect.objectContaining({ hostname: '*' }));
  });
});
