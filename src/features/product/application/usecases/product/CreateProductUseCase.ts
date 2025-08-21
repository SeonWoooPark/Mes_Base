import { Product, ProductId, ProductType, Category, Unit, AdditionalInfo } from '../../../domain/entities/Product';
import { ProductHistory, HistoryAction } from '../../../domain/entities/ProductHistory';
import { ProductRepository } from '../../../domain/repositories/ProductRepository';
import { ProductHistoryRepository } from '../../../domain/repositories/ProductHistoryRepository';
import { ProductCodeGenerator } from '../../../domain/services/ProductCodeGenerator';
import { v4 as uuidv4 } from 'uuid';

export interface CreateProductRequest {
  nm_material: string;
  type: ProductType;
  category: {
    code: string;
    name: string;
  };
  unit: {
    code: string;
    name: string;
  };
  safetyStock: number;
  isActive: boolean;
  additionalInfo?: {
    description?: string;
    specifications?: string;
    notes?: string;
  };
  id_create: string;
}

export interface CreateProductResponse {
  productId: string;
  productCode: string;
  success: boolean;
  message: string;
}

export class CreateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private productHistoryRepository: ProductHistoryRepository,
    private productCodeGenerator: ProductCodeGenerator
  ) {}

  async execute(request: CreateProductRequest): Promise<CreateProductResponse> {
    await this.validateBusinessRules(request);

    const cd_material = await this.productCodeGenerator.generateCode(request.type);

    const productId = new ProductId(uuidv4());
    const category = new Category(request.category.code, request.category.name);
    const unit = new Unit(request.unit.code, request.unit.name);
    const additionalInfo = new AdditionalInfo(
      request.additionalInfo?.description,
      request.additionalInfo?.specifications,
      request.additionalInfo?.notes
    );

    const now = new Date();
    const product = new Product(
      productId,
      cd_material,
      request.nm_material,
      request.type,
      category,
      unit,
      request.safetyStock,
      request.isActive,
      additionalInfo,
      request.id_create,
      request.id_create,
      now,
      now
    );

    await this.productRepository.save(product);

    const history = new ProductHistory(
      uuidv4(),
      productId,
      HistoryAction.CREATE,
      {
        fieldName: 'product_created',
        oldValue: null,
        newValue: product.getCdMaterial()
      },
      request.id_create,
      request.id_create,
      new Date(),
      '신규 제품 등록'
    );
    await this.productHistoryRepository.save(history);

    return {
      productId: productId.getValue(),
      productCode: cd_material,
      success: true,
      message: `제품 정보가 성공적으로 등록되었습니다. (제품코드: ${cd_material})`
    };
  }

  private async validateBusinessRules(request: CreateProductRequest): Promise<void> {
    if (request.safetyStock < 0) {
      throw new Error('안전재고는 0 이상이어야 합니다.');
    }
    if (!request.nm_material.trim()) {
      throw new Error('제품명은 필수입니다.');
    }
    if (request.nm_material.length > 50) {
      throw new Error('제품명은 50자 이내로 입력해주세요.');
    }
  }
}