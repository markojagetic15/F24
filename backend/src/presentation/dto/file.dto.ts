import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  IsName,
  IsNamePrefix,
  MAX_FILE_NAME_LENGTH,
} from '../../domain/validators/name.validator.js';

export const ROOT_PARENT_ID = 'root';

// A folder id or `root`. Leaving it out searches all files
const IsSearchParent = () =>
  applyDecorators(
    ValidateIf(
      (_query: object, value: unknown) =>
        value !== undefined && value !== ROOT_PARENT_ID,
    ),
    IsUUID(),
  );

export class CreateFileBody {
  @IsName(MAX_FILE_NAME_LENGTH)
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class ListFilesQuery {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  // The list is ordered by name, so its cursor is a name
  @IsOptional()
  @IsName(MAX_FILE_NAME_LENGTH)
  cursor?: string;
}

export class SearchFilesQuery {
  @IsName(MAX_FILE_NAME_LENGTH)
  name: string;

  @IsSearchParent()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export class TopFilesQuery {
  @IsNamePrefix(MAX_FILE_NAME_LENGTH)
  prefix: string;

  @IsSearchParent()
  parentId?: string;
}
