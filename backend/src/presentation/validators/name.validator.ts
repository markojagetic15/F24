import { ValidateBy } from 'class-validator';

export const MAX_FOLDER_NAME_LENGTH = 248;
export const MAX_FILE_NAME_LENGTH = 255;

// Not allowed symbols:
// `/` - separator for Linux and macOS based systems - let's take for example
// a folder name - `folder/folder` - in Linux and macOS this would mean create a folder name
// `folder` with a file name `folder` in it
// `\\` - separator for Windows that does the same thing as previous symbol
// `\p{Cc}` - covers `\n`, `\t`, `\r` etc.
// `\p{Cs}` - half of an emoji (a lone surrogate); the database can't store it,
// so it would be saved as `�` instead of the name the user sent
const FORBIDDEN_CHARACTERS = /[/\\\p{Cc}\p{Cs}]/u;
// `.` and `..` are reserved for navigating file explorers
const RESERVED_NAMES = new Set(['.', '..']);

// Same for folder and files
export function isValidName(name: string, maxLength: number): boolean {
  return (
    name.length > 0 &&
    name.length <= maxLength &&
    !FORBIDDEN_CHARACTERS.test(name) &&
    name === name.trim() &&
    !RESERVED_NAMES.has(name)
  );
}

export const IsName = (maxLength: number): PropertyDecorator =>
  ValidateBy({
    name: 'isName',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' && isValidName(value, maxLength),
      defaultMessage: () =>
        `$property must be 1-${maxLength} characters, without surrounding spaces, control characters, slashes or backslashes, and cannot be '.' or '..'`,
    },
  });
