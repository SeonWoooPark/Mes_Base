import { Product, ProductId, ProductType, Category, Unit, AdditionalInfo } from '../../../domain/entities/Product';
import { mockProductData, invalidProductData, mockDates, mockUserData } from '../../../__mocks__/mockData';

describe('ProductId Value Object', () => {
  describe('생성', () => {
    it('유효한 ID로 ProductId를 생성할 수 있다', () => {
      const validId = 'valid-product-id';
      const productId = new ProductId(validId);
      
      expect(productId.getValue()).toBe(validId);
    });

    it('빈 문자열로 ProductId 생성 시 에러가 발생한다', () => {
      expect(() => new ProductId('')).toThrow('Product ID는 필수입니다.');
    });

    it('null 또는 undefined로 ProductId 생성 시 에러가 발생한다', () => {
      expect(() => new ProductId(null as any)).toThrow('Product ID는 필수입니다.');
      expect(() => new ProductId(undefined as any)).toThrow('Product ID는 필수입니다.');
    });
  });

  describe('동등성 비교', () => {
    it('같은 값을 가진 ProductId는 동등하다', () => {
      const id1 = new ProductId('same-id');
      const id2 = new ProductId('same-id');
      
      expect(id1.equals(id2)).toBe(true);
    });

    it('다른 값을 가진 ProductId는 동등하지 않다', () => {
      const id1 = new ProductId('id-1');
      const id2 = new ProductId('id-2');
      
      expect(id1.equals(id2)).toBe(false);
    });
  });
});

describe('Category Value Object', () => {
  it('카테고리를 생성할 수 있다', () => {
    const category = new Category('ELEC', '전자부품');
    
    expect(category.code).toBe('ELEC');
    expect(category.name).toBe('전자부품');
  });
});

describe('Unit Value Object', () => {
  it('단위를 생성할 수 있다', () => {
    const unit = new Unit('EA', '개');
    
    expect(unit.code).toBe('EA');
    expect(unit.name).toBe('개');
  });
});

describe('AdditionalInfo Value Object', () => {
  it('추가 정보를 생성할 수 있다', () => {
    const info = new AdditionalInfo('설명', '사양', '노트');
    
    expect(info.description).toBe('설명');
    expect(info.specifications).toBe('사양');
    expect(info.notes).toBe('노트');
  });

  it('선택적 정보로도 생성할 수 있다', () => {
    const info = new AdditionalInfo('설명');
    
    expect(info.description).toBe('설명');
    expect(info.specifications).toBeUndefined();
    expect(info.notes).toBeUndefined();
  });
});

