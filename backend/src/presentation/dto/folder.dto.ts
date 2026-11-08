import { IsOptional, IsUUID, Min, IsInt, Max } from 'class-validator';
import {
  IsName,
  MAX_FOLDER_NAME_LENGTH,
} from '../validators/name.validator.js';
import { Type } from 'class-transformer';

export class CreateFolderBody {
  @IsName(MAX_FOLDER_NAME_LENGTH)
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class ListFoldersQuery {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}
