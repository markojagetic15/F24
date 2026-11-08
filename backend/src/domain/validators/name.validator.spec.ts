import { validateSync } from 'class-validator';
import { IsName, isValidName, isValidNamePrefix } from './name.validator.js';

describe('isValidNamePrefix', () => {
  const MAX_LENGTH = 10;

  it.each([
    ['a single character', 'a'],
    ['a prefix of exactly the limit', 'a'.repeat(MAX_LENGTH)],
    ['a trailing space', 'my '],
    ['only a space', ' '],
    ['dots that are not a valid name', '..'],
    ['LIKE wildcards', '%_'],
    ['a complete emoji', '😀'],
  ])('accepts %s', (_label, prefix) => {
    expect(isValidNamePrefix(prefix, MAX_LENGTH)).toBe(true);
  });

  it.each([
    ['an empty prefix', ''],
    ['a prefix over the limit', 'a'.repeat(MAX_LENGTH + 1)],
    ['a forward slash', 'a/b'],
    ['a backslash', 'a\\b'],
    ['a NUL byte', 'a\u0000'],
    ['a newline', 'a\nb'],
    ['a lone surrogate', 'a\ud83d'],
  ])('rejects %s', (_label, prefix) => {
    expect(isValidNamePrefix(prefix, MAX_LENGTH)).toBe(false);
  });
});

describe('isValidName', () => {
  const MAX_LENGTH = 10;

  it.each([
    ['a single character', 'a'],
    ['an extension', 'report.pdf'],
    ['a name of exactly the limit', 'a'.repeat(MAX_LENGTH)],
    ['a space inside the name', 'my file'],
    ['a leading dot', '.hidden'],
    ['three dots', '...'],
    ['non-ASCII letters', 'čaj'],
    ['a complete emoji', '😀'],
    ['SQL and markup characters', `'<b>%_`],
  ])('accepts %s', (_label, name) => {
    expect(isValidName(name, MAX_LENGTH)).toBe(true);
  });

  it.each([
    ['an empty name', ''],
    ['a name over the limit', 'a'.repeat(MAX_LENGTH + 1)],
    ['only spaces', '   '],
    ['a leading space', ' a'],
    ['a trailing space', 'a '],
    ['a trailing non-breaking space', 'a '],
    ['the current directory', '.'],
    ['the parent directory', '..'],
    ['a forward slash', 'a/b'],
    ['a backslash', 'a\\b'],
    ['a NUL byte', 'a\u0000b'],
    ['a tab', 'a\tb'],
    ['a newline', 'a\nb'],
    ['a carriage return', 'a\rb'],
    ['the DEL character', 'a\u007fb'],
    ['a C1 control character', 'a\u0085b'],
    ['a lone high surrogate', 'a\ud83db'],
    ['a lone low surrogate', 'a\ude00b'],
  ])('rejects %s', (_label, name) => {
    expect(isValidName(name, MAX_LENGTH)).toBe(false);
  });
});

describe('IsName', () => {
  class Sample {
    @IsName(3)
    name: unknown;
  }

  const errorsFor = (name: unknown) => {
    const sample = new Sample();
    sample.name = name;
    return validateSync(sample);
  };

  it('accepts a valid name within the given limit', () => {
    expect(errorsFor('abc')).toEqual([]);
  });

  it('applies the given limit', () => {
    expect(errorsFor('abcd')).toHaveLength(1);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['an array', ['a']],
    ['an object', { contains: 'a' }],
  ])('rejects %s', (_label, name) => {
    expect(errorsFor(name)).toHaveLength(1);
  });

  it('reports the property and the limit', () => {
    expect(errorsFor('abcd')[0].constraints?.isName).toContain(
      'name must be 1-3 characters',
    );
  });
});
