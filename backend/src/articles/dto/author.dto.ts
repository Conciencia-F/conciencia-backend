import { IsString, IsEmail, IsNotEmpty } from "class-validator";

export class AuthorDto {
    @IsString()
    @IsNotEmpty({ message: "El nombre del autor es obligatorio" })
    name: string;

    @IsEmail({}, { message: "El email no tiene un formato válido" })
    @IsNotEmpty({ message: "El correo electronico es obligatorio" })
    email: string;

    @IsString()
    @IsNotEmpty({ message: "La afiliación es obligatoria" })
    affiliation: string;
}