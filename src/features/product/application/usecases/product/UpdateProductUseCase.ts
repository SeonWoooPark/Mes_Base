import { Product, ProductId, ProductType, Category, Unit, AdditionalInfo } from '../../../domain/entities/Product';
import { ProductHistory, HistoryAction, ChangedField } from '../../../domain/entities/ProductHistory';
import { ProductRepository } from '../../../domain/repositories/ProductRepository';
import { ProductHistoryRepository } from '../../../domain/repositories/ProductHistoryRepository';
import { v4 as uuidv4 } from 'uuid';

export interface UpdateProductRequest {
  productId: string;
  nm_material?: string;
  type?: ProductType;
  category?: {
    code: string;
    name: string;
  };
  unit?: {
    code: string;
    name: string;
  };
  safetyStock?: number;
  isActive?: boolean;
  additionalInfo?: {
    description?: string;
    specifications?: string;
    notes?: string;
  };
  id_updated: string;
  reason?: string;
}

export class UpdateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private productHistoryRepository: ProductHistoryRepository
  ) {}

  async execute(request: UpdateProductRequest): Promise<void> {
    const existingProduct = await this.productRepository.findById(new ProductId(request.productId));
    if (!existingProduct) {
      throw new Error('존재하지 않는 제품입니다.');
    }

    await this.validateBusinessRules(existingProduct, request);

    const changedFields = this.detectChanges(existingProduct, request);
    // 변경사항 체크는 detectChanges 내부에서 처리됨

    const updatedProduct = this.createUpdatedProduct(existingProduct, request);

    await this.productRepository.save(updatedProduct);

    // const history = new ProductHistory(
    //   uuidv4(),
    //   existingProduct.getId(),
    //   HistoryAction.UPDATE,
    //   changedFields,
    //   request.id_updated,
    //   request.id_updated,
    //   new Date(),
    //   request.reason
    // );
    // await this.productHistoryRepository.save(history);
  }

  private async validateBusinessRules(
    existingProduct: Product, 
    request: UpdateProductRequest
  ): Promise<void> {
    if (existingProduct.getType() === ProductType.FINISHED_PRODUCT && 
        request.type === ProductType.RAW_MATERIAL) {
      throw new Error('완제품을 원자재로 변경할 수 없습니다.');
    }

    if (request.safetyStock !== undefined && request.safetyStock < 0) {
      throw new Error('안전재고는 0 이상이어야 합니다.');
    }

    if (request.nm_material && request.nm_material.length > 50) {
      throw new Error('제품명은 50자 이내로 입력해주세요.');
    }
  }

  private detectChanges(existingProduct: Product, request: UpdateProductRequest): ChangedField {
    // 첫 번째로 발견된 변경사항을 반환 (단순화된 구현)
    if (request.nm_material && request.nm_material !== existingProduct.getNmMaterial()) {
      return {
        fieldName: 'nm_material',
        oldValue: existingProduct.getNmMaterial(),
        newValue: request.nm_material
      };
    }

    if (request.type && request.type !== existingProduct.getType()) {
      return {
        fieldName: 'type',
        oldValue: existingProduct.getType(),
        newValue: request.type
      };
    }

    if (request.safetyStock !== undefined && request.safetyStock !== existingProduct.getSafetyStock()) {
      return {
        fieldName: 'safetyStock',
        oldValue: existingProduct.getSafetyStock(),
        newValue: request.safetyStock
      };
    }

    if (request.isActive !== undefined && request.isActive !== existingProduct.getIsActive()) {
      return {
        fieldName: 'isActive',
        oldValue: existingProduct.getIsActive(),
        newValue: request.isActive
      };
    }

    // 변경사항이 없는 경우 기본값 반환
    return {
      fieldName: 'updated',
      oldValue: null,
      newValue: new Date().toISOString()
    };
  }

  private createUpdatedProduct(existingProduct: Product, request: UpdateProductRequest): Product {
    const category = request.category 
      ? new Category(request.category.code, request.category.name)
      : existingProduct.getCategory();

    const unit = request.unit 
      ? new Unit(request.unit.code, request.unit.name)
      : existingProduct.getUnit();

    const additionalInfo = request.additionalInfo 
      ? new AdditionalInfo(
          request.additionalInfo.description,
          request.additionalInfo.specifications,
          request.additionalInfo.notes
        )
      : existingProduct.getAdditionalInfo();

    return new Product(
      existingProduct.getId(),
      existingProduct.getCdMaterial(),
      request.nm_material ?? existingProduct.getNmMaterial(),
      request.type ?? existingProduct.getType(),
      category,
      unit,
      request.safetyStock ?? existingProduct.getSafetyStock(),
      request.isActive ?? existingProduct.getIsActive(),
      additionalInfo,
      existingProduct.getIdCreate(),
      request.id_updated,
      existingProduct.getDtCreate(),
      new Date()
    );
  }
}