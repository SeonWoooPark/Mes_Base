/**
 * BOM Mock 데이터 관리 모듈
 * 
 * 워크플로우:
 * 1. 애플리케이션 시작 시 샘플 BOM 데이터 생성
 * 2. 메모리 내에서 BOM CRUD 연산 제공
 * 3. 실제 API 호출을 시뮬레이션하기 위한 지연 시간 추가
 * 4. 실제 백엔드와 동일한 동작 방식으로 구현
 * 
 * 사용 목적:
 * - 백엔드 없이 프론트엔드 개발 및 테스트
 * - 실제 API 연동 전 데모 및 프로토타이핑
 * - 개발 환경에서의 독립적인 작업 환경 제공
 */

import { BOM } from '../../domain/entities/BOM';
import { BOMItem, BOMId, BOMItemId, ComponentType } from '../../domain/entities/BOMItem';
import { BOMHistory, BOMHistoryAction } from '../../domain/entities/BOMHistory';
import { ProductId, Unit } from '@features/product/domain/entities/Product';

// 메모리 내 데이터 저장소
let boms: BOM[] = [];
let bomItems: BOMItem[] = [];
let bomHistories: BOMHistory[] = [];

/**
 * 초기 BOM 데이터 생성
 * 다양한 제품의 BOM과 계층구조를 포함한 샘플 데이터
 */
function initializeBOMs(): void {
  const currentDate = new Date();
  const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // BOM 데이터 생성
  const bomDataList = [
    {
      id: 'bom-001',
      productId: 'prod-001', // 삼성 갤럭시 S24 케이스
      version: '1.0',
      isActive: true,
      effectiveDate: lastWeek,
      expiryDate: undefined,
      description: '갤럭시 S24 케이스 BOM - 실리콘 재질',
      idCreate: 'admin',
      idUpdated: 'admin',
      dtCreate: lastWeek,
      dtUpdate: yesterday
    },
    {
      id: 'bom-002',
      productId: 'prod-004', // 무선 충전기
      version: '1.0',
      isActive: true,
      effectiveDate: lastWeek,
      expiryDate: undefined,
      description: '15W 무선 충전기 BOM',
      idCreate: 'manager',
      idUpdated: 'manager',
      dtCreate: lastWeek,
      dtUpdate: currentDate
    },
    {
      id: 'bom-003',
      productId: 'prod-007', // 블루투스 이어폰
      version: '1.0',
      isActive: false, // 단종 제품
      effectiveDate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: yesterday,
      description: '블루투스 이어폰 BOM - 단종',
      idCreate: 'manager',
      idUpdated: 'manager',
      dtCreate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      dtUpdate: yesterday
    },
    {
      id: 'bom-004',
      productId: 'prod-010', // 스마트 워치
      version: '1.0',
      isActive: true,
      effectiveDate: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      expiryDate: undefined,
      description: '헬스케어 스마트워치 BOM',
      idCreate: 'manager',
      idUpdated: 'manager',
      dtCreate: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      dtUpdate: currentDate
    }
  ];

  // BOM 엔티티 생성
  boms = bomDataList.map(data => new BOM(
    new BOMId(data.id),
    new ProductId(data.productId),
    data.version,
    data.isActive,
    [], // bomItems는 나중에 설정
    data.effectiveDate,
    data.idCreate,
    data.idUpdated,
    data.dtCreate,
    data.dtUpdate,
    data.expiryDate,
    data.description
  ));
}

/**
 * 초기 BOM Item 데이터 생성
 * 계층구조와 다양한 구성품 관계를 포함한 샘플 데이터
 */
