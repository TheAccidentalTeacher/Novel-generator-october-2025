import { genreInstructions } from '../genreInstructions';

describe('genreInstructions', () => {
  it('matches the captured legacy structure', () => {
    expect(genreInstructions).toMatchSnapshot();
  });
});
