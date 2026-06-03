import { describe, it, expect } from 'vitest';
import { getRandomWord, WORDS } from './words';

describe('Word Utility Protocol', () => {
  it('should retrieve a valid word from the EZ pool', () => {
    const wordData = getRandomWord('EZ', 5);
    expect(wordData.word).toBeDefined();
    expect(wordData.word.length).toBe(5);
    expect(WORDS.EZ).toContainEqual(expect.objectContaining({ word: wordData.word }));
  });

  it('should retrieve a valid word from the Asian pool', () => {
    const wordData = getRandomWord('Asian', 5);
    expect(wordData.word).toBeDefined();
    expect(WORDS.Asian).toContainEqual(expect.objectContaining({ word: wordData.word }));
  });

  it('should fallback to default pool if length mismatch occurs', () => {
    // There are no 10-letter words in our base pool
    const wordData = getRandomWord('Normal', 10);
    expect(wordData.word).toBeDefined();
    expect(wordData.word.length).toBe(5); // Should fallback to existing 5-letter words
  });
});
