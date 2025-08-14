import { AddBOMItemUseCase, AddBOMItemRequest } from '../../../../application/usecases/bom/AddBOMItemUseCase';
import { BOMRepository } from '../../../../domain/repositories/BOMRepository';
import { BOMItemRepository } from '../../../../domain/repositories/BOMItemRepository';
import { BOMHistoryRepository } from '../../../../domain/repositories/BOMHistoryRepository';
import { BOMCircularChecker } from '../../../../domain/services/BOMCircularChecker';
import { ComponentType } from '../../../../domain/entities/BOMItem';
import { mockBOMData, mockUserData, mockDates, createDelayedPromise, createRejectedPromise } from '../../../../__mocks__/mockData';
import { createMockRepository } from '../../../../__mocks__/testUtils';

describe('AddBOMItemUseCase', () => {
  let addBOMItemUseCase: AddBOMItemUseCase;
  let mockBOMRepository: jest.Mocked<BOMRepository>;
  let mockBOMItemRepository: jest.Mocked<BOMItemRepository>;
  let mockBOMHistoryRepository: jest.Mocked<BOMHistoryRepository>;
  let mockBOMCircularChecker: jest.Mocked<BOMCircularChecker>;

  const validRequest: AddBOMItemRequest = {
    bomId: mockBOMData.bom.id,
    parentItemId: undefined, // 최상위 아이템
    componentId: mockBOMData.bomItem.componentId,
    componentType: ComponentType.RAW_MATERIAL,
    quantity: mockBOMData.bomItem.quantity,
    unit: { code: 'KG', name: '킬로그램' },
    unitCost: mockBOMData.bomItem.unitCost,
    scrapRate: mockBOMData.bomItem.scrapRate,
    position: mockBOMData.bomItem.position,
    processStep: mockBOMData.bomItem.processStep,
    isOptional: mockBOMData.bomItem.isOptional,
    remarks: mockBOMData.bomItem.remarks,
    effectiveDate: mockDates.current,
    id_create: mockUserData.currentUser.id
  };

  beforeEach(() => {
    // Mock Repository 생성
    mockBOMRepository = createMockRepository<BOMRepository>({
      save: jest.fn(),
      findById: jest.fn(),
      findByProductId: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    });

    mockBOMItemRepository = createMockRepository<BOMItemRepository>({
      save: jest.fn(),
      findById: jest.fn(),
      findByBOMId: jest.fn(),
      findByComponentId: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findChildren: jest.fn(),
      findByParentId: jest.fn()
    });

    mockBOMHistoryRepository = createMockRepository<BOMHistoryRepository>({
      save: jest.fn(),
      findByBOMId: jest.fn(),
      findAll: jest.fn()
    });

    mockBOMCircularChecker = createMockRepository<BOMCircularChecker>({
      wouldCreateCircular: jest.fn(),
      checkCircularReference: jest.fn()
    });

    // UseCase 인스턴스 생성
    addBOMItemUseCase = new AddBOMItemUseCase(
      mockBOMRepository,
      mockBOMItemRepository,
      mockBOMHistoryRepository,
      mockBOMCircularChecker
    );

    // 기본 Mock 설정
    mockBOMRepository.findById.mockResolvedValue({} as any); // BOM 존재
    mockBOMItemRepository.findByBOMId.mockResolvedValue([]); // 기존 아이템 없음
    mockBOMCircularChecker.wouldCreateCircular.mockResolvedValue(false); // 순환 참조 없음
    mockBOMItemRepository.save.mockResolvedValue(undefined);
    mockBOMHistoryRepository.save.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('성공 시나리오', () => {
    it('유효한 요청으로 BOM 아이템을 추가할 수 있다', async () => {
      const result = await addBOMItemUseCase.execute(validRequest);

      expect(result.success).toBe(true);
      expect(result.bomItemId).toBeDefined();
      expect(result.message).toBe('BOM 아이템이 성공적으로 추가되었습니다.');

      // BOM 아이템 저장 확인
      expect(mockBOMItemRepository.save).toHaveBeenCalledTimes(1);
      
      // 이력 저장 확인
      expect(mockBOMHistoryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('원자재 구성품을 추가할 수 있다', async () => {
      const rawMaterialRequest: AddBOMItemRequest = {
        ...validRequest,
        componentType: ComponentType.RAW_MATERIAL
      };

      const result = await addBOMItemUseCase.execute(rawMaterialRequest);

      expect(result.success).toBe(true);
      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getComponentType()).toBe(ComponentType.RAW_MATERIAL);
    });

    it('반제품 구성품을 추가할 수 있다', async () => {
      const semiFinishedRequest: AddBOMItemRequest = {
        ...validRequest,
        componentType: ComponentType.SEMI_FINISHED
      };

      const result = await addBOMItemUseCase.execute(semiFinishedRequest);

      expect(result.success).toBe(true);
      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getComponentType()).toBe(ComponentType.SEMI_FINISHED);
    });

    it('조립품 구성품을 추가할 수 있다', async () => {
      const assemblyRequest: AddBOMItemRequest = {
        ...validRequest,
        componentType: ComponentType.SUB_ASSEMBLY
      };

      const result = await addBOMItemUseCase.execute(assemblyRequest);

      expect(result.success).toBe(true);
      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getComponentType()).toBe(ComponentType.SUB_ASSEMBLY);
    });

    it('하위 레벨 구성품을 추가할 수 있다', async () => {
      const subLevelRequest: AddBOMItemRequest = {
        ...validRequest,
        parentItemId: 'parent-item-id' // 부모 아이템 설정
      };

      const result = await addBOMItemUseCase.execute(subLevelRequest);

      expect(result.success).toBe(true);
      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getParentItemId()?.getValue()).toBe('parent-item-id');
    });

    it('선택적 구성품을 추가할 수 있다', async () => {
      const optionalRequest: AddBOMItemRequest = {
        ...validRequest,
        isOptional: true
      };

      const result = await addBOMItemUseCase.execute(optionalRequest);

      expect(result.success).toBe(true);
      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.isOptional).toBe(true);
    });
  });

  describe('비즈니스 규칙 검증', () => {
    it('존재하지 않는 BOM에 아이템 추가 시 에러가 발생한다', async () => {
      mockBOMRepository.findById.mockResolvedValue(null);

      await expect(addBOMItemUseCase.execute(validRequest))
        .rejects
        .toThrow('BOM을 찾을 수 없습니다.');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('순환 참조 발생 시 에러가 발생한다', async () => {
      mockBOMCircularChecker.wouldCreateCircular.mockResolvedValue(true);

      await expect(addBOMItemUseCase.execute(validRequest))
        .rejects
        .toThrow('순환 참조가 발생합니다.');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('중복된 구성품 추가 시 에러가 발생한다', async () => {
      // 동일한 구성품이 이미 존재하는 경우를 시뮬레이션
      mockBOMItemRepository.findByBOMId.mockResolvedValue([
        {
          getComponentId: () => ({ getValue: () => validRequest.componentId }),
          getParentItemId: () => undefined
        }
      ] as any);

      await expect(addBOMItemUseCase.execute(validRequest))
        .rejects
        .toThrow('동일한 구성품이 이미 존재합니다.');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('음수 수량으로 추가 시 에러가 발생한다', async () => {
      const invalidRequest: AddBOMItemRequest = {
        ...validRequest,
        quantity: -5
      };

      await expect(addBOMItemUseCase.execute(invalidRequest))
        .rejects
        .toThrow('수량은 0보다 커야 합니다.');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('음수 단가로 추가 시 에러가 발생한다', async () => {
      const invalidRequest: AddBOMItemRequest = {
        ...validRequest,
        unitCost: -100
      };

      await expect(addBOMItemUseCase.execute(invalidRequest))
        .rejects
        .toThrow('단가는 0 이상이어야 합니다.');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('잘못된 스크랩률로 추가 시 에러가 발생한다', async () => {
      const invalidRequest1: AddBOMItemRequest = {
        ...validRequest,
        scrapRate: -5
      };

      await expect(addBOMItemUseCase.execute(invalidRequest1))
        .rejects
        .toThrow('스크랩률은 0 이상 100 이하여야 합니다.');

      const invalidRequest2: AddBOMItemRequest = {
        ...validRequest,
        scrapRate: 150
      };

      await expect(addBOMItemUseCase.execute(invalidRequest2))
        .rejects
        .toThrow('스크랩률은 0 이상 100 이하여야 합니다.');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('빈 구성품 ID로 추가 시 에러가 발생한다', async () => {
      const invalidRequest: AddBOMItemRequest = {
        ...validRequest,
        componentId: ''
      };

      await expect(addBOMItemUseCase.execute(invalidRequest))
        .rejects
        .toThrow('구성품 ID는 필수입니다.');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('빈 단위 코드로 추가 시 에러가 발생한다', async () => {
      const invalidRequest: AddBOMItemRequest = {
        ...validRequest,
        unit: { code: '', name: '킬로그램' }
      };

      await expect(addBOMItemUseCase.execute(invalidRequest))
        .rejects
        .toThrow('단위 코드는 필수입니다.');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    it('BOM 조회 실패 시 에러가 발생한다', async () => {
      mockBOMRepository.findById.mockRejectedValue(
        new Error('데이터베이스 조회 오류')
      );

      await expect(addBOMItemUseCase.execute(validRequest))
        .rejects
        .toThrow('데이터베이스 조회 오류');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('순환 참조 검증 실패 시 에러가 발생한다', async () => {
      mockBOMCircularChecker.wouldCreateCircular.mockRejectedValue(
        new Error('순환 참조 검증 서비스 오류')
      );

      await expect(addBOMItemUseCase.execute(validRequest))
        .rejects
        .toThrow('순환 참조 검증 서비스 오류');

      expect(mockBOMItemRepository.save).not.toHaveBeenCalled();
    });

    it('BOM 아이템 저장 실패 시 에러가 발생한다', async () => {
      mockBOMItemRepository.save.mockRejectedValue(
        new Error('데이터베이스 저장 오류')
      );

      await expect(addBOMItemUseCase.execute(validRequest))
        .rejects
        .toThrow('데이터베이스 저장 오류');

      expect(mockBOMHistoryRepository.save).not.toHaveBeenCalled();
    });

    it('이력 저장 실패 시 에러가 발생한다', async () => {
      mockBOMHistoryRepository.save.mockRejectedValue(
        new Error('이력 저장 오류')
      );

      await expect(addBOMItemUseCase.execute(validRequest))
        .rejects
        .toThrow('이력 저장 오류');
    });

    it('네트워크 타임아웃 시 에러가 발생한다', async () => {
      mockBOMItemRepository.save.mockImplementation(() => 
        createRejectedPromise('요청 시간이 초과되었습니다.', 5000)
      );

      await expect(addBOMItemUseCase.execute(validRequest))
        .rejects
        .toThrow('요청 시간이 초과되었습니다.');
    });
  });

  describe('특수 케이스', () => {
    it('매우 큰 수량 값도 처리할 수 있다', async () => {
      const largeQuantityRequest: AddBOMItemRequest = {
        ...validRequest,
        quantity: 999999
      };

      const result = await addBOMItemUseCase.execute(largeQuantityRequest);

      expect(result.success).toBe(true);
      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getQuantity()).toBe(999999);
    });

    it('소수점 수량도 처리할 수 있다', async () => {
      const decimalQuantityRequest: AddBOMItemRequest = {
        ...validRequest,
        quantity: 10.5
      };

      const result = await addBOMItemUseCase.execute(decimalQuantityRequest);

      expect(result.success).toBe(true);
      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getQuantity()).toBe(10.5);
    });

    it('긴 비고 텍스트도 처리할 수 있다', async () => {
      const longRemarksRequest: AddBOMItemRequest = {
        ...validRequest,
        remarks: 'A'.repeat(500) // 500자 비고
      };

      const result = await addBOMItemUseCase.execute(longRemarksRequest);

      expect(result.success).toBe(true);
    });

    it('특수 문자가 포함된 위치 정보도 처리할 수 있다', async () => {
      const specialCharRequest: AddBOMItemRequest = {
        ...validRequest,
        position: 'A-01-02 (특수창고: #@$%)'
      };

      const result = await addBOMItemUseCase.execute(specialCharRequest);

      expect(result.success).toBe(true);
    });
  });

  describe('성능 테스트', () => {
    it('동시에 여러 BOM 아이템을 추가할 수 있다', async () => {
      const requests = Array.from({ length: 10 }, (_, index) => ({
        ...validRequest,
        componentId: `component-${index + 1}`
      }));

      const results = await Promise.all(
        requests.map(request => addBOMItemUseCase.execute(request))
      );

      expect(results).toHaveLength(10);
      expect(results.every(result => result.success)).toBe(true);
      expect(mockBOMItemRepository.save).toHaveBeenCalledTimes(10);
    });

    it('지연된 응답도 처리할 수 있다', async () => {
      mockBOMItemRepository.save.mockImplementation(() => 
        createDelayedPromise(undefined, 1000) // 1초 지연
      );

      const startTime = Date.now();
      const result = await addBOMItemUseCase.execute(validRequest);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(900); // 최소 900ms 이상
    });
  });

  describe('데이터 무결성', () => {
    it('생성된 BOM 아이템의 모든 필드가 올바르게 설정된다', async () => {
      await addBOMItemUseCase.execute(validRequest);

      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getComponentId().getValue()).toBe(validRequest.componentId);
      expect(savedItem.getQuantity()).toBe(validRequest.quantity);
      expect(savedItem.getUnitCost()).toBe(validRequest.unitCost);
      expect(savedItem.getScrapRate()).toBe(validRequest.scrapRate);
      expect(savedItem.getComponentType()).toBe(validRequest.componentType);
      expect(savedItem.isOptional).toBe(validRequest.isOptional);
    });

    it('생성된 이력의 모든 필드가 올바르게 설정된다', async () => {
      await addBOMItemUseCase.execute(validRequest);

      expect(mockBOMHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          getBOMId: expect.any(Function),
          getAction: expect.any(Function),
          getIdUser: expect.any(Function)
        })
      );
    });

    it('레벨 계산이 올바르게 수행된다', async () => {
      // 부모 아이템이 있는 경우 레벨이 자동 계산되는지 확인
      const parentItemRequest: AddBOMItemRequest = {
        ...validRequest,
        parentItemId: 'parent-item-id'
      };

      // 부모 아이템의 레벨이 2라고 가정
      mockBOMItemRepository.findById = jest.fn().mockResolvedValue({
        getLevel: () => 2
      } as any);

      await addBOMItemUseCase.execute(parentItemRequest);

      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getLevel()).toBe(3); // 부모 레벨(2) + 1
    });

    it('시퀀스 번호가 자동으로 할당된다', async () => {
      // 기존 아이템들의 최대 시퀀스가 5라고 가정
      mockBOMItemRepository.findByBOMId.mockResolvedValue([
        { getSequence: () => 3 },
        { getSequence: () => 5 },
        { getSequence: () => 1 }
      ] as any);

      await addBOMItemUseCase.execute(validRequest);

      const savedItem = mockBOMItemRepository.save.mock.calls[0][0];
      expect(savedItem.getSequence()).toBe(6); // 최대값(5) + 1
    });
  });
});