import { BOMItem, BOMItemId, ComponentType } from '../../../domain/entities/BOMItem';
import { BOMId } from '../../../domain/entities/BOM';
import { ProductId } from '../../../domain/entities/Product';
import { Unit } from '../../../domain/entities/Product';
import { mockBOMData, mockDates, mockUserData } from '../../../__mocks__/mockData';

describe('BOMItemId Value Object', () => {
  it('유효한 ID로 BOMItemId를 생성할 수 있다', () => {
    const validId = 'valid-bom-item-id';
    const bomItemId = new BOMItemId(validId);
    
    expect(bomItemId.getValue()).toBe(validId);
  });

  it('빈 문자열로 BOMItemId 생성 시 에러가 발생한다', () => {
    expect(() => new BOMItemId('')).toThrow('BOM Item ID는 필수입니다.');
  });

  it('같은 값을 가진 BOMItemId는 동등하다', () => {
    const id1 = new BOMItemId('same-id');
    const id2 = new BOMItemId('same-id');
    
    expect(id1.equals(id2)).toBe(true);
  });
});

describe('BOMItem Entity', () => {
  const createValidBOMItem = (overrides?: Partial<typeof mockBOMData.bomItem>) => {
    const data = { ...mockBOMData.bomItem, ...overrides };
    
    return new BOMItem(
      new BOMItemId(data.id),
      new BOMId(data.bomId),
      new ProductId(data.componentId),
      data.level > 1 ? new BOMItemId('parent-item-id') : undefined,
      data.level,
      data.sequence,
      data.quantity,
      new Unit('KG', data.unitName),
      data.unitCost,
      data.scrapRate,
      data.isOptional,
      data.componentType,
      mockDates.current, // effectiveDate
      data.position,
      data.processStep,
      data.remarks,
      mockUserData.currentUser.id,
      mockUserData.currentUser.id,
      mockDates.current,
      mockDates.current
    );
  };

  describe('생성', () => {
    it('유효한 데이터로 BOMItem을 생성할 수 있다', () => {
      const bomItem = createValidBOMItem();
      
      expect(bomItem.getId().getValue()).toBe(mockBOMData.bomItem.id);
      expect(bomItem.getBOMId().getValue()).toBe(mockBOMData.bomItem.bomId);
      expect(bomItem.getComponentId().getValue()).toBe(mockBOMData.bomItem.componentId);
      expect(bomItem.getLevel()).toBe(mockBOMData.bomItem.level);
      expect(bomItem.getQuantity()).toBe(mockBOMData.bomItem.quantity);
      expect(bomItem.getUnitCost()).toBe(mockBOMData.bomItem.unitCost);
      expect(bomItem.getScrapRate()).toBe(mockBOMData.bomItem.scrapRate);
      expect(bomItem.getComponentType()).toBe(mockBOMData.bomItem.componentType);
    });

    it('음수 수량으로 생성 시 에러가 발생한다', () => {
      expect(() => {
        createValidBOMItem({ quantity: -1 });
      }).toThrow('수량은 0보다 커야 합니다.');
    });

    it('음수 단가로 생성 시 에러가 발생한다', () => {
      expect(() => {
        createValidBOMItem({ unitCost: -100 });
      }).toThrow('단가는 0 이상이어야 합니다.');
    });

    it('잘못된 스크랩률로 생성 시 에러가 발생한다', () => {
      expect(() => {
        createValidBOMItem({ scrapRate: -1 });
      }).toThrow('스크랩률은 0 이상 100 이하여야 합니다.');

      expect(() => {
        createValidBOMItem({ scrapRate: 101 });
      }).toThrow('스크랩률은 0 이상 100 이하여야 합니다.');
    });

    it('음수 레벨로 생성 시 에러가 발생한다', () => {
      expect(() => {
        createValidBOMItem({ level: -1 });
      }).toThrow('레벨은 0 이상이어야 합니다.');
    });
  });

  describe('비즈니스 로직', () => {
    it('실제 소요량을 계산할 수 있다 (스크랩률 포함)', () => {
      const bomItem = createValidBOMItem({
        quantity: 10,
        scrapRate: 20 // 20%
      });
      
      const actualQuantity = bomItem.getActualQuantity();
      expect(actualQuantity).toBe(12); // 10 * (1 + 20/100) = 12
    });

    it('스크랩률이 0일 때 실제 소요량은 기본 수량과 같다', () => {
      const bomItem = createValidBOMItem({
        quantity: 10,
        scrapRate: 0
      });
      
      expect(bomItem.getActualQuantity()).toBe(10);
    });

    it('총 비용을 계산할 수 있다', () => {
      const bomItem = createValidBOMItem({
        quantity: 10,
        unitCost: 1000,
        scrapRate: 10 // 10%
      });
      
      const totalCost = bomItem.getTotalCost();
      // 실제 수량(11) * 단가(1000) = 11000
      expect(totalCost).toBe(11000);
    });

    it('최상위 레벨인지 확인할 수 있다', () => {
      const topLevelItem = createValidBOMItem({
        level: 0
      });
      
      const subItem = createValidBOMItem({
        level: 1
      });
      
      expect(topLevelItem.isTopLevel()).toBe(true);
      expect(subItem.isTopLevel()).toBe(false);
    });

    it('하위 구성품인지 확인할 수 있다', () => {
      const topLevelItem = createValidBOMItem({
        level: 0
      });
      
      const subItem = createValidBOMItem({
        level: 1
      });
      
      expect(topLevelItem.isSubComponent()).toBe(false);
      expect(subItem.isSubComponent()).toBe(true);
    });

    it('조립품 유형인지 확인할 수 있다', () => {
      const assemblyItem = createValidBOMItem({
        componentType: ComponentType.SUB_ASSEMBLY
      });
      
      const rawMaterialItem = createValidBOMItem({
        componentType: ComponentType.RAW_MATERIAL
      });
      
      expect(assemblyItem.isAssemblyType()).toBe(true);
      expect(rawMaterialItem.isAssemblyType()).toBe(false);
    });

    it('선택적 구성품인지 확인할 수 있다', () => {
      const optionalItem = createValidBOMItem({
        isOptional: true
      });
      
      const requiredItem = createValidBOMItem({
        isOptional: false
      });
      
      expect(optionalItem.isOptional).toBe(true);
      expect(requiredItem.isOptional).toBe(false);
    });
  });

  describe('업데이트', () => {
    it('BOM 아이템 정보를 업데이트할 수 있다', () => {
      const bomItem = createValidBOMItem();
      
      const updatedItem = bomItem.updateBOMItem(
        20, // 새로운 수량
        new Unit('EA', '개'), // 새로운 단위
        2000, // 새로운 단가
        5.0, // 새로운 스크랩률
        true, // 선택적으로 변경
        'B-02-03', // 새로운 위치
        '검사', // 새로운 공정
        '업데이트된 비고',
        mockUserData.currentUser.id
      );
      
      expect(updatedItem.getQuantity()).toBe(20);
      expect(updatedItem.getUnitCost()).toBe(2000);
      expect(updatedItem.getScrapRate()).toBe(5.0);
      expect(updatedItem.isOptional).toBe(true);
      expect(updatedItem.getPosition()).toBe('B-02-03');
      expect(updatedItem.getProcessStep()).toBe('검사');
      expect(updatedItem.getRemarks()).toBe('업데이트된 비고');
    });

    it('업데이트 시 유효성 검증이 수행된다', () => {
      const bomItem = createValidBOMItem();
      
      expect(() => {
        bomItem.updateBOMItem(
          -5, // 음수 수량
          new Unit('EA', '개'),
          1000,
          2.0,
          false,
          undefined,
          undefined,
          undefined,
          mockUserData.currentUser.id
        );
      }).toThrow('수량은 0보다 커야 합니다.');
    });
  });

  describe('Component Type별 특성', () => {
    it('원자재 구성품의 특성을 확인할 수 있다', () => {
      const rawMaterialItem = createValidBOMItem({
        componentType: ComponentType.RAW_MATERIAL
      });
      
      expect(rawMaterialItem.getComponentType()).toBe(ComponentType.RAW_MATERIAL);
      expect(rawMaterialItem.isAssemblyType()).toBe(false);
    });

    it('반제품 구성품의 특성을 확인할 수 있다', () => {
      const semiFinishedItem = createValidBOMItem({
        componentType: ComponentType.SEMI_FINISHED
      });
      
      expect(semiFinishedItem.getComponentType()).toBe(ComponentType.SEMI_FINISHED);
      expect(semiFinishedItem.isAssemblyType()).toBe(false);
    });

    it('조립품 구성품의 특성을 확인할 수 있다', () => {
      const assemblyItem = createValidBOMItem({
        componentType: ComponentType.SUB_ASSEMBLY
      });
      
      expect(assemblyItem.getComponentType()).toBe(ComponentType.SUB_ASSEMBLY);
      expect(assemblyItem.isAssemblyType()).toBe(true);
    });

    it('구매품 구성품의 특성을 확인할 수 있다', () => {
      const purchasedItem = createValidBOMItem({
        componentType: ComponentType.PURCHASED_PART
      });
      
      expect(purchasedItem.getComponentType()).toBe(ComponentType.PURCHASED_PART);
      expect(purchasedItem.isAssemblyType()).toBe(false);
    });

    it('소모품 구성품의 특성을 확인할 수 있다', () => {
      const consumableItem = createValidBOMItem({
        componentType: ComponentType.CONSUMABLE
      });
      
      expect(consumableItem.getComponentType()).toBe(ComponentType.CONSUMABLE);
      expect(consumableItem.isAssemblyType()).toBe(false);
    });
  });

  describe('동등성', () => {
    it('같은 ID를 가진 BOMItem은 동등하다', () => {
      const item1 = createValidBOMItem();
      const item2 = createValidBOMItem();
      
      expect(item1.equals(item2)).toBe(true);
    });

    it('다른 ID를 가진 BOMItem은 동등하지 않다', () => {
      const item1 = createValidBOMItem();
      const item2 = createValidBOMItem({ id: 'different-id' });
      
      expect(item1.equals(item2)).toBe(false);
    });
  });

  describe('계층 구조', () => {
    it('부모 아이템 ID를 가진 하위 아이템을 생성할 수 있다', () => {
      const parentItemId = new BOMItemId('parent-item-id');
      const childItem = createValidBOMItem({ level: 2 });
      
      expect(childItem.getParentItemId()?.getValue()).toBe('parent-item-id');
      expect(childItem.getLevel()).toBe(2);
      expect(childItem.isSubComponent()).toBe(true);
    });

    it('최상위 아이템은 부모 아이템 ID가 없다', () => {
      const topLevelItem = createValidBOMItem({ level: 0 });
      
      expect(topLevelItem.getParentItemId()).toBeUndefined();
      expect(topLevelItem.isTopLevel()).toBe(true);
    });
  });
});