describe('Product Entity', () => {
  const createValidProduct = () => {
    const { basic } = mockProductData;
    return new Product(
      new ProductId(basic.id),
      basic.cd_material,
      basic.nm_material,
      basic.type,
      new Category(basic.category.code, basic.category.name),
      new Unit(basic.unit.code, basic.unit.name),
      basic.safetyStock,
      0, // leadTime
      '', // supplier
      '', // location
      '', // memo
      basic.isActive,
      basic.additionalInfo ? new AdditionalInfo(
        basic.additionalInfo.description,
        basic.additionalInfo.specifications,
        basic.additionalInfo.notes
      ) : undefined,
      mockUserData.currentUser.id,
      mockUserData.currentUser.id,
      mockDates.current,
      mockDates.current
    );
  };

  describe('생성', () => {
    it('유효한 데이터로 Product를 생성할 수 있다', () => {
      const product = createValidProduct();
      
      expect(product.getId().getValue()).toBe(mockProductData.basic.id);
      expect(product.getCode()).toBe(mockProductData.basic.cd_material);
      expect(product.getName()).toBe(mockProductData.basic.nm_material);
      expect(product.getType()).toBe(mockProductData.basic.type);
      expect(product.getSafetyStock()).toBe(mockProductData.basic.safetyStock);
      expect(product.getIsActive()).toBe(mockProductData.basic.isActive);
    });

    it('제품명이 빈 문자열일 때 에러가 발생한다', () => {
      expect(() => {
        const { basic } = mockProductData;
        new Product(
          new ProductId(basic.id),
          basic.cd_material,
          '', // 빈 제품명
          basic.type,
          new Category(basic.category.code, basic.category.name),
          new Unit(basic.unit.code, basic.unit.name),
          basic.safetyStock,
          0, '', '', '', basic.isActive,
          undefined,
          mockUserData.currentUser.id,
          mockUserData.currentUser.id,
          mockDates.current,
          mockDates.current
        );
      }).toThrow('제품명은 필수입니다.');
    });

    it('제품 코드가 빈 문자열일 때 에러가 발생한다', () => {
      expect(() => {
        const { basic } = mockProductData;
        new Product(
          new ProductId(basic.id),
          '', // 빈 제품 코드
          basic.nm_material,
          basic.type,
          new Category(basic.category.code, basic.category.name),
          new Unit(basic.unit.code, basic.unit.name),
          basic.safetyStock,
          0, '', '', '', basic.isActive,
          undefined,
          mockUserData.currentUser.id,
          mockUserData.currentUser.id,
          mockDates.current,
          mockDates.current
        );
      }).toThrow('제품코드는 필수입니다.');
    });

    it('안전재고가 음수일 때 에러가 발생한다', () => {
      expect(() => {
        const { basic } = mockProductData;
        new Product(
          new ProductId(basic.id),
          basic.cd_material,
          basic.nm_material,
          basic.type,
          new Category(basic.category.code, basic.category.name),
          new Unit(basic.unit.code, basic.unit.name),
          -10, // 음수 안전재고
          0, '', '', '', basic.isActive,
          undefined,
          mockUserData.currentUser.id,
          mockUserData.currentUser.id,
          mockDates.current,
          mockDates.current
        );
      }).toThrow('안전재고는 0 이상이어야 합니다.');
    });
  });

  describe('비즈니스 로직', () => {
    it('완제품은 생산 가능하다', () => {
      const product = createValidProduct();
      expect(product.canBeProduced()).toBe(true);
    });

    it('원자재는 생산할 수 없다', () => {
      const { rawMaterial } = mockProductData;
      const product = new Product(
        new ProductId(rawMaterial.id),
        rawMaterial.cd_material,
        rawMaterial.nm_material,
        rawMaterial.type, // RAW_MATERIAL
        new Category(rawMaterial.category.code, rawMaterial.category.name),
        new Unit(rawMaterial.unit.code, rawMaterial.unit.name),
        rawMaterial.safetyStock,
        0, '', '', '', rawMaterial.isActive,
        undefined,
        mockUserData.currentUser.id,
        mockUserData.currentUser.id,
        mockDates.current,
        mockDates.current
      );
      
      expect(product.canBeProduced()).toBe(false);
    });

    it('원자재인지 확인할 수 있다', () => {
      const { rawMaterial } = mockProductData;
      const product = new Product(
        new ProductId(rawMaterial.id),
        rawMaterial.cd_material,
        rawMaterial.nm_material,
        rawMaterial.type,
        new Category(rawMaterial.category.code, rawMaterial.category.name),
        new Unit(rawMaterial.unit.code, rawMaterial.unit.name),
        rawMaterial.safetyStock,
        0, '', '', '', rawMaterial.isActive,
        undefined,
        mockUserData.currentUser.id,
        mockUserData.currentUser.id,
        mockDates.current,
        mockDates.current
      );
      
      expect(product.isRawMaterial()).toBe(true);
    });

    it('완제품과 반제품은 BOM을 가질 수 있다', () => {
      const finishedProduct = createValidProduct();
      expect(finishedProduct.canHaveBOM()).toBe(true);

      const { semiFinished } = mockProductData;
      const semiFinishedProduct = new Product(
        new ProductId(semiFinished.id),
        semiFinished.cd_material,
        semiFinished.nm_material,
        semiFinished.type,
        new Category(semiFinished.category.code, semiFinished.category.name),
        new Unit(semiFinished.unit.code, semiFinished.unit.name),
        semiFinished.safetyStock,
        0, '', '', '', semiFinished.isActive,
        undefined,
        mockUserData.currentUser.id,
        mockUserData.currentUser.id,
        mockDates.current,
        mockDates.current
      );
      
      expect(semiFinishedProduct.canHaveBOM()).toBe(true);
    });

    it('원자재는 BOM을 가질 수 없다', () => {
      const { rawMaterial } = mockProductData;
      const product = new Product(
        new ProductId(rawMaterial.id),
        rawMaterial.cd_material,
        rawMaterial.nm_material,
        rawMaterial.type,
        new Category(rawMaterial.category.code, rawMaterial.category.name),
        new Unit(rawMaterial.unit.code, rawMaterial.unit.name),
        rawMaterial.safetyStock,
        0, '', '', '', rawMaterial.isActive,
        undefined,
        mockUserData.currentUser.id,
        mockUserData.currentUser.id,
        mockDates.current,
        mockDates.current
      );
      
      expect(product.canHaveBOM()).toBe(false);
    });

    it('안전재고 미만인지 확인할 수 있다', () => {
      const product = createValidProduct();
      
      expect(product.isBelowSafetyStock(50)).toBe(true); // 안전재고(100) 미만
      expect(product.isBelowSafetyStock(100)).toBe(false); // 안전재고와 같음
      expect(product.isBelowSafetyStock(150)).toBe(false); // 안전재고 초과
    });
  });

  describe('업데이트', () => {
    it('제품 정보를 업데이트할 수 있다', () => {
      const product = createValidProduct();
      
      const updatedProduct = product.updateProduct(
        'NEW_CODE',
        '새로운 제품명',
        ProductType.SEMI_FINISHED,
        new Category('NEW_CAT', '새 카테고리'),
        new Unit('KG', '킬로그램'),
        200, // 새로운 안전재고
        5, // leadTime
        '새 공급업체',
        '새 위치',
        '새 메모',
        false, // 비활성화
        new AdditionalInfo('새 설명'),
        mockUserData.currentUser.id
      );
      
      expect(updatedProduct.getCode()).toBe('NEW_CODE');
      expect(updatedProduct.getName()).toBe('새로운 제품명');
      expect(updatedProduct.getType()).toBe(ProductType.SEMI_FINISHED);
      expect(updatedProduct.getSafetyStock()).toBe(200);
      expect(updatedProduct.getIsActive()).toBe(false);
    });

    it('업데이트 시 유효성 검증이 수행된다', () => {
      const product = createValidProduct();
      
      expect(() => {
        product.updateProduct(
          '', // 빈 코드
          '새로운 제품명',
          ProductType.FINISHED_PRODUCT,
          new Category('CAT', '카테고리'),
          new Unit('EA', '개'),
          100,
          0, '', '', '', true,
          undefined,
          mockUserData.currentUser.id
        );
      }).toThrow('제품코드는 필수입니다.');
    });
  });

  describe('동등성', () => {
    it('같은 ID를 가진 Product는 동등하다', () => {
      const product1 = createValidProduct();
      const product2 = createValidProduct();
      
      expect(product1.equals(product2)).toBe(true);
    });

    it('다른 ID를 가진 Product는 동등하지 않다', () => {
      const product1 = createValidProduct();
      
      const { basic } = mockProductData;
      const product2 = new Product(
        new ProductId('different-id'),
        basic.cd_material,
        basic.nm_material,
        basic.type,
        new Category(basic.category.code, basic.category.name),
        new Unit(basic.unit.code, basic.unit.name),
        basic.safetyStock,
        0, '', '', '', basic.isActive,
        undefined,
        mockUserData.currentUser.id,
        mockUserData.currentUser.id,
        mockDates.current,
        mockDates.current
      );
      
      expect(product1.equals(product2)).toBe(false);
    });
  });
});