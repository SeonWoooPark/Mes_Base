// 외부 엔티티 및 서비스 import
import { BOM } from '../../../domain/entities/BOM';
import { BOMId } from '../../../domain/entities/BOMItem';
import { BOMItem, BOMItemId, ComponentType } from '../../../domain/entities/BOMItem';
import { BOMHistory, BOMHistoryAction } from '../../../domain/entities/BOMHistory';
import { Product, ProductId, Unit } from '@features/product/domain/entities/Product';
import { BOMRepository } from '../../../domain/repositories/BOMRepository';
import { BOMItemRepository } from '../../../domain/repositories/BOMItemRepository';
import { BOMHistoryRepository } from '../../../domain/repositories/BOMHistoryRepository';
import { ProductRepository } from '@features/product/domain/repositories/ProductRepository';
import { BOMCircularChecker } from '../../../domain/services/BOMCircularChecker';
import { BOMPresenter, BOMTreeNode } from './GetBOMTreeUseCase';

/**
 * BOM 아이템 추가 유스케이스
 * 
 * 워크플로우:
 * 1. 요청 데이터 검증 (필수 필드, 데이터 유효성)
 * 2. BOM 존재 확인 및 권한 검사
 * 3. 구성품 정보 확인
 * 4. 비즈니스 규칙 검증 (중복, 순환참조 등)
 * 5. 레벨 및 순서 계산
 * 6. BOM 아이템 생성 및 검증
 * 7. 순환 참조 최종 검사
 * 8. 데이터 저장 (BOM Item + BOM 수정일시 갱신)
 * 9. 변경 이력 기록
 * 10. 성공 응답 (새로운 트리 노드 포함)
 * 
 * 비즈니스 규칙:
 * - 동일 레벨에서 동일 구성품 중복 방지
 * - 순환 참조 방지 (A → B → A)
 * - 자기 참조 방지 (A → A)
 * - 상위 구성품 존재 확인
 * - 제품 유형별 제약사항 확인
 */

/**
 * BOM 아이템 추가 요청 인터페이스
 */
export interface AddBOMItemRequest {
  bomId: string;                       // BOM ID
  parentItemId?: string;               // 상위 구성품 ID (없으면 최상위)
  componentId: string;                 // 구성품 제품 ID
  quantity: number;                    // 소요량
  unit: {                              // 단위 정보
    code: string;                      // 단위 코드 (EA, KG, M 등)
    name: string;                      // 단위 명 (개, 킬로그램, 미터 등)
  };
  unitCost: number;                    // 단가
  scrapRate: number;                   // 스크랩률 (%)
  isOptional: boolean;                 // 선택사항 여부
  componentType: ComponentType;        // 구성품 유형
  position?: string;                   // 조립 위치 (예: "상단좌측", "PCB-U1")
  processStep?: string;                // 투입 공정 (예: "SMT공정", "조립공정")
  remarks?: string;                    // 비고 (특별 지시사항, 주의사항 등)
  effectiveDate: Date;                 // 적용일
  expiryDate?: Date;                   // 만료일
  id_create: string;                   // 생성자 ID
  reason?: string;                     // 추가 사유
}

/**
 * BOM 아이템 추가 응답 인터페이스
 */
export interface AddBOMItemResponse {
  bomItemId: string;                   // 생성된 BOM Item ID
  success: boolean;                    // 성공 여부
  message: string;                     // 결과 메시지
  newTreeNode: BOMTreeNode;           // 새로 생성된 트리 노드
  updatedBOMInfo: {                    // 업데이트된 BOM 정보
    totalCost: number;                 // 갱신된 총 비용
    totalItems: number;                // 갱신된 총 아이템 수
    lastUpdated: Date;                 // 갱신된 수정일시
  };
}

/**
 * BOM 아이템 추가 유스케이스 클래스
 */
export class AddBOMItemUseCase {
  constructor(
    private bomRepository: BOMRepository,
    private bomItemRepository: BOMItemRepository,
    private productRepository: ProductRepository,
    private bomHistoryRepository: BOMHistoryRepository,
    private bomCircularChecker: BOMCircularChecker,
    private bomPresenter: BOMPresenter
  ) {}

