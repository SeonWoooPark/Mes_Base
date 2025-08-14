import { CreateProductUseCase, CreateProductRequest } from '../../../../application/usecases/product/CreateProductUseCase';
import { ProductRepository } from '../../../../domain/repositories/ProductRepository';
import { ProductHistoryRepository } from '../../../../domain/repositories/ProductHistoryRepository';
import { ProductCodeGenerator } from '../../../../domain/services/ProductCodeGenerator';
import { ProductType } from '../../../../domain/entities/Product';
import { HistoryAction } from '../../../../domain/entities/ProductHistory';
import { mockProductData, mockUserData, createDelayedPromise, createRejectedPromise } from '../../../../__mocks__/mockData';
import { createMockRepository } from '../../../../__mocks__/testUtils';

describe('CreateProductUseCase', () => {
  let createProductUseCase: CreateProductUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockProductHistoryRepository: jest.Mocked<ProductHistoryRepository>;
  let mockProductCodeGenerator: jest.Mocked<ProductCodeGenerator>;

  const validRequest: CreateProductRequest = {
    nm_material: mockProductData.basic.nm_material,
    type: mockProductData.basic.type,
    category: mockProductData.basic.category,
    unit: mockProductData.basic.unit,
    safetyStock: mockProductData.basic.safetyStock,
    isActive: mockProductData.basic.isActive,
    additionalInfo: mockProductData.basic.additionalInfo,
    id_create: mockUserData.currentUser.id
  };

  beforeEach(() => {
    // Mock Repository 생성
    mockProductRepository = createMockRepository<ProductRepository>({
      save: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      findByPageWithCriteria: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
      existsByCode: jest.fn(),
      getLastSequenceByPrefix: jest.fn()
    });

    mockProductHistoryRepository = createMockRepository<ProductHistoryRepository>({
      save: jest.fn(),
      findByProductId: jest.fn(),
      findAll: jest.fn()
    });

    mockProductCodeGenerator = createMockRepository<ProductCodeGenerator>({
      generateCode: jest.fn()
    });

    // UseCase 인스턴스 생성
    createProductUseCase = new CreateProductUseCase(
      mockProductRepository,
      mockProductHistoryRepository,
      mockProductCodeGenerator
    );

    // 기본 Mock 설정
    mockProductCodeGenerator.generateCode.mockResolvedValue('TEST001');
    mockProductRepository.existsByCode.mockResolvedValue(false);
    mockProductRepository.findByName.mockResolvedValue(null);
    mockProductRepository.save.mockResolvedValue(undefined);
    mockProductHistoryRepository.save.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('성공 시나리오', () => {
    it('유효한 요청으로 제품을 생성할 수 있다', async () => {
      const result = await createProductUseCase.execute(validRequest);

      expect(result.success).toBe(true);
      expect(result.productCode).toBe('TEST001');
      expect(result.message).toBe('제품이 성공적으로 등록되었습니다.');
      expect(result.productId).toBeDefined();

      // 제품 저장 확인
      expect(mockProductRepository.save).toHaveBeenCalledTimes(1);
      
      // 이력 저장 확인
      expect(mockProductHistoryRepository.save).toHaveBeenCalledTimes(1);
      const historyCall = mockProductHistoryRepository.save.mock.calls[0][0];
      expect(historyCall.getAction()).toBe(HistoryAction.CREATE);
    });

    it('원자재 제품을 생성할 수 있다', async () => {
      const rawMaterialRequest: CreateProductRequest = {
        ...validRequest,
        type: ProductType.RAW_MATERIAL
      };

      const result = await createProductUseCase.execute(rawMaterialRequest);

      expect(result.success).toBe(true);
      expect(mockProductCodeGenerator.generateCode).toHaveBeenCalledWith(ProductType.RAW_MATERIAL);
    });

    it('반제품을 생성할 수 있다', async () => {
      const semiFinishedRequest: CreateProductRequest = {
        ...validRequest,
        type: ProductType.SEMI_FINISHED
      };

      const result = await createProductUseCase.execute(semiFinishedRequest);

      expect(result.success).toBe(true);
      expect(mockProductCodeGenerator.generateCode).toHaveBeenCalledWith(ProductType.SEMI_FINISHED);
    });

    it('추가 정보 없이도 제품을 생성할 수 있다', async () => {
      const requestWithoutAdditionalInfo: CreateProductRequest = {
        ...validRequest,
        additionalInfo: undefined
      };

      const result = await createProductUseCase.execute(requestWithoutAdditionalInfo);

      expect(result.success).toBe(true);
    });
  });

  describe('비즈니스 규칙 검증', () => {
    it('중복된 제품명으로 생성 시 에러가 발생한다', async () => {
      // 동일한 이름의 제품이 이미 존재하는 경우를 시뮬레이션
      mockProductRepository.findByName.mockResolvedValue({} as any);

      await expect(createProductUseCase.execute(validRequest))
        .rejects
        .toThrow('동일한 제품명이 이미 존재합니다.');

      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('중복된 제품 코드로 생성 시 에러가 발생한다', async () => {
      // 생성된 코드가 이미 존재하는 경우를 시뮬레이션
      mockProductRepository.existsByCode.mockResolvedValue(true);

      await expect(createProductUseCase.execute(validRequest))
        .rejects
        .toThrow('생성된 제품코드가 이미 존재합니다.');

      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('음수 안전재고로 생성 시 에러가 발생한다', async () => {
      const invalidRequest: CreateProductRequest = {
        ...validRequest,
        safetyStock: -10
      };

      await expect(createProductUseCase.execute(invalidRequest))
        .rejects
        .toThrow('안전재고는 0 이상이어야 합니다.');

      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('빈 제품명으로 생성 시 에러가 발생한다', async () => {
      const invalidRequest: CreateProductRequest = {
        ...validRequest,
        nm_material: ''
      };

      await expect(createProductUseCase.execute(invalidRequest))
        .rejects
        .toThrow('제품명은 필수입니다.');

      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('빈 카테고리 코드로 생성 시 에러가 발생한다', async () => {
      const invalidRequest: CreateProductRequest = {
        ...validRequest,
        category: { code: '', name: '전자부품' }
      };

      await expect(createProductUseCase.execute(invalidRequest))
        .rejects
        .toThrow('카테고리 코드는 필수입니다.');
    });

    it('빈 단위 코드로 생성 시 에러가 발생한다', async () => {
      const invalidRequest: CreateProductRequest = {
        ...validRequest,
        unit: { code: '', name: '개' }
      };

      await expect(createProductUseCase.execute(invalidRequest))
        .rejects
        .toThrow('단위 코드는 필수입니다.');
    });
  });

  describe('에러 처리', () => {
    it('제품 코드 생성 실패 시 에러가 발생한다', async () => {
      mockProductCodeGenerator.generateCode.mockRejectedValue(
        new Error('코드 생성 서비스 오류')
      );

      await expect(createProductUseCase.execute(validRequest))
        .rejects
        .toThrow('코드 생성 서비스 오류');

      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('제품 저장 실패 시 에러가 발생한다', async () => {
      mockProductRepository.save.mockRejectedValue(
        new Error('데이터베이스 저장 오류')
      );

      await expect(createProductUseCase.execute(validRequest))
        .rejects
        .toThrow('데이터베이스 저장 오류');

      expect(mockProductHistoryRepository.save).not.toHaveBeenCalled();
    });

    it('이력 저장 실패 시 에러가 발생한다', async () => {
      mockProductHistoryRepository.save.mockRejectedValue(
        new Error('이력 저장 오류')
      );

      await expect(createProductUseCase.execute(validRequest))
        .rejects
        .toThrow('이력 저장 오류');
    });

    it('네트워크 타임아웃 시 에러가 발생한다', async () => {
      mockProductRepository.save.mockImplementation(() => 
        createRejectedPromise('요청 시간이 초과되었습니다.', 5000)
      );

      await expect(createProductUseCase.execute(validRequest))
        .rejects
        .toThrow('요청 시간이 초과되었습니다.');
    });
  });

  describe('특수 케이스', () => {
    it('매우 긴 제품명도 처리할 수 있다', async () => {
      const longNameRequest: CreateProductRequest = {
        ...validRequest,
        nm_material: 'A'.repeat(200) // 200자 제품명
      };

      const result = await createProductUseCase.execute(longNameRequest);

      expect(result.success).toBe(true);
    });

    it('특수 문자가 포함된 제품명도 처리할 수 있다', async () => {
      const specialCharRequest: CreateProductRequest = {
        ...validRequest,
        nm_material: '테스트 제품 (특수문자: #@$%^&*)'
      };

      const result = await createProductUseCase.execute(specialCharRequest);

      expect(result.success).toBe(true);
    });

    it('매우 큰 안전재고 값도 처리할 수 있다', async () => {
      const largeSafetyStockRequest: CreateProductRequest = {
        ...validRequest,
        safetyStock: 999999
      };

      const result = await createProductUseCase.execute(largeSafetyStockRequest);

      expect(result.success).toBe(true);
    });
  });

  describe('성능 테스트', () => {
    it('동시에 여러 제품을 생성할 수 있다', async () => {
      const requests = Array.from({ length: 10 }, (_, index) => ({
        ...validRequest,
        nm_material: `테스트 제품 ${index + 1}`
      }));

      // 각 요청에 대해 고유한 제품 코드 생성
      mockProductCodeGenerator.generateCode
        .mockImplementation((type) => 
          Promise.resolve(`TEST${String(Math.random() * 1000).padStart(3, '0')}`)
        );

      const results = await Promise.all(
        requests.map(request => createProductUseCase.execute(request))
      );

      expect(results).toHaveLength(10);
      expect(results.every(result => result.success)).toBe(true);
      expect(mockProductRepository.save).toHaveBeenCalledTimes(10);
    });

    it('지연된 응답도 처리할 수 있다', async () => {
      mockProductRepository.save.mockImplementation(() => 
        createDelayedPromise(undefined, 1000) // 1초 지연
      );

      const startTime = Date.now();
      const result = await createProductUseCase.execute(validRequest);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(900); // 최소 900ms 이상
    });
  });

  describe('데이터 무결성', () => {
    it('생성된 제품의 모든 필드가 올바르게 설정된다', async () => {
      await createProductUseCase.execute(validRequest);

      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          getCode: expect.any(Function),
          getName: expect.any(Function),
          getType: expect.any(Function),
          getSafetyStock: expect.any(Function),
          getIsActive: expect.any(Function),
        })
      );

      const savedProduct = mockProductRepository.save.mock.calls[0][0];
      expect(savedProduct.getName()).toBe(validRequest.nm_material);
      expect(savedProduct.getType()).toBe(validRequest.type);
      expect(savedProduct.getSafetyStock()).toBe(validRequest.safetyStock);
      expect(savedProduct.getIsActive()).toBe(validRequest.isActive);
    });

    it('생성된 이력의 모든 필드가 올바르게 설정된다', async () => {
      await createProductUseCase.execute(validRequest);

      const savedHistory = mockProductHistoryRepository.save.mock.calls[0][0];
      expect(savedHistory.getAction()).toBe(HistoryAction.CREATE);
      expect(savedHistory.getIdUser()).toBe(validRequest.id_create);
      expect(savedHistory.getChangedFields()).toContain('전체');
    });
  });
});