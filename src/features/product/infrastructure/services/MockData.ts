/**
 * Mock 데이터 관리 모듈
 * 
 * 워크플로우:
 * 1. 애플리케이션 시작 시 샘플 제품 데이터 생성
 * 2. 메모리 내에서 CRUD 연산 제공
 * 3. 실제 API 호출을 시뮬레이션하기 위한 지연 시간 추가
 * 4. 실제 백엔드와 동일한 동작 방식으로 구현
 * 
 * 사용 목적:
 * - 백엔드 없이 프론트엔드 개발 및 테스트
 * - 실제 API 연동 전 데모 및 프로토타이핑
 * - 개발 환경에서의 독립적인 작업 환경 제공
 */

import { Product, ProductId, ProductType, Category, Unit, AdditionalInfo } from '../../domain/entities/Product';
import { ProductHistory, HistoryAction } from '../../domain/entities/ProductHistory';

// 메모리 내 데이터 저장소
let products: Product[] = [];
let histories: ProductHistory[] = [];

/**
 * 초기 제품 데이터 생성
 * 다양한 제품 유형과 상태를 포함한 10개의 샘플 데이터
 */
function initializeProducts(): void {
    const currentDate = new Date();
    const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const productsData = [
      {
        id: 'prod-001',
        cd_material: 'FG2412001',
        nm_material: '삼성 갤럭시 S24 케이스',
        type: ProductType.FINISHED_PRODUCT,
        category: new Category('ELEC', '전자제품'),
        unit: new Unit('EA', '개'),
        safetyStock: 100,
        isActive: true,
        additionalInfo: new AdditionalInfo('스마트폰 보호케이스', '실리콘 재질, 투명', '신제품'),
        id_create: 'admin',
        id_updated: 'admin',
        dt_create: lastWeek,
        dt_update: yesterday
      },
      {
        id: 'prod-002',
        cd_material: 'SF2412001',
        nm_material: 'LCD 디스플레이 패널',
        type: ProductType.SEMI_FINISHED,
        category: new Category('ELEC', '전자제품'),
        unit: new Unit('EA', '개'),
        safetyStock: 50,
        isActive: true,
        additionalInfo: new AdditionalInfo('스마트폰용 LCD 패널', '6.1인치, FHD+', ''),
        id_create: 'manager',
        id_updated: 'manager',
        dt_create: lastWeek,
        dt_update: currentDate
      },
      {
        id: 'prod-003',
        cd_material: 'RM2412001',
        nm_material: '실리콘 원료',
        type: ProductType.RAW_MATERIAL,
        category: new Category('CHEM', '화학제품'),
        unit: new Unit('KG', '킬로그램'),
        safetyStock: 500,
        isActive: true,
        additionalInfo: new AdditionalInfo('케이스 제작용 실리콘', '고품질 실리콘 재료', ''),
        id_create: 'supervisor',
        id_updated: 'supervisor',
        dt_create: new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000),
        dt_update: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'prod-004',
        cd_material: 'FG2412002',
        nm_material: '무선 충전기',
        type: ProductType.FINISHED_PRODUCT,
        category: new Category('ELEC', '전자제품'),
        unit: new Unit('EA', '개'),
        safetyStock: 75,
        isActive: true,
        additionalInfo: new AdditionalInfo('스마트폰 무선 충전기', '15W 고속충전 지원', 'QI 표준'),
        id_create: 'admin',
        id_updated: 'manager',
        dt_create: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000),
        dt_update: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'prod-005',
        cd_material: 'SF2412002',
        nm_material: '충전 코일',
        type: ProductType.SEMI_FINISHED,
        category: new Category('ELEC', '전자제품'),
        unit: new Unit('EA', '개'),
        safetyStock: 200,
        isActive: true,
        additionalInfo: new AdditionalInfo('무선충전용 코일', '구리선 코일', ''),
        id_create: 'technician',
        id_updated: 'technician',
        dt_create: new Date(currentDate.getTime() - 12 * 24 * 60 * 60 * 1000),
        dt_update: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'prod-006',
        cd_material: 'RM2412002',
        nm_material: '구리선',
        type: ProductType.RAW_MATERIAL,
        category: new Category('MECH', '기계부품'),
        unit: new Unit('M', '미터'),
        safetyStock: 1000,
        isActive: true,
        additionalInfo: new AdditionalInfo('전자부품용 구리선', '0.5mm 굵기', ''),
        id_create: 'admin',
        id_updated: 'admin',
        dt_create: new Date(currentDate.getTime() - 20 * 24 * 60 * 60 * 1000),
        dt_update: new Date(currentDate.getTime() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'prod-007',
        cd_material: 'FG2412003',
        nm_material: '블루투스 이어폰',
        type: ProductType.FINISHED_PRODUCT,
        category: new Category('ELEC', '전자제품'),
        unit: new Unit('SET', '세트'),
        safetyStock: 150,
        isActive: false,
        additionalInfo: new AdditionalInfo('무선 블루투스 이어폰', 'ANC 기능 포함', '단종 예정'),
        id_create: 'manager',
        id_updated: 'manager',
        dt_create: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        dt_update: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'prod-008',
        cd_material: 'SF2412003',
        nm_material: '배터리 팩',
        type: ProductType.SEMI_FINISHED,
        category: new Category('ELEC', '전자제품'),
        unit: new Unit('EA', '개'),
        safetyStock: 80,
        isActive: true,
        additionalInfo: new AdditionalInfo('리튬이온 배터리', '3.7V, 500mAh', ''),
        id_create: 'technician',
        id_updated: 'supervisor',
        dt_create: new Date(currentDate.getTime() - 8 * 24 * 60 * 60 * 1000),
        dt_update: yesterday
      },
      {
        id: 'prod-009',
        cd_material: 'RM2412003',
        nm_material: '플라스틱 펠릿',
        type: ProductType.RAW_MATERIAL,
        category: new Category('CHEM', '화학제품'),
        unit: new Unit('KG', '킬로그램'),
        safetyStock: 300,
        isActive: true,
        additionalInfo: new AdditionalInfo('ABS 플라스틱 원료', '사출성형용', ''),
        id_create: 'admin',
        id_updated: 'admin',
        dt_create: new Date(currentDate.getTime() - 25 * 24 * 60 * 60 * 1000),
        dt_update: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'prod-010',
        cd_material: 'FG2412004',
        nm_material: '스마트 워치',
        type: ProductType.FINISHED_PRODUCT,
        category: new Category('ELEC', '전자제품'),
        unit: new Unit('EA', '개'),
        safetyStock: 120,
        isActive: true,
        additionalInfo: new AdditionalInfo('헬스케어 스마트워치', '심박수, 수면 측정', '신제품 출시'),
        id_create: 'manager',
        id_updated: 'manager',
        dt_create: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        dt_update: currentDate
      }
    ];

    products = productsData.map(data => 
      new Product(
        new ProductId(data.id),
        data.cd_material,
        data.nm_material,
        data.type,
        data.category,
        data.unit,
        data.safetyStock,
        data.isActive,
        data.additionalInfo,
        data.id_create,
        data.id_updated,
        data.dt_create,
        data.dt_update
      )
    );
}

