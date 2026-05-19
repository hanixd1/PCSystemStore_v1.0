import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const BUILDER_CATEGORIES = [
  'CPU',
  'MOTHERBOARD',
  'RAM',
  'GPU',
  'STORAGE',
  'PSU',
  'CASE',
  'COOLER',
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
  'cooler',
] as const;

export class BuildItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  @IsIn(BUILDER_CATEGORIES)
  category?: string;
}

export class ValidateBuildDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BuildItemDto)
  items: BuildItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(['builder'])
  source?: 'builder';
}
