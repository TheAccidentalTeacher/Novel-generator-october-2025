import { humanWritingEnhancements } from '../humanWritingEnhancements';

describe('humanWritingEnhancements', () => {
  it('matches the captured legacy structure', () => {
    expect(humanWritingEnhancements).toMatchSnapshot();
  });
});
