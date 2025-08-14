import { BOM } from '../../../domain/entities/BOM';
import { BOMItem, BOMItemId, BOMId, ComponentType } from '../../../domain/entities/BOMItem';
import { ProductId, Unit } from '../../../domain/entities/Product';
import { mockBOMData, mockDates, mockUserData } from '../../../__mocks__/mockData';

describe('BOMId Value Object', () => {
  it('유효한 ID로 BOMId를 생성할 수 있다', () => {
    const validId = 'valid-bom-id';
    const bomId = new BOMId(validId);
    
    expect(bomId.getValue()).toBe(validId);
  });

  it('빈 문자열로 BOMId 생성 시 에러가 발생한다', () => {
    expect(() => new BOMId('')).toThrow('BOM ID는 필수입니다.');
  });

  it('같은 값을 가진 BOMId는 동등하다', () => {
    const id1 = new BOMId('same-id');
    const id2 = new BOMId('same-id');
    
    expect(id1.equals(id2)).toBe(true);
  });
});

describe('BOM Entity', () => {
  const createValidBOM = (overrides: Partial<any> = {}) => {
    const defaultData = {
      id: mockBOMData.bom.id,
      productId: mockBOMData.bom.productId,
      version: mockBOMData.bom.version,
      isActive: mockBOMData.bom.isActive,
      effectiveDate: mockBOMData.bom.effectiveDate,
      description: mockBOMData.bom.description,
      ...overrides
    };
    
    return new BOM(
      new BOMId(defaultData.id),
      new ProductId(defaultData.productId),
      defaultData.version,
      defaultData.isActive,
      [], // 초기에는 bomItems 빈 배열
      defaultData.effectiveDate,
      mockUserData.currentUser.id,
      mockUserData.currentUser.id,
      mockDates.current,
      mockDates.current,
      defaultData.expirationDate,
      defaultData.description
    );
  };

  const createSampleBOMItem = (id: string, componentId: string = 'component-1', quantity: number = 10, unitCost: number = 1000, scrapRate: number = 0) => {
    return new BOMItem(
      new BOMItemId(id),
      new BOMId(mockBOMData.bom.id),
      new ProductId(componentId),
      undefined, // parentItemId
      1, // level
      1, // sequence
      quantity,
      new Unit('EA', '개'),
      unitCost,
      scrapRate,
      false, // isOptional
      ComponentType.RAW_MATERIAL,
      mockDates.current, // effectiveDate
      undefined, // position
      undefined, // processStep
      undefined, // remarks
      mockUserData.currentUser.id,
      mockUserData.currentUser.id,
      mockDates.current,
      mockDates.current
    );
  };

  describe('생성', () => {
    it('유효한 데이터로 BOM을 생성할 수 있다', () => {
      const bom = createValidBOM();
      
      expect(bom.getId().getValue()).toBe(mockBOMData.bom.id);
      expect(bom.getProductId().getValue()).toBe(mockBOMData.bom.productId);
      expect(bom.getVersion()).toBe(mockBOMData.bom.version);
      expect(bom.getIsActive()).toBe(mockBOMData.bom.isActive);
      expect(bom.getDescription()).toBe(mockBOMData.bom.description);
      expect(bom.getEffectiveDate()).toEqual(mockBOMData.bom.effectiveDate);
    });

    it('빈 버전으로 생성 시 에러가 발생한다', () => {
      expect(() => {
        createValidBOM({ version: '' });
      }).toThrow('BOM 버전은 필수입니다.');
    });

    it('과거 날짜로 유효 시작일을 설정하면 에러가 발생한다', () => {
      const pastDate = new Date('2020-01-01');
      expect(() => {
        createValidBOM({ effectiveDate: pastDate });
      }).toThrow('유효 시작일은 현재 날짜 이후여야 합니다.');
    });

    it('유효 시작일보다 이른 만료일을 설정하면 에러가 발생한다', () => {
      const effectiveDate = new Date('2025-01-01');
      const expirationDate = new Date('2024-12-31'); // 유효 시작일보다 이른 날짜
      
      expect(() => {
        createValidBOM({ 
          effectiveDate, 
          expirationDate 
        });
      }).toThrow('만료일은 유효 시작일 이후여야 합니다.');
    });
  });

  describe('BOM 아이템 관리', () => {
    it('BOM 아이템을 추가할 수 있다', () => {
      const bom = createValidBOM();
      const bomItem = createSampleBOMItem('item-1', 'component-1');
      
      bom.addBOMItem(bomItem);
      
      expect(bom.getBOMItems()).toHaveLength(1);
      expect(bom.getBOMItems()[0]).toBe(bomItem);
    });

    it('중복된 구성품을 추가하려고 하면 에러가 발생한다', () => {
      const bom = createValidBOM();
      const bomItem1 = createSampleBOMItem('item-1', 'component-1');
      const bomItem2 = createSampleBOMItem('item-2', 'component-1'); // 같은 구성품 ID
      
      bom.addBOMItem(bomItem1);
      
      expect(() => {
        bom.addBOMItem(bomItem2);
      }).toThrow('동일한 구성품이 이미 존재합니다.');
    });
  });

  describe('상태 관리', () => {
    it('현재 활성 상태인지 확인할 수 있다', () => {
      const activeBOM = createValidBOM({
        isActive: true,
        effectiveDate: new Date('2024-01-01') // 과거 날짜로 이미 유효
      });
      
      const inactiveBOM = createValidBOM({
        isActive: false
      });
      
      expect(activeBOM.isCurrentlyActive()).toBe(true);
      expect(inactiveBOM.isCurrentlyActive()).toBe(false);
    });

    it('만료된 BOM은 활성 상태가 아니다', () => {
      const expiredBOM = createValidBOM({
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        expirationDate: new Date('2024-06-01') // 이미 만료됨
      });
      
      expect(expiredBOM.isCurrentlyActive()).toBe(false);
    });
  });

  describe('순환 참조 검증', () => {
    it('순환 참조가 없는 경우 정상적으로 검증한다', () => {
      const bom = createValidBOM();
      const bomItem = createSampleBOMItem('item-1', 'different-component');
      
      bom.addBOMItem(bomItem);
      
      expect(bom.hasCircularReference()).toBe(false);
    });

    it('자기 자신을 참조하는 경우 순환 참조로 검출한다', () => {
      const bom = createValidBOM();
      const selfReferencingItem = createSampleBOMItem('item-1', mockBOMData.bom.productId); // 자기 자신 참조
      
      bom.addBOMItem(selfReferencingItem);
      
      expect(bom.hasCircularReference()).toBe(true);
    });
  });

  describe('동등성', () => {
    it('같은 ID를 가진 BOM은 동등하다', () => {
      const bom1 = createValidBOM();
      const bom2 = createValidBOM();
      
      expect(bom1.equals(bom2)).toBe(true);
    });

    it('다른 ID를 가진 BOM은 동등하지 않다', () => {
      const bom1 = createValidBOM();
      const bom2 = createValidBOM({ id: 'different-id' });
      
      expect(bom1.equals(bom2)).toBe(false);
    });
  });
});