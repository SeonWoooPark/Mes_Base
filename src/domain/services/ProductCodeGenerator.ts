import { ProductType } from '../entities/Product';
import { ProductRepository } from '../repositories/ProductRepository';

export interface ProductCodeGenerator {
  generateCode(type: ProductType): Promise<string>;
}

export class DefaultProductCodeGenerator implements ProductCodeGenerator {
  constructor(private productRepository: ProductRepository) {}

  async generateCode(type: ProductType): Promise<string> {
    const prefix = this.getPrefix(type);
    const today = new Date();
    const yearMonth = today.getFullYear().toString().slice(2) + 
                     (today.getMonth() + 1).toString().padStart(2, '0');
    
    const lastSequence = await this.productRepository.getLastSequenceByPrefix(prefix + yearMonth);
    const nextSequence = (lastSequence + 1).toString().padStart(3, '0');
    
    return `${prefix}${yearMonth}${nextSequence}`;
  }

  private getPrefix(type: ProductType): string {
    switch (type) {
      case ProductType.FINISHED_PRODUCT:
        return 'FG'; // Finished Goods
      case ProductType.SEMI_FINISHED:
        return 'SF'; // Semi Finished
      case ProductType.RAW_MATERIAL:
        return 'RM'; // Raw Material
      default:
        return 'PR'; // Product
    }
  }
}