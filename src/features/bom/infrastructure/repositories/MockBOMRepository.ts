/**
 * BOM Mock Repository 구현체
 * 
 * 워크플로우:
 * 1. 메모리 내 BOM 데이터 관리
 * 2. 실제 API와 동일한 인터페이스 제공
 * 3. 네트워크 지연 시간 시뮬레이션
 * 4. 페이징, 필터링, 정렬 기능 구현
 * 5. 비즈니스 규칙 검증 및 에러 처리
 * 
 * 특징:
 * - Repository 인터페이스 완전 구현
 * - 트랜잭션 시뮬레이션
 * - 실제 DB 동작과 유사한 응답 시간
 * - 개발/테스트 환경에서 독립적 동작
 */

import { BOMRepository } from '../../domain/repositories/BOMRepository';
import { BOM } from '../../domain/entities/BOM';
import { BOMId } from '../../domain/entities/BOMItem';
import { ProductId } from '@features/product/domain/entities/Product';

export class MockBOMRepository implements BOMRepository {
  
  /**
   * 네트워크 지연 시뮬레이션
   * @param ms 지연 시간 (밀리초)
   */
  private async simulateDelay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * BOM 저장 (생성/수정)
   */
  async save(bom: BOM): Promise<void> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    try {
      const existingIndex = MockBOMData.getBOMs().findIndex(b => 
        b.getId().equals(bom.getId())
      );

      if (existingIndex >= 0) {
        // 기존 BOM 수정
        MockBOMData.updateBOM(existingIndex, bom);
      } else {
        // 새 BOM 추가
        MockBOMData.addBOM(bom);
      }
    } catch (error) {
      throw new Error(`BOM 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * ID로 BOM 조회
   */
  async findById(bomId: BOMId): Promise<BOM | null> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const bom = MockBOMData.getBOMs().find(b => b.getId().equals(bomId));
    return bom || null;
  }

  /**
   * 제품 ID로 활성 BOM 조회
   */
  async findActiveByProductId(productId: ProductId): Promise<BOM | null> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const activeBOM = MockBOMData.getBOMs().find(bom => 
      bom.getProductId().equals(productId) && bom.isCurrentlyActive()
    );
    
    return activeBOM || null;
  }

  /**
   * 제품 ID로 모든 BOM 조회 (버전 포함)
   */
  async findByProductId(productId: ProductId): Promise<BOM[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMs()
      .filter(bom => bom.getProductId().equals(productId))
      .sort((a, b) => b.getDtUpdate().getTime() - a.getDtUpdate().getTime());
  }

  /**
   * 제품 ID와 버전으로 BOM 조회
   */
  async findByProductIdAndVersion(productId: ProductId, version: string): Promise<BOM | null> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const bom = MockBOMData.getBOMs().find(b => 
      b.getProductId().equals(productId) && b.getVersion() === version
    );
    
    return bom || null;
  }

  /**
   * 페이징된 BOM 목록 조회
   */
  async findByPage(
    page: number, 
    size: number, 
    sortBy: string = 'dt_update', 
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<BOM[]> {
    await this.simulateDelay(350);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    let boms = MockBOMData.getBOMs();

    // 정렬 적용
    boms = this.applySorting(boms, sortBy, sortOrder);

    // 페이징 적용
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;

    return boms.slice(startIndex, endIndex);
  }

  /**
   * 검색 조건으로 BOM 조회
   */
  async findWithCriteria(
    productId?: ProductId,
    version?: string,
    isActive?: boolean,
    fromDate?: Date,
    toDate?: Date
  ): Promise<BOM[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    let boms = MockBOMData.getBOMs();

    // 제품 ID 필터
    if (productId) {
      boms = boms.filter(bom => bom.getProductId().equals(productId));
    }

    // 버전 필터
    if (version) {
      boms = boms.filter(bom => bom.getVersion().includes(version));
    }

    // 활성 상태 필터
    if (isActive !== undefined) {
      boms = boms.filter(bom => bom.getIsActive() === isActive);
    }

    // 날짜 범위 필터
    if (fromDate) {
      boms = boms.filter(bom => bom.getDtUpdate() >= fromDate);
    }
    if (toDate) {
      boms = boms.filter(bom => bom.getDtUpdate() <= toDate);
    }

    return boms.sort((a, b) => b.getDtUpdate().getTime() - a.getDtUpdate().getTime());
  }

  /**
   * BOM 삭제 (논리적 삭제)
   */
  async delete(bomId: BOMId): Promise<void> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const bomIndex = MockBOMData.getBOMs().findIndex(b => b.getId().equals(bomId));
    
    if (bomIndex === -1) {
      throw new Error('삭제할 BOM을 찾을 수 없습니다.');
    }

    // 논리적 삭제 (실제로는 비활성화)
    const existingBOM = MockBOMData.getBOMs()[bomIndex];
    const deactivatedBOM = new BOM(
      existingBOM.getId(),
      existingBOM.getProductId(),
      existingBOM.getVersion(),
      false, // 비활성화
      existingBOM.getBOMItems(),
      existingBOM.getEffectiveDate(),
      existingBOM.getIdCreate(),
      existingBOM.getIdUpdated(),
      existingBOM.getDtCreate(),
      new Date(),
      existingBOM.getExpiryDate(),
      existingBOM.getDescription()
    );

    MockBOMData.updateBOM(bomIndex, deactivatedBOM);
  }

  /**
   * BOM 존재 여부 확인
   */
  async exists(bomId: BOMId): Promise<boolean> {
    await this.simulateDelay(150);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMs().some(bom => bom.getId().equals(bomId));
  }

  /**
   * 제품의 BOM 존재 여부 확인
   */
  async existsByProductId(productId: ProductId): Promise<boolean> {
    await this.simulateDelay(150);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMs().some(bom => bom.getProductId().equals(productId));
  }

  /**
   * 전체 BOM 개수 조회
   */
  async count(): Promise<number> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../services/MockBOMData');
    return MockBOMData.getBOMs().length;
  }

  /**
   * 조건별 BOM 개수 조회
   */
  async countWithCriteria(
    productId?: ProductId,
    isActive?: boolean,
    fromDate?: Date,
    toDate?: Date
  ): Promise<number> {
    const boms = await this.findWithCriteria(productId, undefined, isActive, fromDate, toDate);
    return boms.length;
  }

  /**
   * 최신 버전 번호 조회
   */
  async getLatestVersionByProductId(productId: ProductId): Promise<string | null> {
    await this.simulateDelay(200);

    const boms = await this.findByProductId(productId);
    
    if (boms.length === 0) {
      return null;
    }

    // 버전을 숫자로 변환하여 정렬 (예: "1.0", "1.1", "2.0")
    const sortedVersions = boms
      .map(bom => bom.getVersion())
      .sort((a, b) => {
        const aVersion = parseFloat(a);
        const bVersion = parseFloat(b);
        return bVersion - aVersion;
      });

    return sortedVersions[0];
  }

  /**
   * 활성 BOM 목록 조회
   */
  async findActiveBOMs(): Promise<BOM[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMs()
      .filter(bom => bom.isCurrentlyActive())
      .sort((a, b) => b.getDtUpdate().getTime() - a.getDtUpdate().getTime());
  }

  /**
   * BOM 일괄 삭제
   */
  async deleteByProductId(productId: ProductId): Promise<number> {
    await this.simulateDelay(500);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const bomsToDelete = MockBOMData.getBOMs()
      .filter(bom => bom.getProductId().equals(productId));

    let deletedCount = 0;
    
    for (const bom of bomsToDelete) {
      try {
        await this.delete(bom.getId());
        deletedCount++;
      } catch (error) {
        console.warn(`BOM ${bom.getId().getValue()} 삭제 실패:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * ID 목록으로 BOM 일괄 조회
   */
  async findByIds(ids: BOMId[]): Promise<BOM[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMs().filter(bom => 
      ids.some(id => bom.getId().equals(id))
    );
  }

  /**
   * 여러 제품의 활성 BOM 일괄 조회
   */
  async findActiveByProductIds(productIds: ProductId[]): Promise<Map<string, BOM>> {
    await this.simulateDelay(400);

    const result = new Map<string, BOM>();
    
    for (const productId of productIds) {
      const activeBOM = await this.findActiveByProductId(productId);
      if (activeBOM) {
        result.set(productId.getValue(), activeBOM);
      }
    }
    
    return result;
  }

  /**
   * 페이징 및 검색 조건으로 BOM 조회
   */
  async findByPageWithCriteria(
    criteria: any,
    page: number,
    pageSize: number
  ): Promise<BOM[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    let boms = MockBOMData.getBOMs();

    // 기본 필터링 적용
    if (criteria?.productId) {
      boms = boms.filter(bom => bom.getProductId().equals(criteria.productId));
    }
    if (criteria?.isActive !== undefined) {
      boms = boms.filter(bom => bom.getIsActive() === criteria.isActive);
    }

    // 정렬 적용
    boms = this.applySorting(boms, 'dt_update', 'DESC');

    // 페이징 적용
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return boms.slice(startIndex, endIndex);
  }

  /**
   * 검색 조건별 BOM 개수 조회
   */
  async countByCriteria(criteria?: any): Promise<number> {
    const boms = await this.findWithCriteria(
      criteria?.productId,
      criteria?.version,
      criteria?.isActive,
      criteria?.fromDate,
      criteria?.toDate
    );
    return boms.length;
  }

  /**
   * 상태 기반 BOM 검색
   */
  async findByStatus(statusFilter: any): Promise<BOM[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    let boms = MockBOMData.getBOMs();

    if (statusFilter.isActive !== undefined) {
      boms = boms.filter(bom => bom.getIsActive() === statusFilter.isActive);
    }

    if (statusFilter.isCurrentlyActive !== undefined) {
      boms = boms.filter(bom => bom.isCurrentlyActive() === statusFilter.isCurrentlyActive);
    }

    if (statusFilter.hasItems !== undefined) {
      boms = boms.filter(bom => (bom.getBOMItems().length > 0) === statusFilter.hasItems);
    }

    return boms.sort((a, b) => b.getDtUpdate().getTime() - a.getDtUpdate().getTime());
  }

  /**
   * 버전 패턴으로 BOM 검색
   */
  async findByVersionPattern(pattern: string): Promise<BOM[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../services/MockBOMData');
    const regex = new RegExp(pattern.replace('*', '.*'));

    return MockBOMData.getBOMs()
      .filter(bom => regex.test(bom.getVersion()))
      .sort((a, b) => b.getDtUpdate().getTime() - a.getDtUpdate().getTime());
  }

  /**
   * 특정 제품의 다음 버전 번호 생성
   */
  async generateNextVersion(productId: ProductId, baseVersion?: string): Promise<string> {
    const latestVersion = await this.getLatestVersionByProductId(productId);
    
    if (!latestVersion) {
      return '1.0';
    }

    const version = parseFloat(latestVersion);
    return (version + 0.1).toFixed(1);
  }

  /**
   * 유효기간 내 활성 BOM 조회
   */
  async findActiveBOMsWithinDateRange(startDate: Date, endDate: Date): Promise<BOM[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMs()
      .filter(bom => 
        bom.isCurrentlyActive() &&
        bom.getEffectiveDate() <= endDate &&
        (!bom.getExpiryDate() || bom.getExpiryDate()! >= startDate)
      )
      .sort((a, b) => b.getDtUpdate().getTime() - a.getDtUpdate().getTime());
  }

  /**
   * 특정 날짜에 유효했던 BOM 조회
   */
  async findBOMValidAtDate(productId: ProductId, targetDate: Date): Promise<BOM | null> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const validBOM = MockBOMData.getBOMs()
      .find(bom => 
        bom.getProductId().equals(productId) &&
        bom.getEffectiveDate() <= targetDate &&
        (!bom.getExpiryDate() || bom.getExpiryDate()! >= targetDate)
      );

    return validBOM || null;
  }

  /**
   * 제품별 BOM 개수 통계
   */
  async getBOMCountByProduct(): Promise<Map<string, number>> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    const countMap = new Map<string, number>();

    MockBOMData.getBOMs().forEach(bom => {
      const productId = bom.getProductId().getValue();
      countMap.set(productId, (countMap.get(productId) || 0) + 1);
    });

    return countMap;
  }

