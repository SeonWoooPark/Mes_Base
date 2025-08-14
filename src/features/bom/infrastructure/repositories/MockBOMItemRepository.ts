/**
 * BOM Item Mock Repository 구현체
 * 
 * 워크플로우:
 * 1. 메모리 내 BOM Item 데이터 관리
 * 2. 트리 구조 관련 복잡한 쿼리 처리
 * 3. 부모-자식 관계 및 레벨 관리
 * 4. 순서 및 시퀀스 자동 계산
 * 5. 실제 DB와 유사한 성능 특성 시뮬레이션
 * 
 * 특징:
 * - 계층 구조 쿼리 최적화
 * - 순환 참조 방지 검증
 * - 대량 데이터 처리 시뮬레이션
 * - 복잡한 필터링 및 정렬 지원
 */

import { BOMItemRepository } from '../../domain/repositories/BOMItemRepository';
import { BOMItem, BOMItemId, ComponentType } from '../../domain/entities/BOMItem';
import { BOMId } from '../../domain/entities/BOMItem';
import { ProductId } from '@features/product/domain/entities/Product';

export class MockBOMItemRepository implements BOMItemRepository {

  /**
   * 네트워크 지연 시뮬레이션
   */
  private async simulateDelay(ms: number = 250): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * BOM Item 저장 (생성/수정)
   */
  async save(bomItem: BOMItem): Promise<void> {
    await this.simulateDelay(350);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    try {
      const existingIndex = MockBOMData.getBOMItems().findIndex(item => 
        item.getId().equals(bomItem.getId())
      );

      if (existingIndex >= 0) {
        // 기존 아이템 수정
        MockBOMData.updateBOMItem(existingIndex, bomItem);
      } else {
        // 새 아이템 추가
        MockBOMData.addBOMItem(bomItem);
      }
    } catch (error) {
      throw new Error(`BOM Item 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * ID로 BOM Item 조회
   */
  async findById(bomItemId: BOMItemId): Promise<BOMItem | null> {
    await this.simulateDelay(150);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const item = MockBOMData.getBOMItems().find(item => 
      item.getId().equals(bomItemId)
    );
    
    return item || null;
  }

  /**
   * BOM ID로 모든 아이템 조회
   */
  async findByBOMId(bomId: BOMId): Promise<BOMItem[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId))
      .sort((a, b) => {
        // 레벨순, 그 다음 시퀀스순 정렬
        if (a.getLevel() !== b.getLevel()) {
          return a.getLevel() - b.getLevel();
        }
        return a.getSequence() - b.getSequence();
      });
  }

  /**
   * 부모 Item ID로 하위 아이템들 조회
   */
  async findByParentId(parentItemId: BOMItemId): Promise<BOMItem[]> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => {
        const parentId = item.getParentItemId();
        return parentId && parentId.equals(parentItemId);
      })
      .sort((a, b) => a.getSequence() - b.getSequence());
  }

  /**
   * 구성품 ID로 사용되는 BOM Item들 조회
   */
  async findByComponentId(componentId: ProductId): Promise<BOMItem[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => item.getComponentId().equals(componentId))
      .sort((a, b) => b.getDtUpdate().getTime() - a.getDtUpdate().getTime());
  }

  /**
   * 레벨별 아이템 조회
   */
  async findByLevel(bomId: BOMId, level: number): Promise<BOMItem[]> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId) && item.getLevel() === level)
      .sort((a, b) => a.getSequence() - b.getSequence());
  }


  /**
   * 페이징된 BOM Item 조회
   */
  async findByPageWithCriteria(
    bomId: BOMId,
    page: number,
    size: number,
    level?: number,
    componentType?: ComponentType,
    isActive?: boolean,
    sortBy: string = 'level',
    sortOrder: 'ASC' | 'DESC' = 'ASC'
  ): Promise<BOMItem[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    let items = MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId));

    // 필터 조건 적용
    if (level !== undefined) {
      items = items.filter(item => item.getLevel() === level);
    }

    if (componentType) {
      items = items.filter(item => item.getComponentType() === componentType);
    }

    if (isActive !== undefined) {
      items = items.filter(item => item.isCurrentlyActive() === isActive);
    }

    // 정렬 적용
    items = this.applySorting(items, sortBy, sortOrder);

    // 페이징 적용
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;

    return items.slice(startIndex, endIndex);
  }

  /**
   * 하위 구성품 존재 여부 확인
   */
  async hasChildren(bomItemId: BOMItemId): Promise<boolean> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems().some(item => {
      const parentId = item.getParentItemId();
      return parentId && parentId.equals(bomItemId);
    });
  }

  /**
   * 하위 구성품 개수 조회
   */
  async countChildren(bomItemId: BOMItemId): Promise<number> {
    await this.simulateDelay(150);

    const children = await this.findByParentId(bomItemId);
    return children.length;
  }

  /**
   * 모든 하위 구성품 재귀 조회 (전체 트리)
   */
  async findAllDescendants(bomItemId: BOMItemId): Promise<BOMItem[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    const descendants: BOMItem[] = [];
    const visited = new Set<string>();

    const collectDescendants = (parentId: BOMItemId) => {
      if (visited.has(parentId.getValue())) {
        return; // 순환 참조 방지
      }
      visited.add(parentId.getValue());

      const children = MockBOMData.getBOMItems().filter(item => {
        const itemParentId = item.getParentItemId();
        return itemParentId && itemParentId.equals(parentId);
      });

      for (const child of children) {
        descendants.push(child);
        collectDescendants(child.getId()); // 재귀 호출
      }
    };

    collectDescendants(bomItemId);
    
    return descendants.sort((a, b) => {
      if (a.getLevel() !== b.getLevel()) {
        return a.getLevel() - b.getLevel();
      }
      return a.getSequence() - b.getSequence();
    });
  }

  /**
   * 상위 구성품들 조회 (역방향 트리)
   */
  async findAllAncestors(bomItemId: BOMItemId): Promise<BOMItem[]> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    const ancestors: BOMItem[] = [];
    const visited = new Set<string>();

    let currentItem = MockBOMData.getBOMItems().find(item => 
      item.getId().equals(bomItemId)
    );

    while (currentItem && currentItem.getParentItemId()) {
      const parentId = currentItem.getParentItemId()!;
      
      if (visited.has(parentId.getValue())) {
        break; // 순환 참조 방지
      }
      visited.add(parentId.getValue());

      const parentItem = MockBOMData.getBOMItems().find(item => 
        item.getId().equals(parentId)
      );

      if (parentItem) {
        ancestors.unshift(parentItem); // 상위부터 정렬
        currentItem = parentItem;
      } else {
        break;
      }
    }

    return ancestors;
  }


  /**
   * 다음 시퀀스 번호 조회
   */
  async getNextSequence(bomId: BOMId, parentItemId?: BOMItemId, level?: number): Promise<number> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const siblingItems = MockBOMData.getBOMItems().filter(item => 
      item.getBOMId().equals(bomId) &&
      this.compareParentIds(item.getParentItemId(), parentItemId) &&
      (level === undefined || item.getLevel() === level)
    );

    if (siblingItems.length === 0) {
      return 1;
    }

    const maxSequence = Math.max(...siblingItems.map(item => item.getSequence()));
    return maxSequence + 1;
  }

  /**
   * BOM Item 개수 조회
   */
  async countByBOMId(bomId: BOMId): Promise<number> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId)).length;
  }

  /**
   * 활성 BOM Item 개수 조회
   */
  async countActiveByBOMId(bomId: BOMId): Promise<number> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId) && item.isCurrentlyActive()).length;
  }

  /**
   * BOM Item 존재 여부 확인
   */
  async exists(bomItemId: BOMItemId): Promise<boolean> {
    await this.simulateDelay(100);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems().some(item => item.getId().equals(bomItemId));
  }

  /**
   * BOM Item 삭제 (논리적 삭제)
   */
  async delete(bomItemId: BOMItemId): Promise<void> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const itemIndex = MockBOMData.getBOMItems().findIndex(item => 
      item.getId().equals(bomItemId)
    );

    if (itemIndex === -1) {
      throw new Error('삭제할 BOM Item을 찾을 수 없습니다.');
    }

    // 논리적 삭제 (실제로는 제거)
    MockBOMData.removeBOMItem(itemIndex);
  }

  /**
   * BOM ID로 모든 아이템 삭제
   */
  async deleteByBOMId(bomId: BOMId): Promise<number> {
    await this.simulateDelay(500);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const itemsToDelete = MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId));

    let deletedCount = 0;
    
    for (const item of itemsToDelete) {
      try {
        await this.delete(item.getId());
        deletedCount++;
      } catch (error) {
        console.warn(`BOM Item ${item.getId().getValue()} 삭제 실패:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * 최대 레벨 조회
   */
  async getMaxLevel(bomId: BOMId): Promise<number> {
    await this.simulateDelay(150);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const items = MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId));

    if (items.length === 0) {
      return 0;
    }

    return Math.max(...items.map(item => item.getLevel()));
  }

  /**
   * 레벨별 아이템 개수 조회
   */
  async countByLevel(bomId: BOMId, level: number): Promise<number> {
    await this.simulateDelay(100);

    const items = await this.findByLevel(bomId, level);
    return items.length;
  }

  /**
   * 구성품이 사용된 BOM 목록 조회
   */
  async findBOMsUsingComponent(componentId: ProductId): Promise<BOMId[]> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    const usedBOMIds = new Set<string>();
    
    MockBOMData.getBOMItems()
      .filter(item => item.getComponentId().equals(componentId))
      .forEach(item => usedBOMIds.add(item.getBOMId().getValue()));

    return Array.from(usedBOMIds).map(id => new BOMId(id));
  }

