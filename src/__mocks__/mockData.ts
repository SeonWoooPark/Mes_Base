import { ProductType } from '../domain/entities/Product';
import { ComponentType } from '../domain/entities/BOMItem';

/**
 * 테스트용 Mock 데이터 생성기
 */

// 기본 제품 데이터
export const mockProductData = {
  basic: {
    id: 'test-product-001',
    cd_material: 'TEST001',
    nm_material: '테스트 제품',
    type: ProductType.FINISHED_PRODUCT,
    category: { code: 'ELEC', name: '전자부품' },
    unit: { code: 'EA', name: '개' },
    safetyStock: 100,
    isActive: true,
    additionalInfo: {
      description: '테스트용 제품입니다',
      specifications: '크기: 10x10cm',
      notes: '테스트 노트'
    }
  },
  
  rawMaterial: {
    id: 'test-product-002',
    cd_material: 'RM001',
    nm_material: '테스트 원자재',
    type: ProductType.RAW_MATERIAL,
    category: { code: 'RAW', name: '원자재' },
    unit: { code: 'KG', name: '킬로그램' },
    safetyStock: 50,
    isActive: true
  },

  semiFinished: {
    id: 'test-product-003',
    cd_material: 'SF001',
    nm_material: '테스트 반제품',
    type: ProductType.SEMI_FINISHED,
    category: { code: 'SEMI', name: '반제품' },
    unit: { code: 'EA', name: '개' },
    safetyStock: 30,
    isActive: true
  }
};

// BOM 관련 테스트 데이터
export const mockBOMData = {
  bomItem: {
    id: 'test-bom-item-001',
    bomId: 'test-bom-001',
    componentId: 'test-product-002',
    componentCode: 'RM001',
    componentName: '테스트 원자재',
    componentType: ComponentType.RAW_MATERIAL,
    level: 1,
    sequence: 1,
    quantity: 10,
    unitName: 'KG',
    unitCost: 1000,
    scrapRate: 2.0,
    isOptional: false,
    isActive: true,
    position: 'A-01-01',
    processStep: '조립',
    remarks: '테스트 구성품'
  },

  bom: {
    id: 'test-bom-001',
    productId: 'test-product-001',
    version: '1.0',
    isActive: true,
    description: '테스트 BOM',
    effectiveDate: new Date('2024-01-01'),
    expirationDate: undefined
  }
};

// 유효성 검증 테스트용 잘못된 데이터
export const invalidProductData = {
  emptyName: {
    ...mockProductData.basic,
    nm_material: ''
  },
  
  negativeStock: {
    ...mockProductData.basic,
    safetyStock: -10
  },
  
  invalidType: {
    ...mockProductData.basic,
    type: 'INVALID_TYPE' as ProductType
  }
};

// 사용자 정보
export const mockUserData = {
  currentUser: {
    id: 'test-user-001',
    name: '테스트 사용자',
    email: 'test@example.com'
  }
};

// 날짜 관련 헬퍼
export const mockDates = {
  current: new Date('2024-12-01T00:00:00.000Z'),
  past: new Date('2024-01-01T00:00:00.000Z'),
  future: new Date('2025-01-01T00:00:00.000Z')
};

// 에러 메시지
export const mockErrorMessages = {
  validation: {
    required: '필수 입력 항목입니다',
    invalidFormat: '형식이 올바르지 않습니다',
    duplicateCode: '이미 존재하는 제품 코드입니다'
  },
  network: {
    timeout: '요청 시간이 초과되었습니다',
    serverError: '서버에서 오류가 발생했습니다',
    notFound: '요청한 데이터를 찾을 수 없습니다'
  }
};

// 페이지네이션 테스트 데이터
export const mockPaginationData = {
  page1: {
    products: Array.from({ length: 10 }, (_, index) => ({
      ...mockProductData.basic,
      id: `product-${index + 1}`,
      cd_material: `TEST${String(index + 1).padStart(3, '0')}`,
      nm_material: `테스트 제품 ${index + 1}`
    })),
    totalCount: 25,
    currentPage: 1,
    totalPages: 3,
    pageSize: 10
  }
};

// API 응답 Mock 헬퍼
export const createMockApiResponse = <T>(data: T, success: boolean = true) => ({
  data,
  success,
  message: success ? '성공' : '실패',
  timestamp: mockDates.current.toISOString()
});

// 지연 시뮬레이션 헬퍼
export const createDelayedPromise = <T>(data: T, delay: number = 100): Promise<T> => 
  new Promise(resolve => setTimeout(() => resolve(data), delay));

// 에러 시뮬레이션 헬퍼
export const createRejectedPromise = (message: string, delay: number = 100): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), delay));