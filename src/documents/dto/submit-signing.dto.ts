import { IsArray, IsNotEmpty } from 'class-validator';

export class FieldValueDto {
    @IsNotEmpty()
    fieldId: string;

    @IsNotEmpty()
    value: string;
}

export class SubmitSigningDto {
    @IsArray()
    fields: FieldValueDto[];
}