function initializeBOMItems(): void {
  const currentDate = new Date();
  const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 현실적인 BOM Item 데이터 - 다양한 제품의 계층구조 포함
  bomItems = [
    // ========== BOM-001 (갤럭시 S24 케이스) 구성품들 ==========
    // Level 1: 메인 구성품들
    new BOMItem(
      new BOMItemId('bom-item-001'),
      new BOMId('bom-001'),
      new ProductId('prod-003'), // 실리콘 원료
      undefined, // parentItemId
      1, // level
      1, // sequence
      45.0, // quantity
      new Unit('G', '그램'), // unit
      0.12, // unitCost
      2.0, // scrapRate
      false, // isOptional
      ComponentType.RAW_MATERIAL,
      lastWeek,
      'admin',
      'admin', 
      lastWeek,
      yesterday,
      undefined,
      '사출성형',
      '고품질 실리콘 45g - 친환경 소재',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-002'),
      new BOMId('bom-001'),
      new ProductId('prod-009'), // 플라스틱 펠릿
      undefined,
      1,
      2,
      15.0,
      new Unit('G', '그램'),
      0.08,
      1.5,
      false,
      ComponentType.RAW_MATERIAL,
      lastWeek,
      'admin',
      'admin',
      lastWeek,
      yesterday,
      undefined,
      '내부프레임',
      'PC+ABS 혼합 펠릿 - 강화 내구성',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-003'),
      new BOMId('bom-001'),
      new ProductId('prod-002'), // 착색제
      undefined,
      1,
      3,
      2.5,
      new Unit('G', '그램'),
      0.25,
      0.5,
      true, // 선택사양
      ComponentType.RAW_MATERIAL,
      lastWeek,
      'admin',
      'admin',
      lastWeek,
      yesterday,
      undefined,
      '착색',
      '블랙 컬러 마스터배치 - 선택사양',
      undefined
    ),

    // ========== BOM-002 (무선 충전기) 구성품들 ==========
    // Level 1: 메인 어셈블리
    new BOMItem(
      new BOMItemId('bom-item-004'),
      new BOMId('bom-002'),
      new ProductId('prod-005'), // 충전 코일
      undefined,
      1,
      1,
      1.0,
      new Unit('EA', '개'),
      15.50,
      0.2,
      false,
      ComponentType.PURCHASED_PART,
      lastWeek,
      'manager',
      'manager',
      lastWeek,
      currentDate,
      undefined,
      '코일조립',
      '15W 출력 무선충전 코일 - 고효율',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-005'),
      new BOMId('bom-002'),
      new ProductId('prod-006'), // PCB 보드
      undefined,
      1,
      2,
      1.0,
      new Unit('EA', '개'),
      8.75,
      0.1,
      false,
      ComponentType.PURCHASED_PART,
      lastWeek,
      'manager',
      'manager',
      lastWeek,
      currentDate,
      undefined,
      'PCB조립',
      'Qi 표준 무선충전 제어 PCB',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-006'),
      new BOMId('bom-002'),
      new ProductId('prod-008'), // 알루미늄 케이스
      undefined,
      1,
      3,
      1.0,
      new Unit('EA', '개'),
      12.30,
      0.3,
      false,
      ComponentType.SUB_ASSEMBLY,
      lastWeek,
      'manager',
      'manager',
      lastWeek,
      currentDate,
      undefined,
      '케이스조립',
      '방열 알루미늄 하우징 - CNC 가공',
      undefined
    ),
    
    // Level 2: PCB 보드 하위 구성품 (hierarchical BOM)
    new BOMItem(
      new BOMItemId('bom-item-007'),
      new BOMId('bom-002'),
      new ProductId('prod-003'), // 실리콘 (방열패드용)
      new BOMItemId('bom-item-005'), // PCB 보드의 하위
      2,
      1,
      3.0,
      new Unit('G', '그램'),
      0.15,
      1.0,
      false,
      ComponentType.RAW_MATERIAL,
      lastWeek,
      'manager',
      'manager',
      lastWeek,
      currentDate,
      undefined,
      '방열처리',
      '열전도 실리콘 패드 - PCB 방열용',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-008'),
      new BOMId('bom-002'),
      new ProductId('prod-009'), // 플라스틱 (커넥터용)
      new BOMItemId('bom-item-005'), // PCB 보드의 하위
      2,
      2,
      2.0,
      new Unit('G', '그램'),
      0.05,
      0.5,
      false,
      ComponentType.RAW_MATERIAL,
      lastWeek,
      'manager',
      'manager',
      lastWeek,
      currentDate,
      undefined,
      '커넥터',
      'USB-C 커넥터용 절연체',
      undefined
    ),

    // ========== BOM-004 (스마트 워치) 구성품들 ==========
    // 복잡한 계층구조의 예시
    // Level 1: 메인 어셈블리들
    new BOMItem(
      new BOMItemId('bom-item-009'),
      new BOMId('bom-004'),
      new ProductId('prod-001'), // 완성품 서브어셈블리 (디스플레이 모듈)
      undefined,
      1,
      1,
      1.0,
      new Unit('EA', '개'),
      45.80,
      0.1,
      false,
      ComponentType.SUB_ASSEMBLY,
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      currentDate,
      undefined,
      '디스플레이조립',
      '1.4인치 AMOLED 터치 디스플레이 모듈',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-010'),
      new BOMId('bom-004'),
      new ProductId('prod-004'), // 배터리 서브어셈블리
      undefined,
      1,
      2,
      1.0,
      new Unit('EA', '개'),
      28.50,
      0.05,
      false,
      ComponentType.SUB_ASSEMBLY,
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      currentDate,
      undefined,
      '배터리조립',
      '300mAh 리튬폴리머 배터리 모듈',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-011'),
      new BOMId('bom-004'),
      new ProductId('prod-008'), // 메인보드
      undefined,
      1,
      3,
      1.0,
      new Unit('EA', '개'),
      67.20,
      0.08,
      false,
      ComponentType.SUB_ASSEMBLY,
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      currentDate,
      undefined,
      '메인보드조립',
      'ARM Cortex-M4 메인 제어보드',
      undefined
    ),
    
    // Level 2: 디스플레이 모듈 하위 구성품
    new BOMItem(
      new BOMItemId('bom-item-012'),
      new BOMId('bom-004'),
      new ProductId('prod-003'), // 실리콘 (터치패널 실링용)
      new BOMItemId('bom-item-009'), // 디스플레이 모듈의 하위
      2,
      1,
      1.2,
      new Unit('G', '그램'),
      0.18,
      0.8,
      false,
      ComponentType.RAW_MATERIAL,
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      currentDate,
      undefined,
      '실링',
      '방수 실링용 실리콘 - IP67 등급',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-013'),
      new BOMId('bom-004'),
      new ProductId('prod-005'), // 강화유리
      new BOMItemId('bom-item-009'), // 디스플레이 모듈의 하위
      2,
      2,
      1.0,
      new Unit('EA', '개'),
      8.90,
      0.5,
      false,
      ComponentType.PURCHASED_PART,
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      currentDate,
      undefined,
      '표면처리',
      'Gorilla Glass 3 보호유리',
      undefined
    ),
    
    // Level 2: 배터리 모듈 하위 구성품
    new BOMItem(
      new BOMItemId('bom-item-014'),
      new BOMId('bom-004'),
      new ProductId('prod-006'), // 보호회로
      new BOMItemId('bom-item-010'), // 배터리 모듈의 하위
      2,
      1,
      1.0,
      new Unit('EA', '개'),
      4.25,
      0.1,
      false,
      ComponentType.PURCHASED_PART,
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      currentDate,
      undefined,
      '보호회로',
      '과충전/과방전 보호회로',
      undefined
    ),
    
    // Level 3: 메인보드 하위 구성품 (더 깊은 계층)
    new BOMItem(
      new BOMItemId('bom-item-015'),
      new BOMId('bom-004'),
      new ProductId('prod-002'), // 센서 IC
      new BOMItemId('bom-item-011'), // 메인보드의 하위
      3,
      1,
      3.0,
      new Unit('EA', '개'),
      12.50,
      0.05,
      false,
      ComponentType.PURCHASED_PART,
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 1000),
      currentDate,
      undefined,
      'SMT',
      '가속도/자이로 센서 IC 패키지',
      undefined
    ),
    new BOMItem(
      new BOMItemId('bom-item-016'),
      new BOMId('bom-004'),
      new ProductId('prod-009'), // 커패시터
      new BOMItemId('bom-item-011'), // 메인보드의 하위
      3,
      2,
      15.0,
      new Unit('EA', '개'),
      0.35,
      0.2,
      false,
      ComponentType.PURCHASED_PART,
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      currentDate,
      undefined,
      'SMT',
      '세라믹 커패시터 0402 패키지',
      undefined
    ),

    // ========== BOM-003 (블루투스 이어폰 - 단종품) 구성품들 ==========
    new BOMItem(
      new BOMItemId('bom-item-017'),
      new BOMId('bom-003'),
      new ProductId('prod-007'), // 단종 원자재
      undefined,
      1,
      1,
      2.0,
      new Unit('EA', '개'),
      25.00,
      0.1,
      false,
      ComponentType.PURCHASED_PART,
      new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      'manager',
      'manager',
      new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      yesterday,
      undefined,
      '조립',
      '블루투스 5.0 오디오 드라이버 - 단종',
      yesterday // 만료일 설정
    )
  ];
}

