/**
 * Tests for VectorSearch (task 10.5)
 */

import { VectorSearch } from '../../src/embeddings/VectorSearch';

function makeChunk(id: string, type: 'function' | 'class' | 'guide' | 'example', embedding: number[], extra: Partial<any> = {}) {
  return {
    id,
    markdown: `Content for ${id}`,
    metadata: {
      type,
      title: `${type} ${id}`,
      priority: 0.5,
      codeExample: type === 'example',
      wordCount: 10,
      sourceSection: 'test',
      ...extra,
    },
    embedding,
  } as any;
}

describe('VectorSearch', () => {
  test('cosine similarity yields 1.0 for identical vectors and 0.0 for orthogonal', async () => {
    const vs = new VectorSearch([makeChunk('1', 'guide', [1, 0, 0])]);
    const simIdentical = (vs as any).cosineSimilarity([1, 0, 0], [1, 0, 0]);
    const simOrthogonal = (vs as any).cosineSimilarity([1, 0, 0], [0, 1, 0]);
    expect(simIdentical).toBeCloseTo(1.0, 5);
    expect(simOrthogonal).toBeCloseTo(0.0, 5);
  });

  test('semanticSearch respects typeFilter and minSimilarity', async () => {
    const chunks = [
      makeChunk('a', 'function', [1, 0, 0], { functionName: 'alpha', parameters: ['x'] }),
      makeChunk('b', 'example', [0.9, 0.1, 0], { codeExample: true }),
      makeChunk('c', 'guide', [0, 1, 0]),
    ];
    const vs = new VectorSearch(chunks);
    const resultsAll = await vs.semanticSearch([1, 0, 0], { minSimilarity: 0.2, limit: 10 });
    expect(resultsAll.length).toBeGreaterThanOrEqual(2);

    const resultsFunctionsOnly = await vs.semanticSearch([1, 0, 0], { typeFilter: ['function'], minSimilarity: 0.2, limit: 10 });
    expect(resultsFunctionsOnly.every(r => r.chunk.metadata.type === 'function')).toBe(true);

    const resultsHighThreshold = await vs.semanticSearch([0, 1, 0], { minSimilarity: 0.95 });
    // Only the guide is perfectly aligned
    expect(resultsHighThreshold.length).toBe(1);
    expect(resultsHighThreshold[0].chunk.id).toBe('c');
  });

  test('relevanceScore ranking boosts functions and examples', async () => {
    const chunks = [
      makeChunk('func', 'function', [0.7, 0.3], { functionName: 'doThing', parameters: ['a'] }),
      makeChunk('guide', 'guide', [0.7, 0.3]),
      makeChunk('example', 'example', [0.7, 0.3], { codeExample: true }),
    ];
    const vs = new VectorSearch(chunks as any);
    const results = await vs.semanticSearch([0.7, 0.3], { minSimilarity: 0.1, limit: 3 });
    // Expect function or example to rank above guide due to boosts
    const idsInOrder = results.map(r => r.chunk.id);
    expect(idsInOrder[0]).not.toBe('guide');
  });

  test('category and includeCode filters work', async () => {
    const chunks = [
      makeChunk('cat1-example', 'example', [1, 0], { category: 'arrays', codeExample: true }),
      makeChunk('cat1-guide', 'guide', [1, 0], { category: 'arrays' }),
      makeChunk('cat2-example', 'example', [1, 0], { category: 'objects', codeExample: true }),
    ];
    const vs = new VectorSearch(chunks as any);

    const catArrays = await vs.semanticSearch([1, 0], { categoryFilter: ['arrays'], limit: 10 });
    expect(catArrays.every(r => (r.chunk.metadata.category || '').toLowerCase().includes('arrays'))).toBe(true);

    const onlyCode = await vs.semanticSearch([1, 0], { includeCode: true, limit: 10 });
    expect(onlyCode.every(r => r.chunk.metadata.codeExample === true)).toBe(true);
  });
});


