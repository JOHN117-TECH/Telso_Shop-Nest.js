import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./product.entity";

@Entity({name:"product_images",})
export class ProductImage {
    
    @PrimaryGeneratedColumn()
    id:number;

    @Column('text')
    url:string;

   /*  @Column('text')
    alt:string;
 */
    /*
    * Muchas Imagenes pueden tener un unico producto 
    */
    @ManyToOne(
        ()=> Product,
        (product) => product.images,
        {onDelete:'CASCADE'}
    )
    product:Product;
}