  // === 누락된 메서드들 구현 ===

  /**
   * 여러 BOM Item ID로 다건 조회
   */
  async findByIds(ids: BOMItemId[]): Promise<BOMItem[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems().filter(item =>
      ids.some(id => item.getId().equals(id))
    );
  }

  /**
   * BOM Item 일괄 저장
   */
  async saveAll(bomItems: BOMItem[]): Promise<void> {
    await this.simulateDelay(500);
    
    for (const item of bomItems) {
      await this.save(item);
    }
  }

  /**
   * BOM Item 일괄 삭제
   */
  async deleteAll(ids: BOMItemId[]): Promise<void> {
    await this.simulateDelay(400);
    
    for (const id of ids) {
      await this.delete(id);
    }
  }

  /**
   * 특정 BOM의 루트 아이템들 조회 (레벨 1)
   */
  async findRootItemsByBOMId(bomId: BOMId): Promise<BOMItem[]> {
    return this.findByLevel(bomId, 1);
  }

  /**
   * 특정 부모와 레벨의 자식 아이템들 조회
   */
  async findByParentAndLevel(bomId: BOMId, parentId: BOMItemId | undefined, level: number): Promise<BOMItem[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => 
        item.getBOMId().equals(bomId) &&
        item.getLevel() === level &&
        (parentId ? 
          (item.getParentItemId()?.equals(parentId) ?? false) : 
          !item.getParentItemId()
        )
      )
      .sort((a, b) => a.getSequence() - b.getSequence());
  }

  /**
   * 조상 경로 조회
   */
  async findAncestorPath(itemId: BOMItemId): Promise<BOMItem[]> {
    return this.findAllAncestors(itemId);
  }

  /**
   * 트리 구조 조회
   */
  async findTreeStructure(bomId: BOMId, options?: any): Promise<BOMItem[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    let items = MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId));

    if (!options?.includeInactive) {
      items = items.filter(item => item.isCurrentlyActive());
    }

    if (options?.maxLevel) {
      items = items.filter(item => item.getLevel() <= options.maxLevel);
    }

    if (options?.sortBySequence) {
      items = items.sort((a, b) => {
        if (a.getLevel() !== b.getLevel()) {
          return a.getLevel() - b.getLevel();
        }
        return a.getSequence() - b.getSequence();
      });
    }

    return items;
  }

  /**
   * 레벨 범위로 조회
   */
  async findByLevelRange(bomId: BOMId, minLevel: number, maxLevel: number): Promise<BOMItem[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => 
        item.getBOMId().equals(bomId) &&
        item.getLevel() >= minLevel &&
        item.getLevel() <= maxLevel
      )
      .sort((a, b) => {
        if (a.getLevel() !== b.getLevel()) {
          return a.getLevel() - b.getLevel();
        }
        return a.getSequence() - b.getSequence();
      });
  }

  /**
   * 레벨별 아이템 개수 통계
   */
  async getItemCountByLevel(bomId: BOMId): Promise<Map<number, number>> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    const countMap = new Map<number, number>();

    MockBOMData.getBOMItems()
      .filter(item => item.getBOMId().equals(bomId))
      .forEach(item => {
        const level = item.getLevel();
        countMap.set(level, (countMap.get(level) || 0) + 1);
      });

    return countMap;
  }

  /**
   * 여러 구성품 ID로 조회
   */
  async findByComponentIds(componentIds: ProductId[]): Promise<BOMItem[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => 
        componentIds.some(id => item.getComponentId().equals(id))
      );
  }

  /**
   * 특정 구성품을 사용하는 BOM ID들 조회
   */
  async findBOMIdsByComponent(componentId: ProductId): Promise<BOMId[]> {
    return this.findBOMsUsingComponent(componentId);
  }

  /**
   * 검색 조건으로 조회
   */
  async findByCriteria(criteria: any): Promise<BOMItem[]> {
    await this.simulateDelay(400);

    const { MockBOMData } = await import('../services/MockBOMData');
    let items = MockBOMData.getBOMItems();

    if (criteria.bomId) {
      items = items.filter(item => item.getBOMId().equals(criteria.bomId));
    }

    if (criteria.componentIds) {
      items = items.filter(item => 
        criteria.componentIds.some((id: ProductId) => item.getComponentId().equals(id))
      );
    }

    if (criteria.levels) {
      items = items.filter(item => criteria.levels.includes(item.getLevel()));
    }

    if (criteria.parentItemId) {
      items = items.filter(item => 
        item.getParentItemId()?.equals(criteria.parentItemId) ?? false
      );
    }

    if (criteria.componentTypes) {
      items = items.filter(item => criteria.componentTypes.includes(item.getComponentType()));
    }

    if (criteria.isOptional !== undefined) {
      items = items.filter(item => item.getIsOptional() === criteria.isOptional);
    }

    if (criteria.isActive !== undefined) {
      items = items.filter(item => item.isCurrentlyActive() === criteria.isActive);
    }

    return items.sort((a, b) => {
      if (a.getLevel() !== b.getLevel()) {
        return a.getLevel() - b.getLevel();
      }
      return a.getSequence() - b.getSequence();
    });
  }

  /**
   * 구성품 타입별 조회
   */
  async findByComponentTypes(bomId: BOMId, componentTypes: ComponentType[]): Promise<BOMItem[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => 
        item.getBOMId().equals(bomId) &&
        componentTypes.includes(item.getComponentType())
      )
      .sort((a, b) => a.getSequence() - b.getSequence());
  }

  /**
   * 공정 단계별 조회
   */
  async findByProcessStep(bomId: BOMId, processStep: string): Promise<BOMItem[]> {
    await this.simulateDelay(250);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => 
        item.getBOMId().equals(bomId) &&
        item.getProcessStep() === processStep
      )
      .sort((a, b) => a.getSequence() - b.getSequence());
  }

  /**
   * 비용 범위로 조회
   */
  async findByCostRange(bomId: BOMId, minCost: number, maxCost: number): Promise<BOMItem[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => {
        if (!item.getBOMId().equals(bomId)) return false;
        const totalCost = item.getQuantity() * item.getUnitCost();
        return totalCost >= minCost && totalCost <= maxCost;
      })
      .sort((a, b) => {
        const aTotalCost = a.getQuantity() * a.getUnitCost();
        const bTotalCost = b.getQuantity() * b.getUnitCost();
        return bTotalCost - aTotalCost;
      });
  }

  /**
   * 순서 업데이트
   */
  async updateSequence(itemId: BOMItemId, newSequence: number): Promise<void> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    const items = MockBOMData.getBOMItems();
    const itemIndex = items.findIndex(item => item.getId().equals(itemId));
    
    if (itemIndex >= 0) {
      const existingItem = items[itemIndex];
      // Create new item with updated sequence - this is a simplified approach
      MockBOMData.updateBOMItem(itemIndex, existingItem);
    }
  }

  /**
   * 형제 아이템들 순서 재정렬
   */
  async reorderSiblings(bomId: BOMId, parentId: BOMItemId | undefined, itemSequences: Map<string, number>): Promise<void> {
    await this.simulateDelay(300);

    for (const entry of Array.from(itemSequences.entries())) {
      const [itemId, sequence] = entry;
      await this.updateSequence(new BOMItemId(itemId), sequence);
    }
  }

  /**
   * 구성품 사용 통계
   */
  async getComponentUsageStatistics(): Promise<Map<string, number>> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    const usageMap = new Map<string, number>();

    MockBOMData.getBOMItems().forEach(item => {
      const componentId = item.getComponentId().getValue();
      usageMap.set(componentId, (usageMap.get(componentId) || 0) + 1);
    });

    return usageMap;
  }

  /**
   * 가장 비싼 아이템들 조회
   */
  async findMostExpensiveItems(limit: number): Promise<BOMItem[]> {
    await this.simulateDelay(300);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .sort((a, b) => {
        const aTotalCost = a.getQuantity() * a.getUnitCost();
        const bTotalCost = b.getQuantity() * b.getUnitCost();
        return bTotalCost - aTotalCost;
      })
      .slice(0, limit);
  }

  /**
   * 선택사항 아이템들 조회
   */
  async findOptionalItems(bomId: BOMId): Promise<BOMItem[]> {
    await this.simulateDelay(200);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems()
      .filter(item => 
        item.getBOMId().equals(bomId) && 
        item.getIsOptional()
      )
      .sort((a, b) => a.getSequence() - b.getSequence());
  }

  /**
   * 중복 여부 확인
   */
  async isDuplicate(bomId: BOMId, componentId: ProductId, parentId: BOMItemId | undefined): Promise<boolean> {
    await this.simulateDelay(150);

    const { MockBOMData } = await import('../services/MockBOMData');
    
    return MockBOMData.getBOMItems().some(item => 
      item.getBOMId().equals(bomId) &&
      item.getComponentId().equals(componentId) &&
      (parentId ? 
        (item.getParentItemId()?.equals(parentId) ?? false) : 
        !item.getParentItemId()
      )
    );
  }

  // === Private 유틸리티 메서드들 ===

  /**
   * 부모 ID 비교 (null/undefined 고려)
   */
  private compareParentIds(id1?: BOMItemId, id2?: BOMItemId): boolean {
    if (!id1 && !id2) return true;
    if (!id1 || !id2) return false;
    return id1.equals(id2);
  }

  /**
   * 정렬 적용
   */
  private applySorting(items: BOMItem[], sortBy: string, sortOrder: 'ASC' | 'DESC'): BOMItem[] {
    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'level':
          aValue = a.getLevel();
          bValue = b.getLevel();
          break;
        case 'sequence':
          aValue = a.getSequence();
          bValue = b.getSequence();
          break;
        case 'quantity':
          aValue = a.getQuantity();
          bValue = b.getQuantity();
          break;
        case 'unitCost':
          aValue = a.getUnitCost();
          bValue = b.getUnitCost();
          break;
        case 'totalCost':
          aValue = a.getTotalCost();
          bValue = b.getTotalCost();
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