  /**
   * 총 비용 순으로 BOM 정렬 조회
   */
  async findBOMsOrderedByCost(limit?: number, ascending: boolean = false): Promise<BOM[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    let boms = MockBOMData.getBOMs()
      .map(bom => ({
        bom,
        totalCost: bom.getBOMItems().reduce((sum, item) => 
          sum + (item.getQuantity() * item.getUnitCost()), 0
        )
      }))
      .sort((a, b) => ascending ? a.totalCost - b.totalCost : b.totalCost - a.totalCost)
      .map(item => item.bom);

    if (limit) {
      boms = boms.slice(0, limit);
    }

    return boms;
  }

  /**
   * 복잡도가 높은 BOM 조회
   */
  async findComplexBOMs(minItemCount: number): Promise<BOM[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMs()
      .filter(bom => bom.getBOMItems().length >= minItemCount)
      .sort((a, b) => b.getBOMItems().length - a.getBOMItems().length);
  }

  // === Private 유틸리티 메서드들 ===

  /**
   * 정렬 적용
   */
  private applySorting(boms: BOM[], sortBy: string, sortOrder: 'ASC' | 'DESC'): BOM[] {
    return [...boms].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'version':
          aValue = a.getVersion();
          bValue = b.getVersion();
          break;
        case 'dt_create':
          aValue = a.getDtCreate().getTime();
          bValue = b.getDtCreate().getTime();
          break;
        case 'dt_update':
        default:
          aValue = a.getDtUpdate().getTime();
          bValue = b.getDtUpdate().getTime();
          break;
      }

      if (sortOrder === 'ASC') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }
}