/**
 * 초기 BOM History 데이터 생성
 * 다양한 변경 이력과 액션 유형을 포함한 샘플 데이터
 */
function initializeBOMHistories(): void {
  const currentDate = new Date();
  const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const historyDataList = [
    {
      id: 'bom-hist-001',
      bomId: 'bom-001',
      action: BOMHistoryAction.CREATE_BOM,
      targetId: 'bom-001',
      targetType: 'BOM' as const,
      userId: 'admin',
      userName: '관리자',
      timestamp: lastWeek,
      description: '갤럭시 S24 케이스 BOM 신규 생성',
      changedFields: [],
      beforeData: undefined,
      afterData: undefined
    },
    {
      id: 'bom-hist-002',
      bomId: 'bom-001',
      action: BOMHistoryAction.ADD_ITEM,
      targetId: 'bom-item-001',
      targetType: 'BOM_ITEM' as const,
      userId: 'admin',
      userName: '관리자',
      timestamp: new Date(lastWeek.getTime() + 60000), // 1분 후
      description: '실리콘 원료 구성품 추가',
      changedFields: [],
      beforeData: undefined,
      afterData: undefined
    },
    {
      id: 'bom-hist-003',
      bomId: 'bom-001',
      action: BOMHistoryAction.ADD_ITEM,
      targetId: 'bom-item-002',
      targetType: 'BOM_ITEM' as const,
      userId: 'admin',
      userName: '관리자',
      timestamp: new Date(lastWeek.getTime() + 120000), // 2분 후
      description: '플라스틱 펠릿 구성품 추가',
      changedFields: [],
      beforeData: undefined,
      afterData: undefined
    },
    {
      id: 'bom-hist-004',
      bomId: 'bom-001',
      action: BOMHistoryAction.UPDATE_ITEM,
      targetId: 'bom-item-001',
      targetType: 'BOM_ITEM' as const,
      userId: 'admin',
      userName: '관리자',
      timestamp: yesterday,
      description: '실리콘 원료 수량 조정',
      changedFields: [
        {
          fieldName: 'quantity',
          oldValue: '45.0',
          newValue: '50.0',
          fieldLabel: '수량'
        }
      ],
      beforeData: '45.0g',
      afterData: '50.0g'
    },
    {
      id: 'bom-hist-005',
      bomId: 'bom-002',
      action: BOMHistoryAction.CREATE_BOM,
      targetId: 'bom-002',
      targetType: 'BOM' as const,
      userId: 'manager',
      userName: '매니저',
      timestamp: lastWeek,
      description: '무선 충전기 BOM 신규 생성',
      changedFields: [],
      beforeData: undefined,
      afterData: undefined
    },
    {
      id: 'bom-hist-006',
      bomId: 'bom-002',
      action: BOMHistoryAction.ADD_ITEM,
      targetId: 'bom-item-003',
      targetType: 'BOM_ITEM' as const,
      userId: 'manager',
      userName: '매니저',
      timestamp: new Date(lastWeek.getTime() + 300000), // 5분 후
      description: '충전 코일 구성품 추가',
      changedFields: [],
      beforeData: undefined,
      afterData: undefined
    },
    {
      id: 'bom-hist-007',
      bomId: 'bom-003',
      action: BOMHistoryAction.DEACTIVATE_BOM,
      targetId: 'bom-003',
      targetType: 'BOM' as const,
      userId: 'manager',
      userName: '매니저',
      timestamp: yesterday,
      description: '블루투스 이어폰 BOM 단종으로 인한 비활성화',
      changedFields: [
        {
          fieldName: 'isActive',
          oldValue: 'true',
          newValue: 'false',
          fieldLabel: '활성 상태'
        }
      ],
      beforeData: '활성',
      afterData: '비활성'
    },
    {
      id: 'bom-hist-008',
      bomId: 'bom-004',
      action: BOMHistoryAction.CREATE_BOM,
      targetId: 'bom-004',
      targetType: 'BOM' as const,
      userId: 'manager',
      userName: '매니저',
      timestamp: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      description: '스마트워치 BOM 신규 생성',
      changedFields: [],
      beforeData: undefined,
      afterData: undefined
    },
    {
      id: 'bom-hist-009',
      bomId: 'bom-002',
      action: BOMHistoryAction.UPDATE_ITEM,
      targetId: 'bom-item-005',
      targetType: 'BOM_ITEM' as const,
      userId: 'manager',
      userName: '매니저',
      timestamp: currentDate,
      description: '배터리 팩 단가 업데이트',
      changedFields: [
        {
          fieldName: 'unitCost',
          oldValue: '23.0',
          newValue: '25.0',
          fieldLabel: '단가'
        }
      ],
      beforeData: '23.0원',
      afterData: '25.0원'
    },
    {
      id: 'bom-hist-010',
      bomId: 'bom-004',
      action: BOMHistoryAction.ADD_ITEM,
      targetId: 'bom-item-008',
      targetType: 'BOM_ITEM' as const,
      userId: 'manager',
      userName: '매니저',
      timestamp: currentDate,
      description: 'LCD 디스플레이 패널 구성품 추가',
      changedFields: [],
      beforeData: undefined,
      afterData: undefined
    }
  ];

  // 간소화된 BOM History 데이터 - 필수 매개변수만 사용
  bomHistories = [
    new BOMHistory(
      'bom-hist-001',
      new BOMId('bom-001'),
      BOMHistoryAction.CREATE_BOM,
      'BOM',
      'bom-001',
      [],
      'admin',
      '관리자',
      lastWeek,
      '갤럭시 S24 케이스 BOM 신규 생성'
    ),
    new BOMHistory(
      'bom-hist-002',
      new BOMId('bom-001'),
      BOMHistoryAction.ADD_ITEM,
      'BOM_ITEM',
      'bom-item-001',
      [],
      'admin',
      '관리자',
      new Date(lastWeek.getTime() + 60000),
      '실리콘 원료 구성품 추가'
    ),
    new BOMHistory(
      'bom-hist-003',
      new BOMId('bom-002'),
      BOMHistoryAction.CREATE_BOM,
      'BOM',
      'bom-002',
      [],
      'manager',
      '매니저',
      lastWeek,
      '무선 충전기 BOM 신규 생성'
    ),
    new BOMHistory(
      'bom-hist-004',
      new BOMId('bom-003'),
      BOMHistoryAction.DEACTIVATE_BOM,
      'BOM',
      'bom-003',
      [],
      'manager',
      '매니저',
      yesterday,
      '블루투스 이어폰 BOM 단종으로 인한 비활성화'
    ),
    new BOMHistory(
      'bom-hist-005',
      new BOMId('bom-004'),
      BOMHistoryAction.CREATE_BOM,
      'BOM',
      'bom-004',
      [],
      'manager',
      '매니저',
      new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      '스마트워치 BOM 신규 생성'
    )
  ];
}

