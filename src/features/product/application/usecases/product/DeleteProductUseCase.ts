import { Product, ProductId } from '../../../domain/entities/Product';
import { ProductHistory, HistoryAction } from '../../../domain/entities/ProductHistory';
import { ProductRepository } from '../../../domain/repositories/ProductRepository';
import { ProductHistoryRepository } from '../../../domain/repositories/ProductHistoryRepository';
import { ProductUsageChecker } from '../../../domain/services/ProductUsageChecker';
import { v4 as uuidv4 } from 'uuid';

export interface DeleteProductRequest {
  productId: string;
  id_updated: string;
  reason?: string;
}

export class DeleteProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private productHistoryRepository: ProductHistoryRepository,
    private productUsageChecker: ProductUsageChecker
  ) {}

  async execute(request: DeleteProductRequest): Promise<void> {
    const product = await this.productRepository.findById(new ProductId(request.productId));
    if (!product) {
      throw new Error('존재하지 않는 제품입니다.');
    }

    await this.validateDeletion(product);

    const deletedProduct = new Product(
      product.getId(),
      product.getCdMaterial(),
      product.getNmMaterial(),
      product.getType(),
      product.getCategory(),
      product.getUnit(),
      product.getSafetyStock(),
      false, // 비활성화
      product.getAdditionalInfo(),
      product.getIdCreate(),
      request.id_updated,
      product.getDtCreate(),
      new Date()
    );

    await this.productRepository.save(deletedProduct);

    const history = new ProductHistory(
      uuidv4(),
      product.getId(),
      HistoryAction.DELETE,
      {
        fieldName: 'isActive',
        oldValue: true,
        newValue: false
      },
      request.id_updated,
      request.id_updated,
      new Date(),
      request.reason || '제품 삭제'
    );
    await this.productHistoryRepository.save(history);
  }

  private async validateDeletion(product: Product): Promise<void> {
    const isUsedInBOM = await this.productUsageChecker.isUsedInBOM(product.getId());
    if (isUsedInBOM) {
      throw new Error('BOM에서 사용 중인 제품은 삭제할 수 없습니다.');
    }

    const isUsedInProduction = await this.productUsageChecker.isUsedInProduction(product.getId());
    if (isUsedInProduction) {
      throw new Error('생산 계획에서 사용 중인 제품은 삭제할 수 없습니다.');
    }

    const hasStock = await this.productUsageChecker.hasStock(product.getId());
    if (hasStock) {
      throw new Error('재고가 있는 제품은 삭제할 수 없습니다.');
    }
  }
}