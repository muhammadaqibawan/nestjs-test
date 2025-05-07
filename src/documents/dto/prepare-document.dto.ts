import { IsEmail, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SignerDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}

export class FieldDto {
  @IsNotEmpty()
  type: 'SIGNATURE' | 'TEXT' | 'DATE' | 'INITIALS';

  x: number;
  y: number;
  page: number;
}

export class PrepareDocumentDto {
  @ValidateNested()
  @Type(() => SignerDto)
  signer: SignerDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDto)
  fields: FieldDto[];
}
