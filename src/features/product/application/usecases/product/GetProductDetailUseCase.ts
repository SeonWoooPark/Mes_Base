import { injectable } from 'tsyringe';
import { Product, ProductId } from '../../../domain/entities/Product';
import type { ProductRepository } from '../../../domain/repositories/ProductRepository';

/**
 * 제품 상세 정보 조회 요청
 */
export interface GetProductDetailRequest {
  productId: string;
}

/**
 * 제품 상세 정보 조회 응답
 */
export interface GetProductDetailResponse {
  id: string;
  cd_material: string;
  nm_material: string;
  type: string;
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
  additionalInfo: {
    description?: string;
    specifications?: string;
    notes?: string;
  };
  id_create: string;
  id_updated: string;
  dt_create: Date;
  dt_update: Date;
}

/**
 * 제품 상세 정보 조회 UseCase
 * 
 * 제품 ID를 기반으로 전체 제품 정보를 조회합니다.
 * additionalInfo를 포함한 모든 정보를 반환합니다.
 */
@injectable()
export class GetProductDetailUseCase {
  constructor(
    private productRepository: ProductRepository
  ) {}

  /**
   * 제품 상세 정보 조회 실행
   * @param request 조회 요청 정보
   * @returns 제품 상세 정보
   */
  async execute(request: GetProductDetailRequest): Promise<GetProductDetailResponse | null> {
    // 1. 제품 ID 생성
    const productId = new ProductId(request.productId);

    // 2. 저장소에서 제품 조회
    const product = await this.productRepository.findById(productId);

    if (!product) {
      return null;
    }

    // 3. 응답 데이터 구성
    return this.mapProductToResponse(product);
  }

  /**
   * Product 엔티티를 응답 DTO로 변환
   * @param product 제품 엔티티
   * @returns 제품 상세 정보 응답
   */
  private mapProductToResponse(product: Product): GetProductDetailResponse {
    return {
      id: product.getId().getValue(),
      cd_material: product.getCdMaterial(),
      nm_material: product.getNmMaterial(),
      type: product.getType(),
      category: {
        code: product.getCategory().code,
        name: product.getCategory().name,
      },
      unit: {
        code: product.getUnit().code,
        name: product.getUnit().name,
      },
      safetyStock: product.getSafetyStock(),
      isActive: product.getIsActive(),
      additionalInfo: {
        description: product.getAdditionalInfo()?.description,
        specifications: product.getAdditionalInfo()?.specifications,
        notes: product.getAdditionalInfo()?.notes,
      },
      id_create: product.getIdCreate(),
      id_updated: product.getIdUpdated(),
      dt_create: product.getDtCreate(),
      dt_update: product.getDtUpdate(),
    };
  }
}