import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID } from 'uuid'
import { ProductImage } from './entities';
@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService')

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ) { }

  /* Las interacciones con la base de datos son asincronas */
  async create(createProductDto: CreateProductDto) {

    try {

      const { images= [], ...productDetails } = createProductDto;
     
      console.log({images})
      
      //Creamos el registro
      /* const product = this.productRepository.create({
        ...productDetails,
        images: images.map(image => this.productImageRepository.create({ url: image.url, alt: image.alt }))
      }) */
        // Crear la entidad de producto
        const product = this.productRepository.create({
            ...productDetails,
            images: images.map(image => this.productImageRepository.create({ url: image }))
        });

        
      // Lo grabo y lo impacto en la DB
      await this.productRepository.save(product);

      return product;

    } catch (err) {
      this.handleDBExceptions(err);
    }

  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0, search = "" } = paginationDto;

    const queryBuilder = this.productRepository.createQueryBuilder('products')
      .leftJoinAndSelect('product.images', 'images')
      .take(limit)
      .skip(offset)

    if (search) {

      queryBuilder
        .andWhere('(product.title LIKE :search OR product.description LIKE :search OR product.slug LIKE :search OR product.gender LIKE :search OR CAST(product.stock AS TEXT) LIKE :search OR CAST(product.price AS TEXT) LIKE :search)', { search: `%${search}%` });
    }

    const products = await queryBuilder.getMany()

    /* Asi las aplanamos las imagenes para que se ven como originalmente son */
    /*  return products.map((product) => ({
       ...product,
       images: product.images.map((image) => image.url)
     }))
  */
    /*  return queryBuilder.getMany(); */
  }

  async findOne(term: string) {

    let product: Product;

    /*  const product = await this.productRepository.findOneBy({term});*/
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      /* product = await this.productRepository.findOneBy({ slug: term }); */
      const queryBuilder = this.productRepository.createQueryBuilder('products')
      product = await queryBuilder.where(` UPPER(title) =:title or slug =:slug`, {
        title: term.toUpperCase(),
        slug: term.toLowerCase(),
      }).leftJoinAndSelect('product.images', 'images').getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with term '${term}' not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {


    const { images, ...rest } = updateProductDto;


    const product = await this.productRepository.preload({
      id: id,
      ...rest,
    })

    if (!product) throw new NotFoundException(`Product with id: '${id}' not found`);

    //Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    //Las transacciones son query que van a impactar la DB
    // 1. Nos conectamos primero a la DB
    await queryRunner.connect();
    // 2. Iniciamos la transaccion
    await queryRunner.startTransaction();
    try {

      if (images) {
        /* Con esto borramos las imagenes anteriores */
        await queryRunner.manager.delete(ProductImage, { product: { id } })


          /*  product.images = images.map(
             image => this.productImageRepository.create({ url: image })
           );*/
          /* product.images = this.productImageRepository.create({ url: images.url, alt: images.alt }) */
          ;
      }

      await queryRunner.manager.save(product)

      await queryRunner.commitTransaction();
      await queryRunner.release();

      /* await this.productRepository.save(product); */
      return product;
    } catch (err) {

      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDBExceptions(err);
    }

  }

  async remove(id: string) {

    const product = await this.findOne(id);

    await this.productRepository.remove(product);

    return `This action removes a #${id} product`;
  }

  private handleDBExceptions(error: any) {

    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error, check server logs');

  }

  async deleteAllProducts() {
    //                                                   Nombre de la tabla 
    const query = this.productRepository.createQueryBuilder('products');

    try {
      return await query
        .delete()
        .where({})
        .execute();

    } catch (error) {
      this.handleDBExceptions(error);
    }

  }
}
