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
    if (changedFields.length === 0) {
      throw new Error('변경된 항목이 없습니다.');
    }

    const updatedProduct = this.createUpdatedProduct(existingProduct, request);

    await this.productRepository.save(updatedProduct);

    const history = new ProductHistory(
      uuidv4(),
      existingProduct.getId(),
      HistoryAction.UPDATE,
      changedFields,
      request.id_updated,
      request.id_updated,
      new Date(),
      request.reason
    );
    await this.productHistoryRepository.save(history);
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

  private detectChanges(existingProduct: Product, request: UpdateProductRequest): ChangedField[] {
    const changes: ChangedField[] = [];

    if (request.nm_material && request.nm_material !== existingProduct.getNmMaterial()) {
      changes.push(new ChangedField('nm_material', existingProduct.getNmMaterial(), request.nm_material));
    }

    if (request.type && request.type !== existingProduct.getType()) {
      changes.push(new ChangedField('type', existingProduct.getType(), request.type));
    }

    if (request.safetyStock !== undefined && request.safetyStock !== existingProduct.getSafetyStock()) {
      changes.push(new ChangedField('safetyStock', existingProduct.getSafetyStock(), request.safetyStock));
    }

    if (request.isActive !== undefined && request.isActive !== existingProduct.getIsActive()) {
      changes.push(new ChangedField('isActive', existingProduct.getIsActive(), request.isActive));
    }

    return changes;
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