import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { IsName, MAX_FILE_NAME_LENGTH } from '../validators/name.validator.js';

export const ROOT_PARENT_ID = 'root';

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

  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export class SearchFilesQuery {
  @IsName(MAX_FILE_NAME_LENGTH)
  name: string;

  @IsOptional()
  @IsUUID()
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