function initializeHistories(): void {
    const historiesData = [
      {
        id: 'hist-001',
        productId: 'prod-001',
        action: HistoryAction.CREATE,
        changedFields: {
          fieldName: 'product_created',
          oldValue: null,
          newValue: 'CASE001'
        },
        userId: 'admin',
        userName: '관리자',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        reason: '신규 제품 등록'
      },
      {
        id: 'hist-002',
        productId: 'prod-001',
        action: HistoryAction.UPDATE,
        changedFields: {
          fieldName: 'safetyStock',
          oldValue: 80,
          newValue: 100
        },
        userId: 'admin',
        userName: '관리자',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        reason: '제품명 정확화 및 안전재고 증가'
      },
      {
        id: 'hist-003',
        productId: 'prod-007',
        action: HistoryAction.DEACTIVATE,
        changedFields: {
          fieldName: 'isActive',
          oldValue: true,
          newValue: false
        },
        userId: 'manager',
        userName: '매니저',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reason: '단종 결정으로 인한 비활성화'
      }
    ];

    histories = historiesData.map(data =>
      new ProductHistory(
        data.id,
        new ProductId(data.productId),
        data.action,
        data.changedFields,
        data.userId,
        data.userName,
        data.timestamp,
        data.reason
      )
    );
}

// 초기화 실행
initializeProducts();
initializeHistories();

// Export functions
// === 제품 관련 CRUD 함수들 ===

/**
 * 모든 제품 조회
 * @returns 제품 배열의 복사본 (원본 데이터 보호)
 */
export function getProducts(): Product[] {
  return [...products];
}

/**
 * ID로 특정 제품 조회
 * @param id 제품 ID
 * @returns 찾은 제품 또는 undefined
 */
export function getProductById(id: string): Product | undefined {
  return products.find(p => p.getId().getValue() === id);
}

/**
 * 새 제품 추가
 * @param product 추가할 제품
 */
export function addProduct(product: Product): void {
  products.push(product);
}

/**
 * 기존 제품 업데이트
 * @param product 업데이트할 제품 정보
 */
export function updateProduct(product: Product): void {
  const index = products.findIndex(p => p.getId().equals(product.getId()));
  if (index !== -1) {
    products[index] = product;
  }
}

/**
 * 제품 삭제 (실제로는 비활성화)
 * @param productId 삭제할 제품 ID
 */
export function deleteProduct(productId: ProductId): void {
  const index = products.findIndex(p => p.getId().equals(productId));
  if (index !== -1) {
    products.splice(index, 1);
  }
}

// === 제품 이력 관련 함수들 ===

/**
 * 모든 제품 이력 조회
 * @returns 이력 배열의 복사본
 */
export function getHistories(): ProductHistory[] {
  return [...histories];
}

/**
 * 특정 제품의 이력 조회
 * @param productId 제품 ID
 * @returns 해당 제품의 이력 배열
 */
export function getHistoriesByProductId(productId: ProductId): ProductHistory[] {
  return histories.filter(h => h.getProductId().equals(productId));
}

/**
 * 새 이력 추가
 * @param history 추가할 이력 정보
 */
export function addHistory(history: ProductHistory): void {
  histories.push(history);
}

// === 유틸리티 함수들 ===

/**
 * 제품코드 시퀀스 생성을 위한 다음 번호 조회
 * @param prefix 제품코드 접두사 (예: FG2412)
 * @returns 다음 시퀀스 번호
 */
export function getNextSequence(prefix: string): number {
  const matchingProducts = products
    .filter(p => p.getCdMaterial().startsWith(prefix))
    .map(p => {
      const code = p.getCdMaterial();
      const sequencePart = code.substring(prefix.length);
      return parseInt(sequencePart) || 0;
    });

  return Math.max(0, ...matchingProducts);
}