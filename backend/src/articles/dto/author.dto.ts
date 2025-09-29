import { IsString, IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AuthorDto {
    @ApiProperty({
        example: "Nahuel Sánchez",
        description: "Nombre completo del autor del paper",
    })
    @IsString()
    @IsNotEmpty({ message: "El nombre del autor es obligatorio" })
    name: string;

    @ApiProperty({
        example: "nahuel@example.com",
        description: "Correo electrónico válido del autor",
    })
    @IsEmail({}, { message: "El email no tiene un formato válido" })
    @IsNotEmpty({ message: "El correo electrónico es obligatorio" })
    email: string;

    @ApiProperty({
        example: "Universidad Nacional de Formosa",
        description: "Institución, organización o empresa a la que pertenece el autor",
    })
    @IsString()
    @IsNotEmpty({ message: "La afiliación es obligatoria" })
    affiliation: string;
}
