import { IsOptional, IsUUID, Min, IsInt, Max } from 'class-validator';
import {
  IsName,
  MAX_FOLDER_NAME_LENGTH,
} from '../../domain/validators/name.validator.js';
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
  @Min(1)
  @Max(200)
  limit: number = 50;

  @IsOptional()
  @IsUUID()
  cursor?: string;
}
