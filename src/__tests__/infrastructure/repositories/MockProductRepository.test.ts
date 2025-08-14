import { MockProductRepository } from '../../../infrastructure/repositories/MockProductRepository';
import { Product, ProductId, ProductType, Category, Unit } from '../../../domain/entities/Product';
import { SearchCriteria, SortField, SortOrder } from '../../../domain/repositories/ProductRepository';
import { mockProductData, mockDates, mockUserData } from '../../../__mocks__/mockData';

describe('MockProductRepository', () => {
  let repository: MockProductRepository;

  const createSampleProduct = (id: string, code: string, name: string, type: ProductType = ProductType.FINISHED_PRODUCT) => {
    return new Product(
      new ProductId(id),
      code,
      name,
      type,
      new Category('ELEC', '전자부품'),
      new Unit('EA', '개'),
      100, // safetyStock
      0, // leadTime
      '', // supplier
      '', // location
      '', // memo
      true, // isActive
      undefined, // additionalInfo
      mockUserData.currentUser.id,
      mockUserData.currentUser.id,
      mockDates.current,
      mockDates.current
    );
  };

  beforeEach(() => {
    repository = new MockProductRepository();
  });

  describe('기본 CRUD 작업', () => {
    it('제품을 저장할 수 있다', async () => {
      const product = createSampleProduct('test-1', 'TEST001', '테스트 제품');
      
      await expect(repository.save(product)).resolves.not.toThrow();
    });

    it('ID로 제품을 조회할 수 있다', async () => {
      const product = createSampleProduct('test-1', 'TEST001', '테스트 제품');
      await repository.save(product);
      
      const found = await repository.findById(new ProductId('test-1'));
      
      expect(found).toBeDefined();
      expect(found?.getId().getValue()).toBe('test-1');
      expect(found?.getName()).toBe('테스트 제품');
    });

    it('존재하지 않는 ID로 조회 시 null을 반환한다', async () => {
      const found = await repository.findById(new ProductId('non-existent'));
      
      expect(found).toBeNull();
    });

    it('제품 코드로 제품을 조회할 수 있다', async () => {
      const product = createSampleProduct('test-1', 'TEST001', '테스트 제품');
      await repository.save(product);
      
      const found = await repository.findByCode('TEST001');
      
      expect(found).toBeDefined();
      expect(found?.getCode()).toBe('TEST001');
    });

    it('제품명으로 제품을 조회할 수 있다', async () => {
      const product = createSampleProduct('test-1', 'TEST001', '테스트 제품');
      await repository.save(product);
      
      const found = await repository.findByName('테스트 제품');
      
      expect(found).toBeDefined();
      expect(found?.getName()).toBe('테스트 제품');
    });

    it('제품을 업데이트할 수 있다', async () => {
      const product = createSampleProduct('test-1', 'TEST001', '테스트 제품');
      await repository.save(product);
      
      const updatedProduct = product.updateProduct(
        'TEST001',
        '업데이트된 제품',
        ProductType.FINISHED_PRODUCT,
        new Category('ELEC', '전자부품'),
        new Unit('EA', '개'),
        200, // 새로운 안전재고
        0, '', '', '', true,
        undefined,
        mockUserData.currentUser.id
      );
      
      await repository.update(updatedProduct);
      
      const found = await repository.findById(new ProductId('test-1'));
      expect(found?.getName()).toBe('업데이트된 제품');
      expect(found?.getSafetyStock()).toBe(200);
    });

    it('제품을 삭제할 수 있다', async () => {
      const product = createSampleProduct('test-1', 'TEST001', '테스트 제품');
      await repository.save(product);
      
      await repository.delete(new ProductId('test-1'));
      
      const found = await repository.findById(new ProductId('test-1'));
      expect(found).toBeNull();
    });

    it('모든 제품을 조회할 수 있다', async () => {
      const product1 = createSampleProduct('test-1', 'TEST001', '테스트 제품 1');
      const product2 = createSampleProduct('test-2', 'TEST002', '테스트 제품 2');
      const product3 = createSampleProduct('test-3', 'TEST003', '테스트 제품 3');
      
      await repository.save(product1);
      await repository.save(product2);
      await repository.save(product3);
      
      const allProducts = await repository.findAll();
      
      expect(allProducts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('페이지네이션 및 검색', () => {
    beforeEach(async () => {
      // 테스트용 데이터 준비
      for (let i = 1; i <= 15; i++) {
        const product = createSampleProduct(
          `test-${i}`,
          `TEST${String(i).padStart(3, '0')}`,
          `테스트 제품 ${i}`,
          i % 3 === 0 ? ProductType.RAW_MATERIAL : ProductType.FINISHED_PRODUCT
        );
        await repository.save(product);
      }
    });

    it('페이지별로 제품을 조회할 수 있다', async () => {
      const criteria: SearchCriteria = {};
      const page = 1;
      const pageSize = 5;
      const sortBy = SortField.NAME;
      const sortOrder = SortOrder.ASC;
      
      const products = await repository.findByPageWithCriteria(
        criteria, page, pageSize, sortBy, sortOrder
      );
      
      expect(products).toHaveLength(5);
    });

    it('검색 키워드로 제품을 필터링할 수 있다', async () => {
      const criteria: SearchCriteria = {
        searchKeyword: '테스트 제품 1'
      };
      
      const products = await repository.findByPageWithCriteria(
        criteria, 1, 10, SortField.NAME, SortOrder.ASC
      );
      
      expect(products.length).toBeGreaterThan(0);
      expect(products.every(p => p.getName().includes('1'))).toBe(true);
    });

    it('제품 유형별로 필터링할 수 있다', async () => {
      const criteria: SearchCriteria = {
        type: ProductType.RAW_MATERIAL
      };
      
      const products = await repository.findByPageWithCriteria(
        criteria, 1, 20, SortField.NAME, SortOrder.ASC
      );
      
      expect(products.every(p => p.getType() === ProductType.RAW_MATERIAL)).toBe(true);
    });

    it('활성 상태별로 필터링할 수 있다', async () => {
      // 비활성 제품 추가
      const inactiveProduct = new Product(
        new ProductId('inactive-1'),
        'INACTIVE001',
        '비활성 제품',
        ProductType.FINISHED_PRODUCT,
        new Category('ELEC', '전자부품'),
        new Unit('EA', '개'),
        100, 0, '', '', '',
        false, // 비활성
        undefined,
        mockUserData.currentUser.id,
        mockUserData.currentUser.id,
        mockDates.current,
        mockDates.current
      );
      await repository.save(inactiveProduct);
      
      const activeCriteria: SearchCriteria = { isActive: true };
      const inactiveCriteria: SearchCriteria = { isActive: false };
      
      const activeProducts = await repository.findByPageWithCriteria(
        activeCriteria, 1, 20, SortField.NAME, SortOrder.ASC
      );
      const inactiveProducts = await repository.findByPageWithCriteria(
        inactiveCriteria, 1, 20, SortField.NAME, SortOrder.ASC
      );
      
      expect(activeProducts.every(p => p.getIsActive())).toBe(true);
      expect(inactiveProducts.every(p => !p.getIsActive())).toBe(true);
    });

    it('제품명으로 정렬할 수 있다', async () => {
      const criteria: SearchCriteria = {};
      
      const ascProducts = await repository.findByPageWithCriteria(
        criteria, 1, 10, SortField.NAME, SortOrder.ASC
      );
      const descProducts = await repository.findByPageWithCriteria(
        criteria, 1, 10, SortField.NAME, SortOrder.DESC
      );
      
      // 오름차순 정렬 확인
      for (let i = 0; i < ascProducts.length - 1; i++) {
        expect(ascProducts[i].getName() <= ascProducts[i + 1].getName()).toBe(true);
      }
      
      // 내림차순 정렬 확인
      for (let i = 0; i < descProducts.length - 1; i++) {
        expect(descProducts[i].getName() >= descProducts[i + 1].getName()).toBe(true);
      }
    });

    it('제품 코드로 정렬할 수 있다', async () => {
      const criteria: SearchCriteria = {};
      
      const ascProducts = await repository.findByPageWithCriteria(
        criteria, 1, 10, SortField.CODE, SortOrder.ASC
      );
      
      // 코드 오름차순 정렬 확인
      for (let i = 0; i < ascProducts.length - 1; i++) {
        expect(ascProducts[i].getCode() <= ascProducts[i + 1].getCode()).toBe(true);
      }
    });

    it('생성일로 정렬할 수 있다', async () => {
      const criteria: SearchCriteria = {};
      
      const ascProducts = await repository.findByPageWithCriteria(
        criteria, 1, 10, SortField.CREATED_DATE, SortOrder.ASC
      );
      
      expect(ascProducts).toHaveLength(10);
    });
  });

  describe('유틸리티 메서드', () => {
    it('제품 코드 존재 여부를 확인할 수 있다', async () => {
      const product = createSampleProduct('test-1', 'TEST001', '테스트 제품');
      await repository.save(product);
      
      const exists = await repository.existsByCode('TEST001');
      const notExists = await repository.existsByCode('NONEXISTENT');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('접두사별 마지막 시퀀스를 가져올 수 있다', async () => {
      // 같은 접두사를 가진 제품들 생성
      const products = [
        createSampleProduct('test-1', 'FG2412001', '완제품 1'),
        createSampleProduct('test-2', 'FG2412005', '완제품 2'),
        createSampleProduct('test-3', 'FG2412003', '완제품 3'),
        createSampleProduct('test-4', 'RM2412002', '원자재 1') // 다른 접두사
      ];
      
      for (const product of products) {
        await repository.save(product);
      }
      
      const lastSequence = await repository.getLastSequenceByPrefix('FG2412');
      
      expect(lastSequence).toBe(5); // FG2412005에서 5
    });

    it('접두사에 해당하는 제품이 없을 때 0을 반환한다', async () => {
      const lastSequence = await repository.getLastSequenceByPrefix('NONEXISTENT');
      
      expect(lastSequence).toBe(0);
    });
  });

  describe('지연시간 시뮬레이션', () => {
    it('모든 작업에서 지연시간이 발생한다', async () => {
      const product = createSampleProduct('test-1', 'TEST001', '테스트 제품');
      
      const startTime = Date.now();
      await repository.save(product);
      const endTime = Date.now();
      
      // 최소 지연시간(100ms) 확인
      expect(endTime - startTime).toBeGreaterThan(90);
    });
  });

  describe('에러 처리', () => {
    it('중복된 제품 코드 저장 시 에러가 발생한다', async () => {
      const product1 = createSampleProduct('test-1', 'DUPLICATE', '제품 1');
      const product2 = createSampleProduct('test-2', 'DUPLICATE', '제품 2');
      
      await repository.save(product1);
      
      await expect(repository.save(product2))
        .rejects
        .toThrow('이미 존재하는 제품 코드입니다.');
    });

    it('존재하지 않는 제품 업데이트 시 에러가 발생한다', async () => {
      const nonExistentProduct = createSampleProduct('non-existent', 'TEST001', '존재하지 않는 제품');
      
      await expect(repository.update(nonExistentProduct))
        .rejects
        .toThrow('제품을 찾을 수 없습니다.');
    });

    it('존재하지 않는 제품 삭제 시 에러가 발생한다', async () => {
      await expect(repository.delete(new ProductId('non-existent')))
        .rejects
        .toThrow('제품을 찾을 수 없습니다.');
    });
  });

  describe('대량 데이터 처리', () => {
    it('대량의 제품을 처리할 수 있다', async () => {
      const products = [];
      for (let i = 1; i <= 100; i++) {
        products.push(createSampleProduct(
          `bulk-${i}`,
          `BULK${String(i).padStart(3, '0')}`,
          `대량 제품 ${i}`
        ));
      }
      
      // 병렬로 저장
      await Promise.all(products.map(p => repository.save(p)));
      
      const allProducts = await repository.findAll();
      expect(allProducts.length).toBeGreaterThanOrEqual(100);
    });

    it('대량 데이터에서 페이지네이션이 정상 작동한다', async () => {
      // 50개 제품 저장
      for (let i = 1; i <= 50; i++) {
        const product = createSampleProduct(`page-${i}`, `PAGE${String(i).padStart(3, '0')}`, `페이지 제품 ${i}`);
        await repository.save(product);
      }
      
      const page1 = await repository.findByPageWithCriteria({}, 1, 10, SortField.NAME, SortOrder.ASC);
      const page2 = await repository.findByPageWithCriteria({}, 2, 10, SortField.NAME, SortOrder.ASC);
      const page5 = await repository.findByPageWithCriteria({}, 5, 10, SortField.NAME, SortOrder.ASC);
      
      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page5).toHaveLength(10);
      
      // 페이지별로 다른 데이터인지 확인
      const page1Ids = page1.map(p => p.getId().getValue());
      const page2Ids = page2.map(p => p.getId().getValue());
      expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false);
    });
  });
});