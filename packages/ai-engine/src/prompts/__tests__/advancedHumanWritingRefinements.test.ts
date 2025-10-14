import { advancedHumanWritingRefinements } from '../advancedHumanWritingRefinements';

describe('advancedHumanWritingRefinements', () => {
  it('matches the captured legacy structure', () => {
    expect(advancedHumanWritingRefinements).toMatchSnapshot();
  });
});