  /**
   * BOM 아이템 추가 실행
   * @param request 추가 요청 정보
   * @returns 추가 결과 응답
   */
  async execute(request: AddBOMItemRequest): Promise<AddBOMItemResponse> {
    // 1. 입력 검증
    await this.validateRequest(request);

    // 2. BOM 존재 확인
    const bom = await this.bomRepository.findById(new BOMId(request.bomId));
    if (!bom) {
      throw new Error('존재하지 않는 BOM입니다.');
    }

    // BOM이 현재 활성 상태인지 확인
    if (!bom.isCurrentlyActive()) {
      throw new Error('비활성 BOM에는 구성품을 추가할 수 없습니다.');
    }

    // 3. 구성품 정보 확인
    const component = await this.productRepository.findById(new ProductId(request.componentId));
    if (!component) {
      throw new Error('존재하지 않는 구성품입니다.');
    }

    // 구성품이 활성 상태인지 확인
    if (!component.getIsActive()) {
      throw new Error('비활성 제품은 구성품으로 추가할 수 없습니다.');
    }

    // 4. 비즈니스 규칙 검증
    await this.validateBusinessRules(bom, request);

    // 5. 레벨 및 순서 계산
    const level = await this.calculateLevel(request.parentItemId);
    const sequence = await this.getNextSequence(request.bomId, request.parentItemId, level);

    // 6. BOM 아이템 생성
    const bomItemId = new BOMItemId(this.generateBOMItemId());
    const parentItemId = request.parentItemId ? new BOMItemId(request.parentItemId) : undefined;
    const unit = new Unit(request.unit.code, request.unit.name);

    const bomItem = new BOMItem(
      bomItemId,
      new BOMId(request.bomId),
      new ProductId(request.componentId),
      parentItemId,
      level,
      sequence,
      request.quantity,
      unit,
      request.unitCost,
      request.scrapRate,
      request.isOptional,
      request.componentType,
      request.effectiveDate,
      request.id_create,
      request.id_create,
      new Date(),
      new Date(),
      request.position,
      request.processStep,
      request.remarks,
      request.expiryDate
    );

    // 7. 순환 참조 검사
    const circularResult = await this.bomCircularChecker.hasCircularReference(bom, bomItem);
    if (circularResult.hasCircularReference) {
      throw new Error(circularResult.message || '순환 참조가 발생합니다. 해당 구성품을 추가할 수 없습니다.');
    }

    // 8. 저장 트랜잭션 시작
    try {
      // BOM Item 저장
      await this.bomItemRepository.save(bomItem);

      // BOM 수정일시 업데이트
      await this.updateBOMLastModified(bom, request.id_create);

      // 9. 변경 이력 기록
      await this.recordHistory(bom, bomItem, request);

      // 10. 새로운 트리 노드 생성
      const newTreeNode = await this.createTreeNode(bomItem, component);

      // 11. 업데이트된 BOM 정보 계산
      const updatedBOM = await this.bomRepository.findById(bom.getId());
      const updatedBOMInfo = {
        totalCost: updatedBOM?.calculateTotalCost() || bom.calculateTotalCost(),
        totalItems: (await this.bomItemRepository.countByBOMId(bom.getId())) || 0,
        lastUpdated: new Date()
      };

      return {
        bomItemId: bomItemId.getValue(),
        success: true,
        message: `구성품 "${component.getNmMaterial()}"이 성공적으로 추가되었습니다.`,
        newTreeNode,
        updatedBOMInfo
      };

    } catch (error) {
      // 저장 실패 시 롤백 처리
      throw new Error(`구성품 추가 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  // === Private 메서드들 ===

  /**
   * 요청 데이터 유효성 검증
   */
  private async validateRequest(request: AddBOMItemRequest): Promise<void> {
    // 필수 필드 검사
    if (!request.bomId || request.bomId.trim().length === 0) {
      throw new Error('BOM ID는 필수입니다.');
    }
    if (!request.componentId || request.componentId.trim().length === 0) {
      throw new Error('구성품은 필수입니다.');
    }
    if (!request.id_create || request.id_create.trim().length === 0) {
      throw new Error('생성자 정보는 필수입니다.');
    }

    // 수량 및 비용 검증
    if (request.quantity <= 0) {
      throw new Error('소요량은 0보다 커야 합니다.');
    }
    if (request.scrapRate < 0 || request.scrapRate > 100) {
      throw new Error('스크랩률은 0-100% 범위여야 합니다.');
    }
    if (request.unitCost < 0) {
      throw new Error('단가는 0 이상이어야 합니다.');
    }

    // 단위 정보 검증
    if (!request.unit.code || !request.unit.name) {
      throw new Error('단위 정보는 필수입니다.');
    }

    // 날짜 검증
    if (request.effectiveDate > new Date()) {
      throw new Error('적용일은 현재일보다 미래일 수 없습니다.');
    }
    if (request.expiryDate && request.effectiveDate >= request.expiryDate) {
      throw new Error('만료일은 적용일보다 이후여야 합니다.');
    }
  }

  /**
   * 비즈니스 규칙 검증
   */
  private async validateBusinessRules(bom: BOM, request: AddBOMItemRequest): Promise<void> {
    // 1. 자기 참조 검사
    if (bom.getProductId().getValue() === request.componentId) {
      throw new Error('자기 자신을 구성품으로 추가할 수 없습니다.');
    }

    // 2. 상위 구성품 존재 확인
    if (request.parentItemId) {
      const parentExists = await this.bomItemRepository.exists(new BOMItemId(request.parentItemId));
      if (!parentExists) {
        throw new Error('상위 구성품이 존재하지 않습니다.');
      }
    }

    // 3. 동일 구성품 중복 검사
    const isDuplicate = await this.bomItemRepository.isDuplicate(
      new BOMId(request.bomId),
      new ProductId(request.componentId),
      request.parentItemId ? new BOMItemId(request.parentItemId) : undefined
    );
    
    if (isDuplicate) {
      throw new Error('동일한 구성품이 이미 존재합니다.');
    }

    // 4. 상위 구성품이 하위 레벨에 있는지 확인 (간접 순환 검사)
    if (request.parentItemId) {
      const parentItem = await this.bomItemRepository.findById(new BOMItemId(request.parentItemId));
      if (parentItem) {
        const componentBOM = await this.bomRepository.findActiveByProductId(new ProductId(request.componentId));
        if (componentBOM) {
          const hasParentInComponent = await this.checkParentInComponentBOM(
            componentBOM, 
            bom.getProductId()
          );
          if (hasParentInComponent) {
            throw new Error('순환 참조가 발생합니다. 해당 구성품을 추가할 수 없습니다.');
          }
        }
      }
    }
  }

  /**
   * 레벨 계산
   */
  private async calculateLevel(parentItemId?: string): Promise<number> {
    if (!parentItemId) {
      return 0; // 최상위 레벨
    }

    const parentItem = await this.bomItemRepository.findById(new BOMItemId(parentItemId));
    if (!parentItem) {
      throw new Error('상위 구성품을 찾을 수 없습니다.');
    }

    return parentItem.getLevel() + 1;
  }

  /**
   * 다음 순서 번호 조회
   */
  private async getNextSequence(bomId: string, parentItemId?: string, level: number = 0): Promise<number> {
    const sequence = await this.bomItemRepository.getNextSequence(
      new BOMId(bomId), 
      parentItemId ? new BOMItemId(parentItemId) : undefined,
      level
    );
    return sequence;
  }

  /**
   * BOM 수정일시 업데이트
   */
  private async updateBOMLastModified(bom: BOM, userId: string): Promise<void> {
    // 실제 구현에서는 BOM 엔티티를 새로 생성하여 수정일시를 업데이트하고 저장
    // 현재는 Mock 구현이므로 별도 처리 없음
    // TODO: BOM 엔티티 업데이트 로직 구현
  }

  /**
   * 변경 이력 기록
   */
  private async recordHistory(bom: BOM, bomItem: BOMItem, request: AddBOMItemRequest): Promise<void> {
    const history = new BOMHistory(
      this.generateHistoryId(),
      bom.getId(),
      BOMHistoryAction.ADD_ITEM,
      'BOM_ITEM',
      bomItem.getId().getValue(),
      [], // 신규 추가이므로 변경 필드 없음
      request.id_create,
      request.id_create, // 실제로는 사용자 정보 서비스에서 사용자명 조회
      new Date(),
      request.reason || `구성품 추가: ${bomItem.getComponentId().getValue()}`
    );

    await this.bomHistoryRepository.save(history);
  }

  /**
   * 트리 노드 생성
   */
  private async createTreeNode(bomItem: BOMItem, component: Product): Promise<BOMTreeNode> {
    return {
      id: `node-${bomItem.getId().getValue()}`,
      bomItemId: bomItem.getId().getValue(),
      componentId: component.getId().getValue(),
      componentCode: component.getCdMaterial(),
      componentName: component.getNmMaterial(),
      componentType: bomItem.getComponentType(),
      componentTypeDisplay: this.bomPresenter.getComponentTypeDisplayName(bomItem.getComponentType()),
      parentId: bomItem.getParentItemId()?.getValue(),
      level: bomItem.getLevel(),
      sequence: bomItem.getSequence(),
      quantity: bomItem.getQuantity(),
      unit: bomItem.getUnit().code,
      unitName: bomItem.getUnit().name,
      unitCost: bomItem.getUnitCost(),
      totalCost: bomItem.getTotalCost(),
      scrapRate: bomItem.getScrapRate(),
      actualQuantity: bomItem.getActualQuantity(),
      isOptional: bomItem.getIsOptional(),
      position: bomItem.getPosition(),
      processStep: bomItem.getProcessStep(),
      remarks: bomItem.getRemarks(),
      isActive: bomItem.isCurrentlyActive(),
      hasChildren: false,
      isExpanded: false,
      children: [],
      depth: bomItem.getLevel()
    };
  }

  /**
   * 구성품 BOM에서 부모 제품 확인 (간접 순환 검사)
   */
  private async checkParentInComponentBOM(componentBOM: BOM, parentProductId: ProductId): Promise<boolean> {
    const componentItems = componentBOM.getBOMItems();
    
    for (const item of componentItems) {
      if (item.getComponentId().equals(parentProductId)) {
        return true;
      }
      
      // 재귀적으로 하위 BOM 확인
      const subBOM = await this.bomRepository.findActiveByProductId(item.getComponentId());
      if (subBOM) {
        const hasParentInSub = await this.checkParentInComponentBOM(subBOM, parentProductId);
        if (hasParentInSub) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * BOM Item ID 생성
   */
  private generateBOMItemId(): string {
    return `BOMITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 이력 ID 생성
   */
  private generateHistoryId(): string {
    return `BOMHIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}