/**
 * 초기화된 BOM과 BOM Item을 연결
 * - 각 BOM의 아이템 목록을 채워 트리 조회 시 데이터가 보이도록 함
 */
function linkItemsToBOMs(): void {
  // 모든 BOM의 기존 아이템을 비우고 다시 채움 (초기화 시점 보장)
  // BOM 엔티티는 불변 컬렉션을 반환하지만 addBOMItem 메서드로 추가 가능
  boms.forEach(bom => {
    const relatedItems = bomItems.filter(item => item.getBOMId().equals(bom.getId()));
    relatedItems.forEach(item => bom.addBOMItem(item));
  });
}

// 초기화 실행
initializeBOMs();
initializeBOMItems();
linkItemsToBOMs();
initializeBOMHistories();

// Export 모듈 - MockBOMData 네임스페이스
export const MockBOMData = {
  // === BOM 관련 함수들 ===
  
  /**
   * 모든 BOM 조회
   */
  getBOMs: (): BOM[] => [...boms],
  
  /**
   * ID로 특정 BOM 조회
   */
  getBOMById: (id: string): BOM | undefined => 
    boms.find(b => b.getId().getValue() === id),
  
  /**
   * 새 BOM 추가
   */
  addBOM: (bom: BOM): void => {
    boms.push(bom);
  },
  
  /**
   * 기존 BOM 업데이트
   */
  updateBOM: (index: number, bom: BOM): void => {
    if (index >= 0 && index < boms.length) {
      boms[index] = bom;
    }
  },
  
  /**
   * BOM 삭제
   */
  removeBOM: (index: number): void => {
    if (index >= 0 && index < boms.length) {
      boms.splice(index, 1);
    }
  },

  // === BOM Item 관련 함수들 ===
  
  /**
   * 모든 BOM Item 조회
   */
  getBOMItems: (): BOMItem[] => [...bomItems],
  
  /**
   * ID로 특정 BOM Item 조회
   */
  getBOMItemById: (id: string): BOMItem | undefined =>
    bomItems.find(item => item.getId().getValue() === id),
  
  /**
   * 새 BOM Item 추가
   */
  addBOMItem: (bomItem: BOMItem): void => {
    bomItems.push(bomItem);
  },
  
  /**
   * 기존 BOM Item 업데이트
   */
  updateBOMItem: (index: number, bomItem: BOMItem): void => {
    if (index >= 0 && index < bomItems.length) {
      bomItems[index] = bomItem;
    }
  },
  
  /**
   * BOM Item 삭제
   */
  removeBOMItem: (index: number): void => {
    if (index >= 0 && index < bomItems.length) {
      bomItems.splice(index, 1);
    }
  },

  // === BOM History 관련 함수들 ===
  
  /**
   * 모든 BOM History 조회
   */
  getBOMHistories: (): BOMHistory[] => [...bomHistories],
  
  /**
   * ID로 특정 BOM History 조회
   */
  getBOMHistoryById: (id: string): BOMHistory | undefined =>
    bomHistories.find(h => h.getId() === id),
  
  /**
   * 새 BOM History 추가
   */
  addBOMHistory: (history: BOMHistory): void => {
    bomHistories.push(history);
  },
  
  /**
   * 기존 BOM History 업데이트
   */
  updateBOMHistory: (index: number, history: BOMHistory): void => {
    if (index >= 0 && index < bomHistories.length) {
      bomHistories[index] = history;
    }
  },
  
  /**
   * BOM History 삭제
   */
  removeBOMHistory: (index: number): void => {
    if (index >= 0 && index < bomHistories.length) {
      bomHistories.splice(index, 1);
    }
  },

  // === 유틸리티 함수들 ===
  
  /**
   * 전체 데이터 초기화 (테스트용)
   */
  reset: (): void => {
    boms = [];
    bomItems = [];
    bomHistories = [];
    initializeBOMs();
    initializeBOMItems();
    initializeBOMHistories();
  },
  
  /**
   * 통계 정보 조회
   */
  getStatistics: () => ({
    totalBOMs: boms.length,
    activeBOMs: boms.filter(b => b.isCurrentlyActive()).length,
    totalBOMItems: bomItems.length,
    activeBOMItems: bomItems.filter(item => item.isCurrentlyActive()).length,
    totalHistories: bomHistories.length,
    recentHistories: bomHistories
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime())
      .slice(0, 5).length
  })
};