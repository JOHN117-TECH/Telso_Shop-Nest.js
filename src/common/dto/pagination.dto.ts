import { Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class PaginationDto {
   
    @IsOptional()
    @IsPositive()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number;
  
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    offset?: number;

    @IsOptional()
    @IsString({ message: "Please enter a valid search 'value'" })
    search?:string;

}