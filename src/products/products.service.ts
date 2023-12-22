import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID } from 'uuid'
@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService')

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ) { }

  /* Las interacciones con la base de datos son asincronas */
  async create(createProductDto: CreateProductDto) {

    try {

      //Creamos el registro
      const product = this.productRepository.create(createProductDto)
      // Lo grabo y lo impacto en la DB
      await this.productRepository.save(product);

      return product;

    } catch (err) {
      this.handleDBExceptions(err);
    }

  }

  findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0, search = "" } = paginationDto;

    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .take(limit)
      .skip(offset);

    if (search) {

      queryBuilder
        .andWhere('(product.title LIKE :search OR product.description LIKE :search OR product.slug LIKE :search OR product.gender LIKE :search OR CAST(product.stock AS TEXT) LIKE :search OR CAST(product.price AS TEXT) LIKE :search)', { search: `%${search}%` });
    }

    return queryBuilder.getMany();
  }

  async findOne(term: string) {

    let product: Product;

    /*  const product = await this.productRepository.findOneBy({term});*/
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      /* product = await this.productRepository.findOneBy({ slug: term }); */
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder.where(` UPPER(title) =:title or slug =:slug`, {
        title: term.toUpperCase(),
        slug: term.toLowerCase(),
      }).getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with term '${term}' not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto
    })

    if (!product) throw new NotFoundException(`Product with id: '${id}' not found`);

    try {

      await this.productRepository.save(product);
      return product;
    } catch (err) {
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
}
