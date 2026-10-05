import { parseOriginList } from './security.config';

describe('security origin configuration', () => {
  it('normalizes exact origins, removes duplicates and rejects wildcard origins', () => {
    expect(
      parseOriginList(
        'https://www.pcsystemstore.com/,https://pcsystemstore.com,https://www.pcsystemstore.com,https://*.example.com,*',
      ),
    ).toEqual(['https://www.pcsystemstore.com', 'https://pcsystemstore.com']);
  });
});
