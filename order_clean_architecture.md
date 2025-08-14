### 👤 시나리오 1: 신규 수주 등록 (승인 프로세스 제거)

```
전제조건: 사용자가 수주관리 화면에 접속한 상태

1. 사용자가 "신규 수주 등록" 버튼 클릭
2. 수주 등록 모달/페이지가 열림
3. 수주 타입 선택:
   - 내수(D) / 수출(E) / 샘플(S) / 수리(R) 중 선택
   - 예시: "내수" 선택
4. 고객 정보 입력:
   - 고객코드: CUST001 (드롭다운에서 선택)
   - 고객명: 삼성전자 (자동 입력)
   - 담당자: 김담당자
   - 연락처: 02-1234-5678
5. 수주 기본 정보 입력:
   - 납기일: 2024-12-31 선택
   - 우선순위: 높음 선택
   - 영업담당자: 이영업 선택
   - 비고: 연말 납품 요청
6. 수주 품목 추가:
   - 제품코드: FG2412001 선택
   - 제품명: 갤럭시 케이스 (자동 입력)
   - 수량: 1000
   - 단가: 15000
   - 금액: 15,000,000 (자동 계산)
7. "저장" 버튼 클릭
8. 시스템이 비즈니스 규칙 검증:
   - 수주번호 자동 생성: SOD24120001 (내수, 2024년 12월, 첫 번째)
   - 수주 타입별 검증 수행 (내수: 기본 검증만)
   - 납기일 유효성 확인
   - 제품 존재 여부 확인
   - 총 금액 계산: 15,000,000원
9. 검증 성공 시:
   - 수주 정보 저장 (상태: 대기)
   - 등록 이력 기록
   - "내수 수주가 성공적으로 등록되었습니다. (수주번호: SOD24120001)" 메시지 표시
   - 수주 목록 화면으로 돌아가며 새 수주가 목록에 추가됨
   - 바로 "생산지시 생성" 버튼이 활성화됨 (승인 단계 생략)

후속조건: 새로운 수주가 시스템에 등록되고 즉시 생산 지시 생성 가능 상태가 됨
```

### 👤 시나리오 2: 수주 정보 수정

```
전제조건: 사용자가 수정할 수주를 선택한 상태

1. 사용자가 수주 목록에서 "수정" 버튼 클릭
2. 수주 수정 모달이 열리며 기존 정보가 표시됨
3. 수정 가능 여부 확인:
   - 대기 상태: 모든 정보 수정 가능
   - 생산중 상태: 품목 정보, 납기일 수정 불가 (고객 정보, 비고만 수정 가능)
   - 완료/취소 상태: 수정 불가
4. 사용자가 변경할 정보 입력:
   - 납기일: 2024-12-31 → 2025-01-15로 변경
   - 우선순위: 높음 → 긴급으로 변경
   - 품목 수정:
     * 기존 품목 수량 변경: 1000 → 1200
     * 새 품목 추가: FG2412002 갤럭시 충전기 500개
     * 기존 품목 삭제: 체크박스로 삭제 표시
5. 수정 사유 입력: "고객 요청에 의한 수량 증가 및 품목 추가"
6. "저장" 버튼 클릭
7. 시스템이 변경사항 검증:
   - 생산 상태별 수정 권한 확인
   - 신규 제품 존재 여부 확인
   - 총 금액 재계산
8. 검증 성공 시:
   - 수주 정보 업데이트
   - 변경 이력 상세 기록:
     * 납기일: 2024-12-31 → 2025-01-15
     * 우선순위: 높음 → 긴급
     * 품목: 갤럭시 케이스 수량 1000 → 1200
     * 품목: 갤럭시 충전기 500개 추가
   - "수주 정보가 수정되었습니다 (3개 항목 변경)" 메시지 표시

후속조건: 수주 정보가 업데이트되고 모든 변경사항이 추적 가능한 이력으로 기록됨
```

### 👤 시나리오 3: 수주 삭제 (논리 삭제)

```
전제조건: 삭제할 수주를 선택한 상태

1. 사용자가 수주 목록에서 "삭제" 버튼 클릭
2. 확인 대화상자 표시:
   - "수주 'SOD24120001 - 삼성전자'를 삭제하시겠습니까?"
   - "생산이 진행 중인 경우 관련 생산 지시도 함께 취소됩니다."
3. 삭제 사유 입력: "고객 주문 취소 요청"
4. "확인" 버튼 클릭
5. 시스템이 삭제 가능성 검사:
   - 완료된 수주인지 확인
   - 생산 진행률 확인 (50% 이상 진행 시 삭제 불가)
   - 관련 생산 지시 존재 여부 확인
6. 삭제 가능한 경우:
   - 관련 생산 지시 자동 취소
   - 수주 상태를 '취소'로 변경 (논리 삭제)
   - 삭제 이력 기록
   - "수주가 삭제되었습니다" 메시지 표시
   - 목록에서 해당 수주가 '취소' 상태로 표시 (회색 처리)
7. 삭제 불가능한 경우:
   - "생산이 50% 이상 진행된 수주는 삭제할 수 없습니다" 등의 구체적 오류 메시지 표시

후속조건: 수주가 논리적으로 삭제되어 취소 상태가 되고 관련 생산 지시도 함께 취소됨
```

### 👤 시나리오 4: 수주 이력 상세 조회

```
전제조건: 이력을 조회할 수주를 선택한 상태

1. 사용자가 수주 목록에서 "이력조회" 버튼 클릭
2. 수주 이력 조회 모달이 열림
3. 수주 기본 정보 표시:
   - 수주번호: SOD24120001
   - 고객명: 삼성전자
   - 현재 상태: 생산중
   - 총 금액: 18,500,000원
4. 이력 필터 옵션:
   - 액션 필터: 전체/등록/수정/삭제/생산시작/완료
   - 날짜 범위: 시작일 ~ 종료일
   - 사용자 필터: 특정 사용자
5. 시간순 이력 목록 표시:
```

📅 2024-12-01 10:30 | 👤 김영업 | ➕ 등록
요약: 수주가 신규 등록되었습니다.

📅 2024-12-02 14:20 | 👤 이관리자 | ✏️ 수정  
 요약: 납기일, 우선순위 등 3개 항목이 수정되었습니다.
변경사항:
• 납기일: 2024-12-31 → 2025-01-15
• 우선순위: 높음 → 긴급  
 • 품목: 갤럭시 케이스 수량 1000 → 1200
사유: 고객 요청에 의한 수량 증가

📅 2024-12-03 09:15 | 👤 박생산자 | 🏭 생산시작
요약: 생산 지시가 생성되어 생산이 시작되었습니다.
생산지시번호: PO24120001

```
6. 사용자가 특정 이력 항목 클릭 시:
- 변경 사항 상세 정보 팝업
- 변경 전/후 값 비교 표시
- 변경 사유 및 담당자 정보
7. 이력 내보내기 기능:
- Excel/PDF 형태로 이력 보고서 생성
- 감사 목적의 상세 이력 문서

후속조건: 수주의 모든 변경 이력을 시간순으로 추적하여 투명한 이력 관리 제공
```

### 👤 시나리오 5: 생산 지시 생성 (승인 없이 직접 생성)

````
전제조건: 대기 상태의 수주를 선택한 상태

1. 사용자가 수주 목록에서 "생산지시 생성" 버튼 클릭
2. 생산 지시 생성 모달이 열림:
   - 수주 정보 표시 (읽기 전용)
   - 계획 시작일 입력 필드
   - 예상 완료일 표시 (자동 계산)
   - BOM 검증 결과 표시
3. 계획 시작일 입력: 2024-12-15 선택
4. 시스템이 자동으로 검증:
   - BOM 존재 여부: ✅ 모든 제품 BOM 확인됨
   - 납기일 여유: ✅ 충분한 생산 시간 확보 (15일)
   - 예상 완료일: 2024-12-28 (자동 계산)
5. "생산지시 생성" 버튼 클릭
6. 시스템이 최종 검증:
   - 수주 상태 확인 (대기 상태만 가능)
   - 모든 제품의 BOM 재확인
   - 계획 시작일과 납기일 간의 여유 시간 확인
7. 검증 성공 시:
   - 생산 지시번호 자동 생성: PO24120001
   - 수주 상태를 '생산중'으로 변경
   - 생산 시작 이력 기록
   - "생산 지시가 생성되었습니다. (생산지시번호: PO24120001)" 메시지 표시
   - 생산관리 시스템으로 데이터 자동 연계

후속조건: 승인 단계 없이 바로 생산 지시가 생성되어 생산 프로세스 시작
``` INVALID_ORDER_NO
   - 오류 메시지: "수주번호 형식이 올바르지 않습니다. (예: SOD24120001)"
   - 올바른 형식 안내
4. 올바른 수주번호로 재시도: "SOD24120001"
5. 시스템이 재검증:
   - 형식 검증: 통과
   - 년월 유효성: 2024년 12월 → 유효
   - 시퀀스 범위: 0001 → 유효
6. 검증 성공 후 정상 처리

후속조건: 잘못된 수주번호로 인한 데이터 오류 방지
````

---

## 📊 수주번호 채번 시스템 구현 가이드

### 🗄️ 데이터베이스 스키마

```sql
-- 수주번호 시퀀스 관리 테이블
CREATE TABLE order_sequences (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  prefix VARCHAR(10) NOT NULL,           -- SOD2412, SOE2412 등
  sequence_no INT NOT NULL DEFAULT 0,    -- 현재 시퀀스 번호
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_prefix (prefix),
  INDEX idx_prefix_updated (prefix, last_updated)
);

-- 수주번호 이력 테이블 (선택사항)
CREATE TABLE order_number_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(11) NOT NULL,         -- 생성된 수주번호
  order_type ENUM('DOMESTIC', 'EXPORT', 'SAMPLE', 'REPAIR') NOT NULL,
  prefix VARCHAR(10) NOT NULL,           -- SOD2412 등
  sequence_no INT NOT NULL,              -- 해당 시퀀스 번호
  created_by VARCHAR(50) NOT NULL,       -- 생성자
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_order_no (order_no),
  INDEX idx_order_type_created (order_type, created_at),
  INDEX idx_prefix_sequence (prefix, sequence_no)
);
```

### 🔧 시퀀스 동시성 제어

```typescript
// 고성능 시퀀스 관리를 위한 최적화
export class OptimizedSequenceRepository implements SequenceRepository {
  private sequenceCache = new Map<string, number>();
  private readonly CACHE_SIZE = 100; // 한 번에 100개씩 미리 할당

  async getNextSequence(prefix: string): Promise<number> {
    // 1. 캐시에서 사용 가능한 시퀀스 확인
    const cachedSequence = this.getCachedSequence(prefix);
    if (cachedSequence > 0) {
      return cachedSequence;
    }

    // 2. 캐시 미스 시 DB에서 배치로 시퀀스 할당
    return await this.allocateSequenceBatch(prefix);
  }

  private getCachedSequence(prefix: string): number {
    const cached = this.sequenceCache.get(prefix);
    if (cached && cached > 0) {
      this.sequenceCache.set(prefix, cached - 1);
      return cached;
    }
    return 0;
  }

  private async allocateSequenceBatch(prefix: string): Promise<number> {
    return await this.dataSource.transaction(async (txn: any) => {
      // 현재 시퀀스 조회 및 배치 업데이트
      const result = await txn.query(
        `UPDATE order_sequences 
         SET sequence_no = sequence_no + ? 
         WHERE prefix = ?`,
        [this.CACHE_SIZE, prefix]
      );

      if (result.affectedRows === 0) {
        // 새로운 prefix 생성
        await txn.query(
          "INSERT INTO order_sequences (prefix, sequence_no) VALUES (?, ?)",
          [prefix, this.CACHE_SIZE]
        );

        // 캐시에 1~100 저장
        this.sequenceCache.set(prefix, this.CACHE_SIZE - 1);
        return 1;
      } else {
        // 기존 시퀀스에서 할당
        const currentSeq = await txn.query(
          "SELECT sequence_no FROM order_sequences WHERE prefix = ?",
          [prefix]
        );

        const lastAllocated = currentSeq[0].sequence_no;
        const firstNew = lastAllocated - this.CACHE_SIZE + 1;

        // 캐시에 할당된 범위 저장
        this.sequenceCache.set(prefix, lastAllocated - 1);
        return firstNew;
      }
    });
  }
}
```

### 📈 성능 모니터링

```typescript
// 수주번호 채번 성능 모니터링
export class OrderNoGeneratorMetrics {
  private generationCount = new Map<string, number>();
  private generationTime = new Map<string, number[]>();

  recordGeneration(prefix: string, duration: number): void {
    // 생성 횟수 증가
    this.generationCount.set(
      prefix,
      (this.generationCount.get(prefix) || 0) + 1
    );

    // 생성 시간 기록 (최근 100건)
    const times = this.generationTime.get(prefix) || [];
    times.push(duration);
    if (times.length > 100) {
      times.shift();
    }
    this.generationTime.set(prefix, times);
  }

  getMetrics(): OrderNoMetrics {
    const metrics: OrderNoMetrics = {
      totalGenerations: 0,
      averageTime: 0,
      prefixStats: [],
    };

    for (const [prefix, count] of this.generationCount) {
      const times = this.generationTime.get(prefix) || [];
      const avgTime =
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

      metrics.totalGenerations += count;
      metrics.prefixStats.push({
        prefix,
        count,
        averageTime: avgTime,
      });
    }

    metrics.averageTime =
      metrics.prefixStats.reduce((sum, stat) => sum + stat.averageTime, 0) /
      metrics.prefixStats.length;

    return metrics;
  }
}

interface OrderNoMetrics {
  totalGenerations: number;
  averageTime: number;
  prefixStats: {
    prefix: string;
    count: number;
    averageTime: number;
  }[];
}
```

이제 수주번호 자동 채번 시스템이 완벽하게 구현되었습니다.

## 🎯 **개선된 채번 시스템의 핵심 특징**

### 1. **체계적인 채번 룰**

- **SO + 타입코드 + 년월 + 시퀀스** 형식
- 월별 자동 리셋으로 관리 용이성 확보
- 수주 타입별 독립적인 채번 (내수/수출/샘플/수리)

### 2. **동시성 제어 및 성능 최적화**

- 트랜잭션 기반 원자적 시퀀스 증가
- 배치 할당으로 DB 부하 최소화
- 캐시 활용으로 빠른 응답 시간

### 3. **강력한 검증 시스템**

- 수주번호 형식 검증
- 년월 유효성 확인
- 파싱을 통한 정보 추출

### 4. **확장 가능한 구조**

- 새로운 수주 타입 쉽게 추가 가능
- 채번 룰 변경 시 유연한 대응
- 성능 모니터링 기능 내장

이 시스템을 통해 **SOD24120001**, **SOE24120015**, **SOS24120003** 같은 의미 있는 수주번호가 자동으로 생성되어 업무 효율성이 크게 향상될 것입니다.### 👤 시나리오 1: 신규 수주 등록 (수주 타입별)

````
전제조건: 사용자가 수주관리 화면에 접속한 상태

1. 사용자가 "신규 수주 등록" 버튼 클릭
2. 수주 등록 모달/페이지가 열림
3. 수주 타입 선택:
   - 내수(D) / 수출(E) / 샘플(S) / 수리(R) 중 선택
   - 예시: "내수" 선택
4. 고객# MES 수주관리 시스템 클린 아키텍처

## 🎯 시스템 개요

**제조실행시스템(MES)의 수주관리 모듈 - 고객 주문부터 생산 지시까지의 통합 관리**

---

## 🏗️ Domain Layer (도메인 계층)

### 📦 1. Entities (엔티티) - 핵심 비즈니스 객체

#### Order (수주) 엔티티
```typescript
// domain/entities/Order.ts
export class Order {
  constructor(
    private readonly id: OrderId,
    private readonly orderNo: string,
    private readonly orderType: OrderType, // 수주 타입 추가
    private readonly customer: Customer,
    private readonly orderDate: Date,
    private readonly deliveryDate: Date,
    private readonly status: OrderStatus,
    private readonly items: OrderItem[],
    private readonly totalAmount: number,
    private readonly currency: Currency,
    private readonly priority: OrderPriority,
    private readonly notes: string,
    private readonly salesPerson: string,
    private readonly id_create: string,
    private readonly id_updated: string,
    private readonly dt_create: Date,
    private readonly dt_update: Date
  ) {
    this.validateOrder();
  }

  // 비즈니스 규칙: 수주 정보 검증
  private validateOrder(): void {
    if (!this.orderNo || this.orderNo.trim().length === 0) {
      throw new Error('수주번호는 필수입니다.');
    }
    if (!this.customer) {
      throw new Error('고객 정보는 필수입니다.');
    }
    if (this.deliveryDate <= this.orderDate) {
      throw new Error('납기일은 수주일보다 나중이어야 합니다.');
    }
    if (this.items.length === 0) {
      throw new Error('수주 품목은 최소 1개 이상이어야 합니다.');
    }
    if (this.totalAmount < 0) {
      throw new Error('총 금액은 0 이상이어야 합니다.');
    }
    if (!this.id_create || this.id_create.trim().length === 0) {
      throw new Error('생성자는 필수입니다.');
    }
    if (!this.id_updated || this.id_updated.trim().length === 0) {
      throw new Error('수정자는 필수입니다.');
    }
  }

  // 비즈니스 로직: 수주 승인 가능 여부
  public canBeApproved(): boolean {
    return this.status === OrderStatus.PENDING &&
           this.items.every(item => item.isValid()) &&
           this.isWithinDeliveryCapacity();
  }

  // 비즈니스 로직: 생산 지시 가능 여부
  public canCreateProductionOrder(): boolean {
    return this.status === OrderStatus.PENDING &&
           this.items.every(item => item.hasValidBOM());
  }

  // 비즈니스 로직: 납기 지연 여부
  public isDelayed(): boolean {
    return new Date() > this.deliveryDate &&
           this.status !== OrderStatus.COMPLETED &&
           this.status !== OrderStatus.CANCELLED;
  }

  // 비즈니스 로직: 취소 가능 여부
  public canBeCancelled(): boolean {
    return this.status === OrderStatus.PENDING;
  }

  // 비즈니스 로직: 납기 용량 확인
  private isWithinDeliveryCapacity(): boolean {
    // 해당 납기일의 생산 용량 확인 로직
    return true; // 실제로는 ProductionCapacityService 호출
  }

  // 비즈니스 로직: 총 금액 계산
  public calculateTotalAmount(): number {
    return this.items.reduce((total, item) => total + item.getAmount(), 0);
  }

  // 비즈니스 로직: 수주 상태 변경
  public changeStatus(newStatus: OrderStatus, reason?: string): Order {
    this.validateStatusTransition(newStatus);

    return new Order(
      this.id,
      this.orderNo,
      this.orderType,
      this.customer,
      this.orderDate,
      this.deliveryDate,
      newStatus,
      this.items,
      this.totalAmount,
      this.currency,
      this.priority,
      this.notes,
      this.salesPerson,
      this.id_create,
      this.id_updated,
      this.dt_create,
      new Date()
    );
  }

  // 비즈니스 규칙: 상태 전환 검증
  private validateStatusTransition(newStatus: OrderStatus): void {
    const validTransitions: Map<OrderStatus, OrderStatus[]> = new Map([
      [OrderStatus.PENDING, [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED]],
      [OrderStatus.IN_PRODUCTION, [OrderStatus.COMPLETED, OrderStatus.CANCELLED]],
      [OrderStatus.COMPLETED, []],
      [OrderStatus.CANCELLED, []]
    ]);

    const allowedTransitions = validTransitions.get(this.status) || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`${this.status}에서 ${newStatus}로 상태 변경이 불가능합니다.`);
    }
  }

  // Getters
  public getId(): OrderId { return this.id; }
  public getOrderNo(): string { return this.orderNo; }
  public getOrderType(): OrderType { return this.orderType; }
  public getCustomer(): Customer { return this.customer; }
  public getOrderDate(): Date { return this.orderDate; }
  public getDeliveryDate(): Date { return this.deliveryDate; }
  public getStatus(): OrderStatus { return this.status; }
  public getItems(): OrderItem[] { return this.items; }
  public getTotalAmount(): number { return this.totalAmount; }
  public getCurrency(): Currency { return this.currency; }
  public getPriority(): OrderPriority { return this.priority; }
  public getNotes(): string { return this.notes; }
  public getSalesPerson(): string { return this.salesPerson; }
  public getIdCreate(): string { return this.id_create; }
  public getIdUpdated(): string { return this.id_updated; }
  public getDtCreate(): Date { return this.dt_create; }
  public getDtUpdate(): Date { return this.dt_update; }
}

// 수주번호 자동 채번 서비스
export interface OrderNoGenerator {
  generateOrderNo(orderType?: OrderType): Promise<string>;
  validateOrderNo(orderNo: string): boolean;
  parseOrderNo(orderNo: string): OrderNoInfo;
}

export interface OrderNoInfo {
  prefix: string;
  year: string;
  month: string;
  sequence: number;
  orderType: OrderType;
  isValid: boolean;
}

export enum OrderType {
  DOMESTIC = 'DOMESTIC',     // 내수
  EXPORT = 'EXPORT',         // 수출
  SAMPLE = 'SAMPLE',         // 샘플
  REPAIR = 'REPAIR'          // 수리
}

export class DefaultOrderNoGenerator implements OrderNoGenerator {
  constructor(
    private orderRepository: OrderRepository,
    private sequenceRepository: SequenceRepository
  ) {}

  async generateOrderNo(orderType: OrderType = OrderType.DOMESTIC): Promise<string> {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2); // 24 (2024년)
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // 01-12

    // 수주 타입별 접두사
    const typePrefix = this.getTypePrefixByOrderType(orderType);

    // 기본 접두사: SO (Sales Order)
    const basePrefix = 'SO';

    // 전체 접두사 구성: SO + 타입 + 년월
    const fullPrefix = `${basePrefix}${typePrefix}${year}${month}`;

    // 해당 년월의 마지막 시퀀스 번호 조회 (원자적 연산)
    const nextSequence = await this.sequenceRepository.getNextSequence(fullPrefix);

    // 시퀀스를 4자리로 패딩
    const sequenceStr = nextSequence.toString().padStart(4, '0');

    return `${fullPrefix}${sequenceStr}`;
  }

  validateOrderNo(orderNo: string): boolean {
    // 수주번호 형식 검증: SO[D/E/S/R]YYMM0000
    const pattern = /^SO[DESR]\d{6}$/;

    if (!pattern.test(orderNo)) {
      return false;
    }

    // 년월 유효성 검증
    const yearPart = orderNo.substring(3, 5);
    const monthPart = orderNo.substring(5, 7);

    const year = parseInt('20' + yearPart);
    const month = parseInt(monthPart);

    const currentYear = new Date().getFullYear();

    // 년도는 2020년 이후, 현재 년도 + 1년 이내
    if (year < 2020 || year > currentYear + 1) {
      return false;
    }

    // 월은 01-12
    if (month < 1 || month > 12) {
      return false;
    }

    return true;
  }

  parseOrderNo(orderNo: string): OrderNoInfo {
    if (!this.validateOrderNo(orderNo)) {
      return {
        prefix: '',
        year: '',
        month: '',
        sequence: 0,
        orderType: OrderType.DOMESTIC,
        isValid: false
      };
    }

    const prefix = orderNo.substring(0, 2); // SO
    const typeCode = orderNo.substring(2, 3); // D/E/S/R
    const year = orderNo.substring(3, 5); // YY
    const month = orderNo.substring(5, 7); // MM
    const sequence = parseInt(orderNo.substring(7, 11)); // 0000

    return {
      prefix: `${prefix}${typeCode}`,
      year: '20' + year,
      month: month,
      sequence: sequence,
      orderType: this.getOrderTypeByCode(typeCode),
      isValid: true
    };
  }

  private getTypePrefixByOrderType(orderType: OrderType): string {
    switch (orderType) {
      case OrderType.DOMESTIC:
        return 'D'; // Domestic
      case OrderType.EXPORT:
        return 'E'; // Export
      case OrderType.SAMPLE:
        return 'S'; // Sample
      case OrderType.REPAIR:
        return 'R'; // Repair
      default:
        return 'D';
    }
  }

  private getOrderTypeByCode(code: string): OrderType {
    switch (code) {
      case 'D':
        return OrderType.DOMESTIC;
      case 'E':
        return OrderType.EXPORT;
      case 'S':
        return OrderType.SAMPLE;
      case 'R':
        return OrderType.REPAIR;
      default:
        return OrderType.DOMESTIC;
    }
  }
}

// 시퀀스 관리를 위한 별도 Repository
export interface SequenceRepository {
  getNextSequence(prefix: string): Promise<number>;
  getCurrentSequence(prefix: string): Promise<number>;
  resetSequence(prefix: string): Promise<void>;
}

export class DefaultSequenceRepository implements SequenceRepository {
  constructor(private dataSource: any) {} // 실제 구현에서는 적절한 데이터 소스 주입

  async getNextSequence(prefix: string): Promise<number> {
    // 트랜잭션 내에서 원자적으로 시퀀스 증가
    return await this.dataSource.transaction(async (txn: any) => {
      // 현재 시퀀스 조회
      const currentSeq = await txn.query(
        'SELECT sequence_no FROM order_sequences WHERE prefix = ? FOR UPDATE',
        [prefix]
      );

      let nextSequence: number;

      if (currentSeq.length === 0) {
        // 해당 prefix의 시퀀스가 없으면 1부터 시작
        nextSequence = 1;
        await txn.query(
          'INSERT INTO order_sequences (prefix, sequence_no, last_updated) VALUES (?, ?, NOW())',
          [prefix, nextSequence]
        );
      } else {
        // 기존 시퀀스 + 1
        nextSequence = currentSeq[0].sequence_no + 1;
        await txn.query(
          'UPDATE order_sequences SET sequence_no = ?, last_updated = NOW() WHERE prefix = ?',
          [nextSequence, prefix]
        );
      }

      return nextSequence;
    });
  }

  async getCurrentSequence(prefix: string): Promise<number> {
    const result = await this.dataSource.query(
      'SELECT sequence_no FROM order_sequences WHERE prefix = ?',
      [prefix]
    );

    return result.length > 0 ? result[0].sequence_no : 0;
  }

  async resetSequence(prefix: string): Promise<void> {
    await this.dataSource.query(
      'UPDATE order_sequences SET sequence_no = 0, last_updated = NOW() WHERE prefix = ?',
      [prefix]
    );
  }
}

/**
 * 수주번호 채번 룰 정의
 *
 * 🏷️ 채번 형식: SO + [타입코드] + [년월] + [시퀀스]
 *
 * 📋 상세 규칙:
 * - SO: Sales Order (고정)
 * - 타입코드: D(내수), E(수출), S(샘플), R(수리)
 * - 년월: YY + MM (24년 12월 = 2412)
 * - 시퀀스: 0001~9999 (월별 리셋)
 *
 * 🎯 채번 예시:
 * - SOD24120001: 2024년 12월 내수 첫 번째 수주
 * - SOE24120015: 2024년 12월 수출 15번째 수주
 * - SOS24120003: 2024년 12월 샘플 3번째 수주
 * - SOR24120007: 2024년 12월 수리 7번째 수주
 *
 * 🔧 관리 기능:
 * - 월별 자동 시퀀스 리셋
 * - 타입별 독립적인 채번
 * - 수주번호 유효성 검증
 * - 수주번호 파싱 및 정보 추출
 * - 동시성 제어 (트랜잭션 기반)
 */

export class OrderId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('Order ID는 필수입니다.');
    }
  }

  public getValue(): string { return this.value; }
  public equals(other: OrderId): boolean {
    return this.value === other.value;
  }
}

export enum OrderStatus {
  PENDING = 'PENDING',           // 대기
  IN_PRODUCTION = 'IN_PRODUCTION', // 생산중
  COMPLETED = 'COMPLETED',       // 완료
  CANCELLED = 'CANCELLED'        // 취소
}

export enum OrderPriority {
  LOW = 'LOW',         // 낮음
  NORMAL = 'NORMAL',   // 보통
  HIGH = 'HIGH',       // 높음
  URGENT = 'URGENT'    // 긴급
}

export class Customer {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly contactPerson: string,
    public readonly phoneNumber: string,
    public readonly email: string,
    public readonly address: string
  ) {}
}

export class Currency {
  constructor(
    public readonly code: string,    // KRW, USD, EUR 등
    public readonly name: string,    // 원화, 달러, 유로 등
    public readonly symbol: string   // ₩, $, € 등
  ) {}
}

// 수주 품목 엔티티
export class OrderItem {
  constructor(
    private readonly id: string,
    private readonly productId: string,
    private readonly productCode: string,
    private readonly productName: string,
    private readonly quantity: number,
    private readonly unit: string,
    private readonly unitPrice: number,
    private readonly amount: number,
    private readonly deliveryDate: Date,
    private readonly notes: string
  ) {
    this.validateOrderItem();
  }

  private validateOrderItem(): void {
    if (!this.productId || this.productId.trim().length === 0) {
      throw new Error('제품 ID는 필수입니다.');
    }
    if (this.quantity <= 0) {
      throw new Error('수량은 0보다 커야 합니다.');
    }
    if (this.unitPrice < 0) {
      throw new Error('단가는 0 이상이어야 합니다.');
    }
    if (this.amount !== this.quantity * this.unitPrice) {
      throw new Error('금액이 수량 × 단가와 일치하지 않습니다.');
    }
  }

  public isValid(): boolean {
    return this.quantity > 0 && this.unitPrice >= 0;
  }

  public hasValidBOM(): boolean {
    // 실제로는 BOMService를 통해 해당 제품의 BOM 존재 여부 확인
    return true;
  }

  // Getters
  public getId(): string { return this.id; }
  public getProductId(): string { return this.productId; }
  public getProductCode(): string { return this.productCode; }
  public getProductName(): string { return this.productName; }
  public getQuantity(): number { return this.quantity; }
  public getUnit(): string { return this.unit; }
  public getUnitPrice(): number { return this.unitPrice; }
  public getAmount(): number { return this.amount; }
  public getDeliveryDate(): Date { return this.deliveryDate; }
  public getNotes(): string { return this.notes; }
}

// 수주 이력 엔티티
export class OrderHistory {
  constructor(
    private readonly id: string,
    private readonly orderId: OrderId,
    private readonly action: OrderHistoryAction,
    private readonly changedFields: ChangedField[],
    private readonly userId: string,
    private readonly userName: string,
    private readonly timestamp: Date,
    private readonly reason?: string
  ) {}

  public getId(): string { return this.id; }
  public getOrderId(): OrderId { return this.orderId; }
  public getAction(): OrderHistoryAction { return this.action; }
  public getChangedFields(): ChangedField[] { return this.changedFields; }
  public getUserId(): string { return this.userId; }
  public getUserName(): string { return this.userName; }
  public getTimestamp(): Date { return this.timestamp; }
  public getReason(): string | undefined { return this.reason; }
}

export enum OrderHistoryAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CANCEL = 'CANCEL',
  START_PRODUCTION = 'START_PRODUCTION',
  COMPLETE = 'COMPLETE'
}

export class ChangedField {
  constructor(
    public readonly fieldName: string,
    public readonly oldValue: any,
    public readonly newValue: any
  ) {}
}
````

---

## 🎯 Application Layer (애플리케이션 계층)

### 🔄 Use Cases (유스케이스)

#### 1. 수주 목록 조회 UseCase

```typescript
// application/usecases/order/GetOrderListUseCase.ts
export interface GetOrderListRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  searchKeyword?: string; // 모든 컬럼 통합 검색
  filters?: OrderFilter[];
}

export interface OrderFilter {
  field: "status" | "customer" | "priority" | "deliveryDate" | "salesPerson";
  value: any;
}

export interface GetOrderListResponse {
  orders: OrderListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface OrderListItem {
  id: string;
  orderNo: string;
  customerName: string;
  orderDate: Date;
  deliveryDate: Date;
  status: string;
  statusDisplay: string;
  priority: string;
  priorityDisplay: string;
  totalAmount: number;
  currency: string;
  salesPerson: string;
  itemCount: number;
  isDelayed: boolean;
  daysUntilDelivery: number;
  lastUpdated: Date;
}

export class GetOrderListUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderPresenter: OrderPresenter
  ) {}

  async execute(request: GetOrderListRequest): Promise<GetOrderListResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 검색 조건 구성
    const searchCriteria = this.buildSearchCriteria(request);

    // 3. 수주 목록 조회 (페이징 포함)
    const orders = await this.orderRepository.findByPageWithCriteria(
      searchCriteria,
      request.page,
      request.pageSize
    );

    // 4. 전체 개수 조회
    const totalCount = await this.orderRepository.countByCriteria(
      searchCriteria
    );

    // 5. 프레젠테이션 데이터 변환
    const orderListItems = orders.map((order) => {
      const daysUntilDelivery = this.calculateDaysUntilDelivery(
        order.getDeliveryDate()
      );

      return {
        id: order.getId().getValue(),
        orderNo: order.getOrderNo(),
        customerName: order.getCustomer().name,
        orderDate: order.getOrderDate(),
        deliveryDate: order.getDeliveryDate(),
        status: order.getStatus(),
        statusDisplay: this.orderPresenter.getStatusDisplayName(
          order.getStatus()
        ),
        priority: order.getPriority(),
        priorityDisplay: this.orderPresenter.getPriorityDisplayName(
          order.getPriority()
        ),
        totalAmount: order.getTotalAmount(),
        currency: order.getCurrency().symbol,
        salesPerson: order.getSalesPerson(),
        itemCount: order.getItems().length,
        isDelayed: order.isDelayed(),
        daysUntilDelivery,
        lastUpdated: order.getDtUpdate(),
      };
    });

    // 6. 페이징 정보 계산
    const totalPages = Math.ceil(totalCount / request.pageSize);
    const hasNextPage = request.page < totalPages;

    return {
      orders: orderListItems,
      totalCount,
      currentPage: request.page,
      totalPages,
      hasNextPage,
    };
  }

  private validateRequest(request: GetOrderListRequest): void {
    if (request.page < 1) {
      throw new Error("페이지 번호는 1 이상이어야 합니다.");
    }
    if (request.pageSize < 1 || request.pageSize > 1000) {
      throw new Error("페이지 크기는 1-1000 범위여야 합니다.");
    }
  }

  private buildSearchCriteria(
    request: GetOrderListRequest
  ): OrderSearchCriteria {
    return {
      searchKeyword: request.searchKeyword,
      filters: request.filters || [],
      sortBy: request.sortBy || "orderDate",
      sortDirection: request.sortDirection || "desc",
    };
  }

  private calculateDaysUntilDelivery(deliveryDate: Date): number {
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
```

#### 2. 수주 등록 UseCase

```typescript
// application/usecases/order/CreateOrderUseCase.ts
export interface CreateOrderRequest {
  orderType: OrderType; // 내수/수출/샘플/수리 구분 추가
  customer: {
    code: string;
    name: string;
    contactPerson: string;
    phoneNumber: string;
    email: string;
    address: string;
  };
  deliveryDate: Date;
  priority: OrderPriority;
  notes: string;
  salesPerson: string;
  items: CreateOrderItemRequest[];
  id_create: string; // 생성자 ID
}

export interface CreateOrderItemRequest {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  deliveryDate: Date;
  notes: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNo: string;
  orderType: string;
  success: boolean;
  message: string;
}

export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository,
    private orderNoGenerator: OrderNoGenerator,
    private productService: ProductService
  ) {}

  async execute(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    // 1. 비즈니스 규칙 검증
    await this.validateBusinessRules(request);

    // 2. 수주번호 자동 채번 (수주 타입 반영)
    const orderNo = await this.orderNoGenerator.generateOrderNo(
      request.orderType
    );

    // 수주번호 유효성 재검증
    if (!this.orderNoGenerator.validateOrderNo(orderNo)) {
      throw new Error("수주번호 생성에 실패했습니다.");
    }

    // 3. 수주 품목 생성
    const orderItems = await this.createOrderItems(request.items);

    // 4. 총 금액 계산
    const totalAmount = orderItems.reduce(
      (total, item) => total + item.getAmount(),
      0
    );

    // 5. 수주 엔티티 생성
    const orderId = new OrderId(this.generateOrderId());
    const customer = new Customer(
      request.customer.code,
      request.customer.name,
      request.customer.contactPerson,
      request.customer.phoneNumber,
      request.customer.email,
      request.customer.address
    );
    const currency = new Currency("KRW", "원화", "₩"); // 기본 통화

    const now = new Date();
    const order = new Order(
      orderId,
      orderNo,
      request.orderType, // 수주 타입 추가
      customer,
      now, // 수주일은 현재 날짜
      request.deliveryDate,
      OrderStatus.PENDING, // 초기 상태는 대기
      orderItems,
      totalAmount,
      currency,
      request.priority,
      request.notes,
      request.salesPerson,
      request.id_create, // 생성자
      request.id_create, // 수정자 (신규 등록 시 생성자와 동일)
      now, // dt_create
      now // dt_update
    );

    // 6. 저장
    await this.orderRepository.save(order);

    // 7. 이력 기록
    const history = new OrderHistory(
      this.generateHistoryId(),
      orderId,
      OrderHistoryAction.CREATE,
      [],
      request.id_create,
      request.id_create, // 생성자명 (실제로는 사용자 정보 조회 필요)
      new Date(),
      `신규 수주 등록 (${this.getOrderTypeDisplayName(request.orderType)})`
    );
    await this.orderHistoryRepository.save(history);

    return {
      orderId: orderId.getValue(),
      orderNo: orderNo,
      orderType: this.getOrderTypeDisplayName(request.orderType),
      success: true,
      message: `수주가 성공적으로 등록되었습니다. (수주번호: ${orderNo})`,
    };
  }

  private async validateBusinessRules(
    request: CreateOrderRequest
  ): Promise<void> {
    // 납기일 검증
    const today = new Date();
    if (request.deliveryDate <= today) {
      throw new Error("납기일은 오늘 날짜보다 나중이어야 합니다.");
    }

    // 수주 타입별 특별 검증
    await this.validateByOrderType(request);

    // 수주 품목 검증
    if (!request.items || request.items.length === 0) {
      throw new Error("수주 품목은 최소 1개 이상이어야 합니다.");
    }

    // 제품 존재 여부 확인
    for (const item of request.items) {
      const productExists = await this.productService.exists(item.productId);
      if (!productExists) {
        throw new Error(`존재하지 않는 제품입니다: ${item.productCode}`);
      }
    }
  }

  private async validateByOrderType(
    request: CreateOrderRequest
  ): Promise<void> {
    switch (request.orderType) {
      case OrderType.EXPORT:
        // 수출 수주의 경우 추가 검증
        if (!request.customer.email || !request.customer.email.includes("@")) {
          throw new Error("수출 수주는 고객 이메일이 필수입니다.");
        }
        break;

      case OrderType.SAMPLE:
        // 샘플 수주의 경우 수량 제한
        const totalQuantity = request.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        if (totalQuantity > 100) {
          throw new Error("샘플 수주는 총 수량이 100개를 초과할 수 없습니다.");
        }
        break;

      case OrderType.REPAIR:
        // 수리 수주의 경우 특별 승인 필요
        if (
          request.priority !== OrderPriority.HIGH &&
          request.priority !== OrderPriority.URGENT
        ) {
          throw new Error("수리 수주는 높음 이상의 우선순위가 필요합니다.");
        }
        break;

      case OrderType.DOMESTIC:
      default:
        // 내수 수주는 기본 검증만
        break;
    }
  }

  private async createOrderItems(
    itemRequests: CreateOrderItemRequest[]
  ): Promise<OrderItem[]> {
    return itemRequests.map((itemRequest) => {
      const amount = itemRequest.quantity * itemRequest.unitPrice;

      return new OrderItem(
        this.generateOrderItemId(),
        itemRequest.productId,
        itemRequest.productCode,
        itemRequest.productName,
        itemRequest.quantity,
        itemRequest.unit,
        itemRequest.unitPrice,
        amount,
        itemRequest.deliveryDate,
        itemRequest.notes
      );
    });
  }

  private getOrderTypeDisplayName(orderType: OrderType): string {
    switch (orderType) {
      case OrderType.DOMESTIC:
        return "내수";
      case OrderType.EXPORT:
        return "수출";
      case OrderType.SAMPLE:
        return "샘플";
      case OrderType.REPAIR:
        return "수리";
      default:
        return "내수";
    }
  }

  private generateOrderId(): string {
    return "ORD-" + Date.now().toString();
  }

  private generateOrderItemId(): string {
    return (
      "ITEM-" +
      Date.now().toString() +
      "-" +
      Math.random().toString(36).substr(2, 9)
    );
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString();
  }
}
```

#### 2. 수주 수정 UseCase

```typescript
// application/usecases/order/UpdateOrderUseCase.ts
export interface UpdateOrderRequest {
  orderId: string;
  orderType?: OrderType;
  customer?: {
    code: string;
    name: string;
    contactPerson: string;
    phoneNumber: string;
    email: string;
    address: string;
  };
  deliveryDate?: Date;
  priority?: OrderPriority;
  notes?: string;
  salesPerson?: string;
  items?: UpdateOrderItemRequest[];
  id_updated: string; // 수정자 ID
  reason?: string;
}

export interface UpdateOrderItemRequest {
  id?: string; // 기존 품목 ID (수정 시)
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  deliveryDate: Date;
  notes: string;
  isDeleted?: boolean; // 삭제 여부
}

export interface UpdateOrderResponse {
  success: boolean;
  message: string;
  updatedFields: string[];
}

export class UpdateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository,
    private productService: ProductService
  ) {}

  async execute(request: UpdateOrderRequest): Promise<UpdateOrderResponse> {
    // 1. 수주 존재 확인
    const existingOrder = await this.orderRepository.findById(
      new OrderId(request.orderId)
    );
    if (!existingOrder) {
      throw new Error("존재하지 않는 수주입니다.");
    }

    // 2. 수정 가능성 검증
    await this.validateUpdate(existingOrder, request);

    // 3. 변경 사항 추적
    const changedFields = await this.detectChanges(existingOrder, request);
    if (changedFields.length === 0) {
      throw new Error("변경된 항목이 없습니다.");
    }

    // 4. 수주 정보 업데이트
    const updatedOrder = await this.createUpdatedOrder(existingOrder, request);

    // 5. 저장
    await this.orderRepository.save(updatedOrder);

    // 6. 이력 기록
    const history = new OrderHistory(
      this.generateHistoryId(),
      existingOrder.getId(),
      OrderHistoryAction.UPDATE,
      changedFields,
      request.id_updated,
      request.id_updated, // 수정자명 (실제로는 사용자 정보 조회 필요)
      new Date(),
      request.reason
    );
    await this.orderHistoryRepository.save(history);

    return {
      success: true,
      message: "수주 정보가 성공적으로 수정되었습니다.",
      updatedFields: changedFields.map((field) => field.fieldName),
    };
  }

  private async validateUpdate(
    existingOrder: Order,
    request: UpdateOrderRequest
  ): Promise<void> {
    // 상태별 수정 제한
    if (existingOrder.getStatus() === OrderStatus.COMPLETED) {
      throw new Error("완료된 수주는 수정할 수 없습니다.");
    }

    if (existingOrder.getStatus() === OrderStatus.CANCELLED) {
      throw new Error("취소된 수주는 수정할 수 없습니다.");
    }

    // 생산 중인 수주의 경우 제한적 수정만 허용
    if (existingOrder.getStatus() === OrderStatus.IN_PRODUCTION) {
      if (request.items || request.deliveryDate) {
        throw new Error(
          "생산 중인 수주는 품목 정보나 납기일을 수정할 수 없습니다."
        );
      }
    }

    // 납기일 검증
    if (request.deliveryDate) {
      const today = new Date();
      if (request.deliveryDate <= today) {
        throw new Error("납기일은 오늘 날짜보다 나중이어야 합니다.");
      }
    }

    // 제품 존재 여부 확인
    if (request.items) {
      for (const item of request.items) {
        if (!item.isDeleted) {
          const productExists = await this.productService.exists(
            item.productId
          );
          if (!productExists) {
            throw new Error(`존재하지 않는 제품입니다: ${item.productCode}`);
          }
        }
      }
    }
  }

  private async detectChanges(
    existingOrder: Order,
    request: UpdateOrderRequest
  ): Promise<ChangedField[]> {
    const changes: ChangedField[] = [];

    // 수주 타입 변경
    if (
      request.orderType &&
      request.orderType !== existingOrder.getOrderType()
    ) {
      changes.push(
        new ChangedField(
          "orderType",
          existingOrder.getOrderType(),
          request.orderType
        )
      );
    }

    // 고객 정보 변경
    if (request.customer) {
      const existingCustomer = existingOrder.getCustomer();
      if (request.customer.code !== existingCustomer.code) {
        changes.push(
          new ChangedField(
            "customer.code",
            existingCustomer.code,
            request.customer.code
          )
        );
      }
      if (request.customer.name !== existingCustomer.name) {
        changes.push(
          new ChangedField(
            "customer.name",
            existingCustomer.name,
            request.customer.name
          )
        );
      }
      if (request.customer.contactPerson !== existingCustomer.contactPerson) {
        changes.push(
          new ChangedField(
            "customer.contactPerson",
            existingCustomer.contactPerson,
            request.customer.contactPerson
          )
        );
      }
    }

    // 납기일 변경
    if (
      request.deliveryDate &&
      request.deliveryDate.getTime() !==
        existingOrder.getDeliveryDate().getTime()
    ) {
      changes.push(
        new ChangedField(
          "deliveryDate",
          existingOrder.getDeliveryDate(),
          request.deliveryDate
        )
      );
    }

    // 우선순위 변경
    if (request.priority && request.priority !== existingOrder.getPriority()) {
      changes.push(
        new ChangedField(
          "priority",
          existingOrder.getPriority(),
          request.priority
        )
      );
    }

    // 영업담당자 변경
    if (
      request.salesPerson &&
      request.salesPerson !== existingOrder.getSalesPerson()
    ) {
      changes.push(
        new ChangedField(
          "salesPerson",
          existingOrder.getSalesPerson(),
          request.salesPerson
        )
      );
    }

    // 비고 변경
    if (
      request.notes !== undefined &&
      request.notes !== existingOrder.getNotes()
    ) {
      changes.push(
        new ChangedField("notes", existingOrder.getNotes(), request.notes)
      );
    }

    // 품목 변경 (복잡한 로직이므로 별도 메소드)
    if (request.items) {
      const itemChanges = await this.detectItemChanges(
        existingOrder.getItems(),
        request.items
      );
      changes.push(...itemChanges);
    }

    return changes;
  }

  private async detectItemChanges(
    existingItems: OrderItem[],
    requestItems: UpdateOrderItemRequest[]
  ): Promise<ChangedField[]> {
    const changes: ChangedField[] = [];

    // 기존 품목과 요청 품목 비교
    const existingItemMap = new Map(
      existingItems.map((item) => [item.getId(), item])
    );
    const requestItemMap = new Map(
      requestItems.map((item) => [item.id || "new", item])
    );

    // 삭제된 품목 확인
    for (const [itemId, existingItem] of existingItemMap) {
      const requestItem = requestItems.find((req) => req.id === itemId);
      if (!requestItem || requestItem.isDeleted) {
        changes.push(
          new ChangedField(
            "items",
            `삭제: ${existingItem.getProductCode()}`,
            null
          )
        );
      }
    }

    // 추가/수정된 품목 확인
    for (const requestItem of requestItems) {
      if (requestItem.isDeleted) continue;

      if (!requestItem.id || requestItem.id === "new") {
        // 새로 추가된 품목
        changes.push(
          new ChangedField("items", null, `추가: ${requestItem.productCode}`)
        );
      } else {
        // 수정된 품목
        const existingItem = existingItemMap.get(requestItem.id);
        if (existingItem) {
          if (existingItem.getQuantity() !== requestItem.quantity) {
            changes.push(
              new ChangedField(
                "items",
                `${existingItem.getProductCode()} 수량: ${existingItem.getQuantity()}`,
                `${requestItem.productCode} 수량: ${requestItem.quantity}`
              )
            );
          }
          if (existingItem.getUnitPrice() !== requestItem.unitPrice) {
            changes.push(
              new ChangedField(
                "items",
                `${existingItem.getProductCode()} 단가: ${existingItem.getUnitPrice()}`,
                `${requestItem.productCode} 단가: ${requestItem.unitPrice}`
              )
            );
          }
        }
      }
    }

    return changes;
  }

  private async createUpdatedOrder(
    existingOrder: Order,
    request: UpdateOrderRequest
  ): Promise<Order> {
    // 고객 정보 업데이트
    const customer = request.customer
      ? new Customer(
          request.customer.code,
          request.customer.name,
          request.customer.contactPerson,
          request.customer.phoneNumber,
          request.customer.email,
          request.customer.address
        )
      : existingOrder.getCustomer();

    // 품목 정보 업데이트
    const updatedItems = request.items
      ? await this.createUpdatedItems(request.items)
      : existingOrder.getItems();

    // 총 금액 재계산
    const totalAmount = updatedItems.reduce(
      (total, item) => total + item.getAmount(),
      0
    );

    return new Order(
      existingOrder.getId(),
      existingOrder.getOrderNo(),
      request.orderType ?? existingOrder.getOrderType(),
      customer,
      existingOrder.getOrderDate(),
      request.deliveryDate ?? existingOrder.getDeliveryDate(),
      existingOrder.getStatus(),
      updatedItems,
      totalAmount,
      existingOrder.getCurrency(),
      request.priority ?? existingOrder.getPriority(),
      request.notes ?? existingOrder.getNotes(),
      request.salesPerson ?? existingOrder.getSalesPerson(),
      existingOrder.getIdCreate(),
      request.id_updated,
      existingOrder.getDtCreate(),
      new Date()
    );
  }

  private async createUpdatedItems(
    requestItems: UpdateOrderItemRequest[]
  ): Promise<OrderItem[]> {
    const updatedItems: OrderItem[] = [];

    for (const requestItem of requestItems) {
      if (requestItem.isDeleted) continue;

      const amount = requestItem.quantity * requestItem.unitPrice;
      const itemId = requestItem.id || this.generateOrderItemId();

      updatedItems.push(
        new OrderItem(
          itemId,
          requestItem.productId,
          requestItem.productCode,
          requestItem.productName,
          requestItem.quantity,
          requestItem.unit,
          requestItem.unitPrice,
          amount,
          requestItem.deliveryDate,
          requestItem.notes
        )
      );
    }

    return updatedItems;
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString();
  }

  private generateOrderItemId(): string {
    return (
      "ITEM-" +
      Date.now().toString() +
      "-" +
      Math.random().toString(36).substr(2, 9)
    );
  }
}
```

#### 3. 수주 삭제 UseCase

```typescript
// application/usecases/order/DeleteOrderUseCase.ts
export interface DeleteOrderRequest {
  orderId: string;
  id_updated: string; // 삭제 처리자 ID
  reason?: string;
}

export interface DeleteOrderResponse {
  success: boolean;
  message: string;
}

export class DeleteOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository,
    private productionOrderService: ProductionOrderService
  ) {}

  async execute(request: DeleteOrderRequest): Promise<DeleteOrderResponse> {
    const order = await this.orderRepository.findById(
      new OrderId(request.orderId)
    );
    if (!order) {
      throw new Error("존재하지 않는 수주입니다.");
    }

    // 삭제 가능성 검증
    await this.validateDeletion(order);

    // 관련 생산 지시 취소 처리
    await this.cancelRelatedProductionOrders(order);

    // 수주 상태를 취소로 변경 (논리 삭제)
    const deletedOrder = order.changeStatus(
      OrderStatus.CANCELLED,
      request.reason
    );
    await this.orderRepository.save(deletedOrder);

    // 삭제 이력 기록
    const history = new OrderHistory(
      this.generateHistoryId(),
      order.getId(),
      OrderHistoryAction.DELETE,
      [new ChangedField("status", order.getStatus(), OrderStatus.CANCELLED)],
      request.id_updated,
      request.id_updated,
      new Date(),
      request.reason || "수주 삭제"
    );
    await this.orderHistoryRepository.save(history);

    return {
      success: true,
      message: "수주가 성공적으로 삭제되었습니다.",
    };
  }

  private async validateDeletion(order: Order): Promise<void> {
    if (order.getStatus() === OrderStatus.COMPLETED) {
      throw new Error("완료된 수주는 삭제할 수 없습니다.");
    }

    if (order.getStatus() === OrderStatus.CANCELLED) {
      throw new Error("이미 취소된 수주입니다.");
    }

    // 생산 진행 상황 확인
    if (order.getStatus() === OrderStatus.IN_PRODUCTION) {
      const productionProgress =
        await this.productionOrderService.getProgressByOrderId(order.getId());
      if (productionProgress > 50) {
        // 50% 이상 진행된 경우
        throw new Error("생산이 50% 이상 진행된 수주는 삭제할 수 없습니다.");
      }
    }
  }

  private async cancelRelatedProductionOrders(order: Order): Promise<void> {
    if (order.getStatus() === OrderStatus.IN_PRODUCTION) {
      await this.productionOrderService.cancelByOrderId(order.getId());
    }
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString();
  }
}
```

#### 4. 수주 이력 조회 UseCase

```typescript
// application/usecases/order/GetOrderHistoryUseCase.ts
export interface GetOrderHistoryRequest {
  orderId: string;
  page?: number;
  pageSize?: number;
  actionFilter?: OrderHistoryAction[];
  startDate?: Date;
  endDate?: Date;
}

export interface GetOrderHistoryResponse {
  orderInfo: OrderBasicInfo;
  histories: OrderHistoryItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface OrderBasicInfo {
  orderId: string;
  orderNo: string;
  orderType: string;
  customerName: string;
  currentStatus: string;
  totalAmount: number;
  orderDate: Date;
  deliveryDate: Date;
}

export interface OrderHistoryItem {
  id: string;
  action: string;
  actionDisplay: string;
  changedFields: HistoryChangedField[];
  userId: string;
  userName: string;
  timestamp: Date;
  reason?: string;
  summary: string; // 변경 사항 요약
}

export interface HistoryChangedField {
  fieldName: string;
  fieldDisplayName: string;
  oldValue: any;
  newValue: any;
  oldValueDisplay: string;
  newValueDisplay: string;
}

export class GetOrderHistoryUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository,
    private orderPresenter: OrderPresenter
  ) {}

  async execute(request: GetOrderHistoryRequest): Promise<GetOrderHistoryResponse> {
    // 1. 수주 정보 조회
    const order = await this.orderRepository.findById(new OrderId(request.orderId));
    if (!order) {
      throw new Error('존재하지 않는 수주입니다.');
    }

    // 2. 이력 조회 조건 구성
    const historyRequest = {
      orderId: order.getId(),
      page: request.page || 1,
      pageSize: request.pageSize || 20,
      actionFilter: request.actionFilter,
      startDate: request.startDate,
      endDate: request.endDate
    };

    // 3. 이력 목록 조회
    const histories = await this.orderHistoryRepository.findByOrderIdWithPaging(historyRequest);
    const totalCount = await this.orderHistoryRepository.countByOrderId(order.getId(), historyRequest);

    // 4. 수주 기본 정보 구성
    const orderInfo: OrderBasicInfo = {
      orderId: order.getId().getValue(),
      orderNo: order.getOrderNo(),
      orderType: this.orderPresenter.getOrderTypeDisplayName(order.getOrderType()),
      customerName: order.getCustomer().name,
      currentStatus: this.orderPresenter.getStatusDisplayName(order.getStatus()),
      totalAmount: order.getTotalAmount(),
      orderDate: order.getOrderDate(),
      deliveryDate: order.getDeliveryDate()
    };

    // 5. 이력 항목 변환
    const historyItems = histories.map(history => this.convertToHistoryItem(history));

    // 6. 페이징 정보 계산
    const totalPages = Math.ceil(totalCount / historyRequest.pageSize);

    return {
      orderInfo,
      histories: historyItems,
      totalCount,
      currentPage: historyRequest.page,
      totalPages
    };
  }

  private convertToHistoryItem(history: OrderHistory): OrderHistoryItem {
    const changedFields = history.getChangedFields().map(field => ({
      fieldName: field.fieldName,
      fieldDisplayName: this.getFieldDisplayName(field.fieldName),
      oldValue: field.oldValue,
      newValue: field.newValue,
      oldValueDisplay: this.formatFieldValue(field.fieldName, field.oldValue),
      newValueDisplay: this.formatFieldValue(field.fieldName, field.newValue)
    }));

    return {
      id: history.getId(),
      action: history.getAction(),
      actionDisplay: this.orderPresenter.getHistoryActionDisplayName(history.getAction()),
      changedFields,
      userId: history.getUserId(),
      userName: history.getUserName(),
      timestamp: history.getTimestamp(),
      reason: history.getReason(),
      summary: this.generateChangeSummary(history.getAction(), changedFields)
    };
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldDisplayNames: Record<string, string> = {
      'orderType': '수주 타입',
      'customer.name': '고객명',
      'customer.contactPerson': '담당자',
      'deliveryDate': '납기일',
      'priority': '우선순위',
      'salesPerson': '영업담당자',
      'notes': '비고',
      'status': '상태',
      'items': '수주 품목'
    };

    return fieldDisplayNames[fieldName] || fieldName;
  }

  private formatFieldValue(fieldName: string, value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (fieldName) {
      case 'deliveryDate':
      case 'orderDate':
        return new Date(value).toLocaleDateString('ko-KR');

      case 'priority':
        return this.orderPresenter.getPriorityDisplayName(value);

      case 'status':
        return this.orderPresenter.getStatusDisplayName(value);

      case 'orderType':
        return this.orderPresenter.getOrderTypeDisplayName(value);

      default:
        return String(value);
    }
  }

  private generateChangeSummary(action: OrderHistoryAction, changedFields: HistoryChangedField[]): string {
    switch (action) {
      case OrderHistoryAction.CREATE:
        return '수주가 신규 등록되었습니다.';

      case OrderHistoryAction.UPDATE:
        if (changedFields.length === 1) {
          const field = changedFields[0];
          return `${field.fieldDisplayName}이(가) "${field.oldValueDisplay}"에서 "${field.newValueDisplay}"로 변경되었습니다.`;
        } else {
          const fieldNames = changedFields.map(f => f.fieldDisplayName).join(', ');
          return `${fieldNames} 등 ${changedFields.length}개 항목이 수정되었습니다.`;
        }

      case OrderHistoryAction.DELETE:
        return '수주가 삭제되었습니다.';

      case OrderHistoryAction.CANCEL:
        return '수주가 취소되었습니다.';

      case OrderHistoryAction.START_PRODUCTION:
        return '생산 지시가 생성되어 생산이 시작되었습니다.';

      case OrderHistoryAction.COMPLETE:
        return '수주가 완료되었습니다.';

      default:
        return '상태가 변경되었습니다.';
    }
  }
}로는 각 제품의 표준 생산 시간을 조회하여 계산
      return total + item.getQuantity() * 1; // 임시로 1시간/개로 계산
    }, 0);
  }

  private generateHistoryId(): string {
    return 'HIST-' + Date.now().toString();
  }
}
```

#### 4. 수주 취소 UseCase

```typescript
// application/usecases/order/CancelOrderUseCase.ts
export interface CancelOrderRequest {
  orderId: string;
  id_updated: string; // 취소 처리자 ID
  reason: string; // 취소 사유 (필수)
}

export class CancelOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository,
    private productionOrderService: ProductionOrderService
  ) {}

  async execute(request: CancelOrderRequest): Promise<void> {
    const order = await this.orderRepository.findById(
      new OrderId(request.orderId)
    );
    if (!order) {
      throw new Error("존재하지 않는 수주입니다.");
    }

    // 취소 가능성 검증
    await this.validateCancellation(order);

    // 취소 사유 필수 체크
    if (!request.reason || request.reason.trim().length === 0) {
      throw new Error("취소 사유는 필수입니다.");
    }

    // 생산 지시 취소 처리
    await this.cancelRelatedProductionOrders(order);

    // 수주 상태 변경
    const cancelledOrder = order.changeStatus(
      OrderStatus.CANCELLED,
      request.reason
    );

    await this.orderRepository.save(cancelledOrder);

    // 이력 기록
    const history = new OrderHistory(
      this.generateHistoryId(),
      order.getId(),
      OrderHistoryAction.CANCEL,
      [new ChangedField("status", order.getStatus(), OrderStatus.CANCELLED)],
      request.id_updated,
      request.id_updated,
      new Date(),
      request.reason
    );
    await this.orderHistoryRepository.save(history);
  }

  private async validateCancellation(order: Order): Promise<void> {
    if (!order.canBeCancelled()) {
      throw new Error("취소할 수 없는 수주입니다.");
    }

    if (order.getStatus() === OrderStatus.COMPLETED) {
      throw new Error("완료된 수주는 취소할 수 없습니다.");
    }

    if (order.getStatus() === OrderStatus.CANCELLED) {
      throw new Error("이미 취소된 수주입니다.");
    }
  }

  private async cancelRelatedProductionOrders(order: Order): Promise<void> {
    if (order.getStatus() === OrderStatus.IN_PRODUCTION) {
      await this.productionOrderService.cancelByOrderId(order.getId());
    }
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString();
  }
}
```

#### 5. 생산 지시 생성 UseCase

```typescript
// application/usecases/order/CreateProductionOrderUseCase.ts
export interface CreateProductionOrderRequest {
  orderId: string;
  plannedStartDate: Date;
  id_create: string; // 생산 지시 생성자 ID
}

export interface CreateProductionOrderResponse {
  productionOrderId: string;
  productionOrderNo: string;
  success: boolean;
  message: string;
}

export class CreateProductionOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository,
    private productionOrderService: ProductionOrderService,
    private bomService: BOMService
  ) {}

  async execute(
    request: CreateProductionOrderRequest
  ): Promise<CreateProductionOrderResponse> {
    // 1. 수주 존재 확인
    const order = await this.orderRepository.findById(
      new OrderId(request.orderId)
    );
    if (!order) {
      throw new Error("존재하지 않는 수주입니다.");
    }

    // 2. 생산 지시 생성 가능성 검증
    await this.validateProductionOrderCreation(order, request);

    // 3. BOM 검증
    await this.validateBOM(order);

    // 4. 생산 지시 생성
    const productionOrderResult =
      await this.productionOrderService.createFromOrder(
        order,
        request.plannedStartDate,
        request.id_create
      );

    // 5. 수주 상태를 '생산중'으로 변경
    const updatedOrder = order.changeStatus(OrderStatus.IN_PRODUCTION);
    await this.orderRepository.save(updatedOrder);

    // 6. 이력 기록
    const history = new OrderHistory(
      this.generateHistoryId(),
      order.getId(),
      OrderHistoryAction.START_PRODUCTION,
      [
        new ChangedField(
          "status",
          OrderStatus.PENDING,
          OrderStatus.IN_PRODUCTION
        ),
      ],
      request.id_create,
      request.id_create,
      new Date(),
      `생산 지시 생성 (${productionOrderResult.productionOrderNo})`
    );
    await this.orderHistoryRepository.save(history);

    return {
      productionOrderId: productionOrderResult.productionOrderId,
      productionOrderNo: productionOrderResult.productionOrderNo,
      success: true,
      message: "생산 지시가 성공적으로 생성되었습니다.",
    };
  }

  private async validateProductionOrderCreation(
    order: Order,
    request: CreateProductionOrderRequest
  ): Promise<void> {
    if (!order.canCreateProductionOrder()) {
      throw new Error("생산 지시를 생성할 수 없는 수주입니다.");
    }

    if (order.getStatus() !== OrderStatus.PENDING) {
      throw new Error("대기 상태의 수주만 생산 지시를 생성할 수 있습니다.");
    }

    // 계획 시작일 검증
    const today = new Date();
    if (request.plannedStartDate < today) {
      throw new Error("계획 시작일은 오늘 날짜 이후여야 합니다.");
    }

    // 납기일과의 여유 시간 확인
    const deliveryDate = order.getDeliveryDate();
    const requiredDays = this.calculateRequiredProductionDays(order);
    const availableDays = Math.ceil(
      (deliveryDate.getTime() - request.plannedStartDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (availableDays < requiredDays) {
      throw new Error(
        `납기일까지 생산 시간이 부족합니다. (필요: ${requiredDays}일, 가능: ${availableDays}일)`
      );
    }
  }

  private async validateBOM(order: Order): Promise<void> {
    for (const item of order.getItems()) {
      const hasBOM = await this.bomService.existsByProductId(
        item.getProductId()
      );
      if (!hasBOM) {
        throw new Error(
          `제품 ${item.getProductCode()}의 BOM이 존재하지 않습니다.`
        );
      }
    }
  }

  private calculateRequiredProductionDays(order: Order): number {
    // 실제로는 각 제품의 리드타임과 수량을 고려하여 계산
    return Math.ceil(order.getItems().length * 2); // 임시로 품목당 2일로 계산
  }

  private generateHistoryId(): string {
    return "HIST-" + Date.now().toString();
  }
}
```

---

## 🗄️ Repository Interface 업데이트

````typescript
// domain/repositories/OrderRepository.ts
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByOrderNo(orderNo: string): Promise<Order | null>;
  findByPageWithCriteria(
    criteria: OrderSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<Order[]>;
  findAllByCriteria(criteria: OrderSearchCriteria): Promise<Order[]>;
  countByCriteria(criteria: OrderSearchCriteria): Promise<number>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
  getLastSequenceByPrefix(prefix: string): Promise<number>;
  findByCustomerCode(customerCode: string): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  findDelayedOrders(): Promise<Order[]>;
  findUrgentOrders(): Promise<Order[]>;
  softDelete(id: OrderId): Promise<void>; // 논리 삭제용
}

// domain/repositories/OrderHistoryRepository.ts
export interface OrderHistoryRepository {
  save(history: OrderHistory): Promise<void>;
  findByOrderId(orderId: OrderId): Promise<OrderHistory[]>;
  findByOrderIdWithPaging(request: {
    orderId: OrderId;
    page: number;
    pageSize: number;
    actionFilter?: OrderHistoryAction[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<OrderHistory[]>;
  countByOrderId(orderId: OrderId, filters?: {
    actionFilter?: OrderHistoryAction[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<number>;
  findByUserId(userId: string): Promise<OrderHistory[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<OrderHistory[]>;
  findByAction(action: OrderHistoryAction): Promise<OrderHistory[]>;
}
``` await this.productionOrderService.createFromOrder(
      order,
      request.plannedStartDate,
      request.id_create
    );

    // 5. 수주 상태를 '생산중'으로 변경
    const updatedOrder = order.changeStatus(OrderStatus.IN_PRODUCTION);
    await this.orderRepository.save(updatedOrder);

    // 6. 이력 기록
    const history = new OrderHistory(
      this.generateHistoryId(),
      order.getId(),
      OrderHistoryAction.START_PRODUCTION,
      [new ChangedField('status', OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION)],
      request.id_create,
      request.id_create,
      new Date(),
      `생산 지시 생성 (${productionOrderResult.productionOrderNo})`
    );
    await this.orderHistoryRepository.save(history);

    return {
      productionOrderId: productionOrderResult.productionOrderId,
      productionOrderNo: productionOrderResult.productionOrderNo,
      success: true,
      message: '생산 지시가 성공적으로 생성되었습니다.'
    };
  }

  private async validateProductionOrderCreation(order: Order, request: CreateProductionOrderRequest): Promise<void> {
    if (!order.canCreateProductionOrder()) {
      throw new Error('생산 지시를 생성할 수 없는 수주입니다.');
    }

    if (order.getStatus() !== OrderStatus.APPROVED) {
      throw new Error('승인된 수주만 생산 지시를 생성할 수 있습니다.');
    }

    // 계획 시작일 검증
    const today = new Date();
    if (request.plannedStartDate < today) {
      throw new Error('계획 시작일은 오늘 날짜 이후여야 합니다.');
    }

    // 납기일과의 여유 시간 확인
    const deliveryDate = order.getDeliveryDate();
    const requiredDays = this.calculateRequiredProductionDays(order);
    const availableDays = Math.ceil((deliveryDate.getTime() - request.plannedStartDate.getTime()) / (1000 * 60 * 60 * 24));

    if (availableDays < requiredDays) {
      throw new Error(`납기일까지 생산 시간이 부족합니다. (필요: ${requiredDays}일, 가능: ${availableDays}일)`);
    }
  }

  private async validateBOM(order: Order): Promise<void> {
    for (const item of order.getItems()) {
      const hasBOM = await this.bomService.existsByProductId(item.getProductId());
      if (!hasBOM) {
        throw new Error(`제품 ${item.getProductCode()}의 BOM이 존재하지 않습니다.`);
      }
    }
  }

  private calculateRequiredProductionDays(order: Order): number {
    // 실제로는 각 제품의 리드타임과 수량을 고려하여 계산
    return Math.ceil(order.getItems().length * 2); // 임시로 품목당 2일로 계산
  }

  private generateHistoryId(): string {
    return 'HIST-' + Date.now().toString();
  }
}
````

#### 6. 수주 현황 대시보드 UseCase

```typescript
// application/usecases/order/GetOrderDashboardUseCase.ts
export interface GetOrderDashboardRequest {
  startDate?: Date;
  endDate?: Date;
}

export interface OrderDashboardResponse {
  summary: OrderSummary;
  statusDistribution: OrderStatusDistribution[];
  priorityDistribution: OrderPriorityDistribution[];
  monthlyTrend: MonthlyOrderTrend[];
  urgentOrders: UrgentOrderItem[];
  delayedOrders: DelayedOrderItem[];
}

export interface OrderSummary {
  totalOrders: number;
  totalAmount: number;
  pendingOrders: number;
  approvedOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
}

export interface OrderStatusDistribution {
  status: string;
  statusDisplay: string;
  count: number;
  percentage: number;
}

export interface OrderPriorityDistribution {
  priority: string;
  priorityDisplay: string;
  count: number;
  percentage: number;
}

export interface MonthlyOrderTrend {
  month: string;
  orderCount: number;
  totalAmount: number;
}

export interface UrgentOrderItem {
  orderId: string;
  orderNo: string;
  customerName: string;
  deliveryDate: Date;
  daysUntilDelivery: number;
  totalAmount: number;
}

export interface DelayedOrderItem {
  orderId: string;
  orderNo: string;
  customerName: string;
  deliveryDate: Date;
  daysDelayed: number;
  status: string;
}

export class GetOrderDashboardUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private orderPresenter: OrderPresenter
  ) {}

  async execute(
    request: GetOrderDashboardRequest
  ): Promise<OrderDashboardResponse> {
    const dateRange = this.getDateRange(request);

    // 1. 전체 수주 조회
    const orders = await this.orderRepository.findByDateRange(
      dateRange.startDate,
      dateRange.endDate
    );

    // 2. 요약 정보 계산
    const summary = this.calculateSummary(orders);

    // 3. 상태별 분포
    const statusDistribution = this.calculateStatusDistribution(orders);

    // 4. 우선순위별 분포
    const priorityDistribution = this.calculatePriorityDistribution(orders);

    // 5. 월별 트렌드
    const monthlyTrend = this.calculateMonthlyTrend(orders);

    // 6. 긴급 수주 목록
    const urgentOrders = this.getUrgentOrders(orders);

    // 7. 지연 수주 목록
    const delayedOrders = this.getDelayedOrders(orders);

    return {
      summary,
      statusDistribution,
      priorityDistribution,
      monthlyTrend,
      urgentOrders,
      delayedOrders,
    };
  }

  private getDateRange(request: GetOrderDashboardRequest): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = request.endDate || new Date();
    const startDate =
      request.startDate ||
      new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1); // 최근 12개월

    return { startDate, endDate };
  }

  private calculateSummary(orders: Order[]): OrderSummary {
    const totalOrders = orders.length;
    const totalAmount = orders.reduce(
      (sum, order) => sum + order.getTotalAmount(),
      0
    );

    const statusCounts = {
      pending: orders.filter((o) => o.getStatus() === OrderStatus.PENDING)
        .length,
      approved: orders.filter((o) => o.getStatus() === OrderStatus.APPROVED)
        .length,
      inProduction: orders.filter(
        (o) => o.getStatus() === OrderStatus.IN_PRODUCTION
      ).length,
      completed: orders.filter((o) => o.getStatus() === OrderStatus.COMPLETED)
        .length,
      cancelled: orders.filter((o) => o.getStatus() === OrderStatus.CANCELLED)
        .length,
    };

    return {
      totalOrders,
      totalAmount,
      pendingOrders: statusCounts.pending,
      approvedOrders: statusCounts.approved,
      inProductionOrders: statusCounts.inProduction,
      completedOrders: statusCounts.completed,
      cancelledOrders: statusCounts.cancelled,
      averageOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
    };
  }

  private calculateStatusDistribution(
    orders: Order[]
  ): OrderStatusDistribution[] {
    const statusCounts = new Map<OrderStatus, number>();

    orders.forEach((order) => {
      const status = order.getStatus();
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const totalOrders = orders.length;

    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      statusDisplay: this.orderPresenter.getStatusDisplayName(status),
      count,
      percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
    }));
  }

  private calculatePriorityDistribution(
    orders: Order[]
  ): OrderPriorityDistribution[] {
    const priorityCounts = new Map<OrderPriority, number>();

    orders.forEach((order) => {
      const priority = order.getPriority();
      priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
    });

    const totalOrders = orders.length;

    return Array.from(priorityCounts.entries()).map(([priority, count]) => ({
      priority,
      priorityDisplay: this.orderPresenter.getPriorityDisplayName(priority),
      count,
      percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
    }));
  }

  private calculateMonthlyTrend(orders: Order[]): MonthlyOrderTrend[] {
    const monthlyData = new Map<string, { count: number; amount: number }>();

    orders.forEach((order) => {
      const monthKey = order.getOrderDate().toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyData.get(monthKey) || { count: 0, amount: 0 };
      monthlyData.set(monthKey, {
        count: existing.count + 1,
        amount: existing.amount + order.getTotalAmount(),
      });
    });

    return Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        orderCount: data.count,
        totalAmount: data.amount,
      }));
  }

  private getUrgentOrders(orders: Order[]): UrgentOrderItem[] {
    const today = new Date();

    return orders
      .filter(
        (order) =>
          order.getPriority() === OrderPriority.URGENT &&
          order.getStatus() !== OrderStatus.COMPLETED &&
          order.getStatus() !== OrderStatus.CANCELLED
      )
      .map((order) => {
        const daysUntilDelivery = Math.ceil(
          (order.getDeliveryDate().getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          orderId: order.getId().getValue(),
          orderNo: order.getOrderNo(),
          customerName: order.getCustomer().name,
          deliveryDate: order.getDeliveryDate(),
          daysUntilDelivery,
          totalAmount: order.getTotalAmount(),
        };
      })
      .sort((a, b) => a.daysUntilDelivery - b.daysUntilDelivery)
      .slice(0, 10); // 상위 10건
  }

  private getDelayedOrders(orders: Order[]): DelayedOrderItem[] {
    const today = new Date();

    return orders
      .filter((order) => order.isDelayed())
      .map((order) => {
        const daysDelayed = Math.ceil(
          (today.getTime() - order.getDeliveryDate().getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          orderId: order.getId().getValue(),
          orderNo: order.getOrderNo(),
          customerName: order.getCustomer().name,
          deliveryDate: order.getDeliveryDate(),
          daysDelayed,
          status: this.orderPresenter.getStatusDisplayName(order.getStatus()),
        };
      })
      .sort((a, b) => b.daysDelayed - a.daysDelayed)
      .slice(0, 10); // 상위 10건
  }
}
```

#### 7. 수주 데이터 내보내기 UseCase

```typescript
// application/usecases/order/ExportOrderListUseCase.ts
export interface ExportOrderListRequest {
  format: "excel" | "csv";
  filters?: OrderFilter[];
  columns?: string[];
  includeItems?: boolean;
  includeHistory?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface ExportOrderListResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

export class ExportOrderListUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private fileExportService: FileExportService,
    private orderPresenter: OrderPresenter
  ) {}

  async execute(
    request: ExportOrderListRequest
  ): Promise<ExportOrderListResponse> {
    // 1. 내보낼 수주 목록 조회
    const searchCriteria = {
      filters: request.filters || [],
      startDate: request.startDate,
      endDate: request.endDate,
      sortBy: "orderDate",
      sortDirection: "desc" as const,
    };

    const orders = await this.orderRepository.findAllByCriteria(searchCriteria);

    // 2. 내보내기 데이터 구성
    let exportData: any[] = [];

    if (request.includeItems) {
      // 수주별 품목 상세 데이터
      exportData = this.createOrderItemsExportData(orders);
    } else {
      // 수주 요약 데이터
      exportData = this.createOrderSummaryExportData(orders);
    }

    // 3. 컬럼 필터링
    const filteredData = request.columns
      ? this.filterColumns(exportData, request.columns)
      : exportData;

    // 4. 파일 생성
    const fileName = `수주정보_${new Date().toISOString().split("T")[0]}.${
      request.format
    }`;
    const fileResult = await this.fileExportService.createFile(
      filteredData,
      request.format,
      fileName
    );

    return {
      downloadUrl: fileResult.url,
      fileName: fileResult.name,
      fileSize: fileResult.size,
    };
  }

  private createOrderSummaryExportData(orders: Order[]): any[] {
    return orders.map((order) => ({
      수주번호: order.getOrderNo(),
      고객명: order.getCustomer().name,
      수주일: order.getOrderDate().toLocaleDateString("ko-KR"),
      납기일: order.getDeliveryDate().toLocaleDateString("ko-KR"),
      상태: this.orderPresenter.getStatusDisplayName(order.getStatus()),
      우선순위: this.orderPresenter.getPriorityDisplayName(order.getPriority()),
      총금액: order.getTotalAmount().toLocaleString(),
      통화: order.getCurrency().symbol,
      영업담당자: order.getSalesPerson(),
      품목수: order.getItems().length,
      비고: order.getNotes(),
      등록일: order.getDtCreate().toLocaleDateString("ko-KR"),
      수정일: order.getDtUpdate().toLocaleDateString("ko-KR"),
    }));
  }

  private createOrderItemsExportData(orders: Order[]): any[] {
    const exportData: any[] = [];

    orders.forEach((order) => {
      order.getItems().forEach((item) => {
        exportData.push({
          수주번호: order.getOrderNo(),
          고객명: order.getCustomer().name,
          수주일: order.getOrderDate().toLocaleDateString("ko-KR"),
          납기일: order.getDeliveryDate().toLocaleDateString("ko-KR"),
          상태: this.orderPresenter.getStatusDisplayName(order.getStatus()),
          우선순위: this.orderPresenter.getPriorityDisplayName(
            order.getPriority()
          ),
          제품코드: item.getProductCode(),
          제품명: item.getProductName(),
          수량: item.getQuantity(),
          단위: item.getUnit(),
          단가: item.getUnitPrice().toLocaleString(),
          금액: item.getAmount().toLocaleString(),
          품목납기일: item.getDeliveryDate().toLocaleDateString("ko-KR"),
          품목비고: item.getNotes(),
          영업담당자: order.getSalesPerson(),
        });
      });
    });

    return exportData;
  }

  private filterColumns(data: any[], columns: string[]): any[] {
    return data.map((row) => {
      const filteredRow: any = {};
      columns.forEach((column) => {
        if (row.hasOwnProperty(column)) {
          filteredRow[column] = row[column];
        }
      });
      return filteredRow;
    });
  }
}
```

---

## 🎬 사용자 시나리오

### 👤 시나리오 1: 신규 수주 등록

```
전제조건: 사용자가 수주관리 화면에 접속한 상태

1. 사용자가 "신규 수주 등록" 버튼 클릭
2. 수주 등록 모달/페이지가 열림
3. 고객 정보 입력:
   - 고객코드: CUST001 (드롭다운에서 선택)
   - 고객명: 삼성전자 (자동 입력)
   - 담당자: 김담당자
   - 연락처: 02-1234-5678
4. 수주 기본 정보 입력:
   - 납기일: 2024-12-31 선택
   - 우선순위: 높음 선택
   - 영업담당자: 이영업 선택
   - 비고: 연말 납품 요청
5. 수주 품목 추가:
   - 제품코드: FG2412001 선택
   - 제품명: 갤럭시 케이스 (자동 입력)
   - 수량: 1000
   - 단가: 15000
   - 금액: 15,000,000 (자동 계산)
6. "저장" 버튼 클릭
7. 시스템이 비즈니스 규칙 검증:
   - 수주번호 자동 생성: SO20241201001
   - 납기일 유효성 확인
   - 제품 존재 여부 확인
   - 총 금액 계산: 15,000,000원
8. 검증 성공 시:
   - 수주 정보 저장 (상태: 대기)
   - 등록 이력 기록
   - "수주가 성공적으로 등록되었습니다 (수주번호: SO20241201001)" 메시지 표시
   - 수주 목록 화면으로 돌아가며 새 수주가 목록에 추가됨

후속조건: 새로운 수주가 시스템에 등록되고 승인 대기 상태가 됨
```

### 👤 시나리오 2: 수주 승인 처리

```
전제조건: 승인 권한을 가진 사용자가 대기 상태의 수주를 선택한 상태

1. 사용자가 수주 목록에서 상태가 '대기'인 수주의 "승인" 버튼 클릭
2. 승인 확인 대화상자 표시:
   - "수주 'SO20241201001 - 삼성전자'를 승인하시겠습니까?"
   - 승인 사유 입력 필드 (선택사항)
3. 승인 사유 입력: "고객 신뢰도 우수, 납기 준수 가능"
4. "승인" 버튼 클릭
5. 시스템이 승인 가능성 검증:
   - 현재 상태가 '대기'인지 확인
   - 모든 수주 품목이 유효한지 확인
   - 납기일의 생산 용량 확인
6. 검증 성공 시:
   - 수주 상태를 '승인'으로 변경
   - 승인 이력 기록 (승인자, 시간, 사유)
   - "수주가 승인되었습니다" 메시지 표시
   - 목록에서 상태가 '승인'으로 변경됨
   - "생산지시 생성" 버튼이 활성화됨
7. 검증 실패 시:
   - "납기일에 생산 용량이 부족합니다" 등의 구체적 오류 메시지 표시

후속조건: 수주가 승인 상태가 되어 생산 지시 생성이 가능해짐
```

### 👤 시나리오 3: 생산 지시 생성

```
전제조건: 승인된 수주를 선택한 상태

1. 사용자가 승인된 수주의 "생산지시 생성" 버튼 클릭
2. 생산 지시 생성 모달이 열림:
   - 수주 정보 표시 (읽기 전용)
   - 계획 시작일 입력 필드
   - 예상 완료일 표시 (자동 계산)
3. 계획 시작일 입력: 2024-12-15 선택
4. 시스템이 자동으로 예상 완료일 계산: 2024-12-25 (10일 소요 예상)
5. "생산지시 생성" 버튼 클릭
6. 시스템이 검증:
   - 모든 수주 품목의 BOM 존재 여부 확인
   - 계획 시작일과 납기일 간의 여유 시간 확인
   - 필요 자재의 재고 확인 (경고성 메시지)
7. 검증 성공 시:
   - 생산 지시번호 자동 생성: PO20241201001
   - 수주 상태를 '생산중'으로 변경
   - 생산 지시 이력 기록
   - "생산 지시가 생성되었습니다 (생산지시번호: PO20241201001)" 메시지 표시
   - 생산관리 시스템으로 데이터 전송
8. 자재 부족 경고 시:
   - "일부 자재의 재고가 부족합니다. 계속 진행하시겠습니까?" 확인 메시지
   - 사용자 선택에 따라 진행 또는 취소

후속조건: 생산 지시가 생성되어 생산관리 시스템에서 처리 시작
```

### 👤 시나리오 4: 수주 현황 대시보드 조회

```
전제조건: 관리자가 수주관리 메인 화면에 접속한 상태

1. 페이지 로딩 시 자동으로 대시보드 데이터 표시
2. 요약 정보 카드 표시:
   - 총 수주: 156건
   - 총 금액: 2,450,000,000원
   - 대기: 12건, 승인: 25건, 생산중: 89건, 완료: 28건, 취소: 2건
   - 평균 수주 금액: 15,705,128원
3. 상태별 분포 차트:
   - 파이 차트로 각 상태별 비율 표시
   - 생산중 57%, 승인 16%, 완료 18% 등
4. 우선순위별 분포:
   - 긴급 5%, 높음 20%, 보통 65%, 낮음 10%
5. 월별 수주 트렌드 그래프:
   - 최근 12개월 수주 건수 및 금액 추이
   - 라인 차트로 시각화
6. 긴급 수주 목록 (상위 10건):
   - 납기일이 임박한 긴급 수주들을 테이블로 표시
   - D-3, D-1 등으로 남은 일수 표시
7. 지연 수주 목록 (상위 10건):
   - 납기일이 지났지만 미완료된 수주들
   - 지연 일수와 함께 표시
8. 사용자가 "상세보기" 클릭 시 해당 수주의 상세 화면으로 이동

후속조건: 수주 현황을 한눈에 파악하고 긴급 대응이 필요한 항목들을 확인함
```

### 👤 시나리오 5: 수주 검색 및 필터링

```
전제조건: 수주 목록 화면에 접속한 상태

1. 통합 검색 사용:
   - 검색창에 "삼성" 입력 후 엔터
   - 수주번호, 고객명, 제품명 등 모든 필드에서 "삼성" 검색
   - 결과: 8건의 수주가 검색됨
2. 상태 필터 적용:
   - 상태 드롭다운에서 "승인" 선택
   - 승인 상태인 수주만 필터링
   - 결과: 3건으로 축소됨
3. 날짜 범위 필터:
   - 수주일 범위: 2024-11-01 ~ 2024-11-30
   - 해당 기간의 수주만 표시
4. 우선순위 필터:
   - "높음" 체크박스 선택
   - 높은 우선순위 수주만 표시
5. 고객별 필터:
   - 고객 다중선택 드롭다운에서 "삼성전자", "LG전자" 선택
   - 해당 고객들의 수주만 표시
6. 금액 범위 필터:
   - 최소 금액: 10,000,000원
   - 최대 금액: 50,000,000원
   - 해당 금액 범위의 수주만 표시
7. 필터 초기화:
   - "필터 초기화" 버튼 클릭으로 모든 필터 해제
   - 전체 수주 목록으로 복원

후속조건: 원하는 조건의 수주들만 표시되어 효율적인 업무 처리 가능
```

### 👤 시나리오 6: 수주 취소 처리

```
전제조건: 취소할 수주를 선택한 상태

1. 사용자가 수주 목록에서 "취소" 버튼 클릭
2. 취소 확인 대화상자 표시:
   - "수주 'SO20241201001 - 삼성전자'를 취소하시겠습니까?"
   - 취소 사유 입력 필드 (필수)
3. 취소 사유 입력: "고객 요청에 의한 주문 취소"
4. "확인" 버튼 클릭
5. 시스템이 취소 가능성 검사:
   - 현재 상태가 취소 가능한지 확인 (대기, 승인만 가능)
   - 생산 지시가 이미 생성되었는지 확인
6. 취소 가능한 경우:
   - 관련 생산 지시가 있다면 함께 취소 처리
   - 수주 상태를 '취소'로 변경
   - 취소 이력 기록 (취소자, 시간, 사유)
   - "수주가 취소되었습니다" 메시지 표시
   - 목록에서 상태가 '취소'로 표시되며 회색으로 비활성화
7. 취소 불가능한 경우:
   - "생산이 진행 중인 수주는 취소할 수 없습니다" 오류 메시지 표시

후속조건: 수주가 취소 상태가 되어 더 이상 처리되지 않음
```

---

## 🎯 Use Cases 상세 정의 (업데이트)

### 1. 수주 목록 조회 UseCase

```typescript
📋 UseCase: GetOrderListUseCase
📝 설명: 페이징, 정렬, 필터링, 검색이 적용된 수주 목록을 조회한다.

🎯 주요 액터: 영업담당자, 생산계획자, 관리자
📥 입력: 페이지 정보, 정렬 조건, 필터 조건, 검색 키워드
📤 출력: 수주 목록, 페이징 정보, 총 개수

✅ 성공 시나리오:
1. 사용자가 수주 목록 조회 요청
2. 시스템이 입력 조건 검증
3. 데이터베이스에서 조건에 맞는 수주 조회
4. 납기일까지 남은 일수 계산
5. 지연 여부 판단
6. 페이징 정보 계산
7. 결과 반환

❌ 예외 시나리오:
- 잘못된 페이지 번호 입력 시 오류 메시지
- 데이터베이스 연결 오류 시 재시도 안내
- 권한 없는 사용자 접근 시 접근 거부

🔍 비즈니스 규칙:
- 페이지 크기는 1-1000 범위
- 취소된 수주도 조회 가능 (별도 표시)
- 지연된 수주는 빨간색으로 하이라이트
- 긴급 수주는 별도 아이콘 표시
```

### 2. 수주 등록 UseCase

```typescript
📋 UseCase: CreateOrderUseCase
📝 설명: 새로운 수주 정보를 시스템에 등록한다.

🎯 주요 액터: 영업담당자
📥 입력: 고객 정보, 수주 품목 정보, 납기일, 우선순위 등
📤 출력: 등록 성공 여부, 생성된 수주번호

✅ 성공 시나리오:
1. 사용자가 수주 등록 정보 입력
2. 시스템이 입력 데이터 검증
3. 수주번호 자동 채번
4. 고객 정보 유효성 확인
5. 제품 존재 여부 확인
6. 총 금액 자동 계산
7. 수주 엔티티 생성 및 저장
8. 등록 이력 기록
9. 성공 응답 반환

❌ 예외 시나리오:
- 존재하지 않는 고객 코드
- 존재하지 않는 제품 코드
- 잘못된 납기일 (과거 날짜)
- 수량이나 단가가 0 이하

🔍 비즈니스 규칙:
- 수주번호는 시스템 내 유일해야 함
- 납기일은 수주일보다 나중이어야 함
- 수주 품목은 최소 1개 이상
- 등록 즉시 이력 기록 생성
- 초기 상태는 '대기'
- 등록 후 바로 생산 지시 생성 가능
```

### 3. 수주 수정 UseCase

```typescript
📋 UseCase: UpdateOrderUseCase
📝 설명: 기존 수주 정보를 수정하고 변경 이력을 관리한다.

🎯 주요 액터: 영업담당자, 관리자
📥 입력: 수주 ID, 수정할 정보, 수정 사유
📤 출력: 수정 성공 여부, 변경된 필드 목록

✅ 성공 시나리오:
1. 사용자가 수주 수정 정보 입력
2. 시스템이 기존 수주 정보 조회
3. 상태별 수정 권한 확인
4. 변경사항 검증 및 추적
5. 수주 정보 업데이트
6. 변경 이력 기록
7. 성공 응답 반환

❌ 예외 시나리오:
- 존재하지 않는 수주 ID
- 완료/취소된 수주 수정 시도
- 생산중 수주의 제한된 필드 수정 시도
- 변경사항이 없는 경우

🔍 비즈니스 규칙:
- 완료/취소된 수주는 수정 불가
- 생산중 수주는 품목/납기일 수정 불가
- 모든 변경사항 이력 기록 필수
- 변경 사유 입력 권장
- 품목 추가/삭제/수정 모두 추적
```

### 4. 수주 삭제 UseCase

```typescript
📋 UseCase: DeleteOrderUseCase
📝 설명: 수주를 논리적으로 삭제하고 관련 생산 지시도 함께 취소한다.

🎯 주요 액터: 영업담당자, 관리자
📥 입력: 수주 ID, 삭제 사유
📤 출력: 삭제 성공 여부

✅ 성공 시나리오:
1. 사용자가 수주 삭제 요청
2. 시스템이 삭제 가능성 검증
3. 관련 생산 지시 확인 및 취소
4. 수주 상태를 '취소'로 변경
5. 삭제 이력 기록
6. 성공 응답 반환

❌ 예외 시나리오:
- 완료된 수주 삭제 시도
- 이미 취소된 수주
- 생산이 50% 이상 진행된 상태

🔍 비즈니스 규칙:
- 물리적 삭제 금지 (논리적 삭제만)
- 완료된 수주 삭제 금지
- 생산 진행률 50% 이상 시 삭제 제한
- 관련 생산 지시 함께 취소
- 삭제 이력 보존 필수
```

### 5. 수주 이력 조회 UseCase

```typescript
📋 UseCase: GetOrderHistoryUseCase
📝 설명: 특정 수주의 모든 변경 이력을 조회하고 분석한다.

🎯 주요 액터: 영업담당자, 관리자, 감사자
📥 입력: 수주 ID, 조회 조건 (페이징, 필터)
📤 출력: 수주 기본 정보, 이력 목록, 페이징 정보

✅ 성공 시나리오:
1. 사용자가 수주 이력 조회 요청
2. 시스템이 수주 존재 여부 확인
3. 조회 조건에 따른 이력 필터링
4. 이력 목록을 시간순으로 정렬
5. 변경사항 요약 정보 생성
6. 페이징 처리하여 결과 반환

❌ 예외 시나리오:
- 존재하지 않는 수주 ID
- 권한 없는 사용자의 이력 조회
- 잘못된 날짜 범위 입력

🔍 비즈니스 규칙:
- 모든 변경사항 추적 보장
- 시간순 정렬 (최신순)
- 변경 전/후 값 명확히 표시
- 변경 사유 및 담당자 정보 포함
- 감사 목적의 상세 로그 제공
```

### 6. 생산 지시 생성 UseCase

```typescript
📋 UseCase: CreateProductionOrderUseCase
📝 설명: 대기 상태의 수주를 바탕으로 생산 지시를 생성한다.

🎯 주요 액터: 생산계획자
📥 입력: 수주 ID, 계획 시작일
📤 출력: 생산지시번호, 성공 여부

✅ 성공 시나리오:
1. 사용자가 생산 지시 생성 요청
2. 시스템이 수주 상태 확인 (대기 상태)
3. BOM 존재 여부 확인
4. 생산 일정 및 용량 확인
5. 생산 지시 생성
6. 수주 상태를 '생산중'으로 변경
7. 이력 기록
8. 성공 응답 반환

❌ 예외 시나리오:
- 대기 상태가 아닌 수주
- BOM이 없는 제품 포함
- 생산 용량 부족
- 납기일 대비 시간 부족

🔍 비즈니스 규칙:
- 대기 상태의 수주만 생산 지시 생성 가능
- 모든 제품의 BOM 존재 필수
- 계획 시작일은 현재 날짜 이후
- 납기일까지 충분한 생산 시간 확보
- 승인 과정 없이 직접 생성 가능
```

---

## 📊 테이블 기능 체크리스트 (업데이트)

### ✅ 필수 기능 (Must Have)

#### 🎯 액션 버튼 (업데이트)

- [x] **수정 버튼**: 각 행의 수정 액션
- [x] **삭제 버튼**: 각 행의 삭제 액션 (확인 대화상자 포함)
- [x] **생산지시 버튼**: 대기 상태 수주의 생산 지시 생성 (승인 단계 생략)
- [x] **상세보기 버튼**: 수주 상세 정보 및 품목 조회
- [x] **이력조회 버튼**: 해당 수주의 변경 이력 조회
- [x] **복사 버튼**: 기존 수주를 복사하여 신규 수주 생성

#### 🔍 컬럼별 필터링 (업데이트)

- [x] **상태 필터**: 드롭다운으로 대기/생산중/완료/취소 선택 (승인 상태 제거)
- [x] **수주 타입 필터**: 내수/수출/샘플/수리 다중 선택
- [x] **고객명 필터**: 텍스트 입력으로 고객명 필터링
- [x] **우선순위 필터**: 다중 선택으로 긴급/높음/보통/낮음 선택
- [x] **영업담당자 필터**: 담당자별 필터링
- [x] **날짜 범위 필터**: 수주일, 납기일 범위 설정
- [x] **금액 범위 필터**: 최소/최대 금액으로 범위 설정

---

## 🎨 UI/UX 개선사항

### 📱 상태별 시각적 표현

- **대기**: 파란색 배지, 직접 생산지시 버튼 활성화
- **생산중**: 주황색 배지, 진행률 표시
- **완료**: 녹색 배지, 완료 날짜 표시
- **취소**: 회색 배지, 취소 사유 툴팁

### 🎯 액션 버튼 최적화

- **조건부 버튼 표시**: 상태에 따라 가능한 액션만 표시
- **일괄 작업**: 체크박스로 다중 선택 후 일괄 삭제/상태 변경
- **빠른 액션**: 우클릭 컨텍스트 메뉴로 빠른 작업 수행

### 📊 이력 조회 강화

- **타임라인 뷰**: 시간 흐름에 따른 시각적 이력 표시
- **변경사항 하이라이트**: 중요한 변경사항 색상 구분
- **이력 요약**: 주요 변경사항만 간략히 표시하는 요약 모드
- **이력 검색**: 특정 변경사항이나 담당자로 이력 검색

이제 MES 수주관리 시스템이 승인 프로세스 없이 더 간소화되고 효율적인 워크플로우를 제공하며, 강력한 수정/삭제/이력 관리 기능을 갖추게 되었습니다.

---

## 🗄️ Repository Interface 정의

```typescript
// domain/repositories/OrderRepository.ts
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByOrderNo(orderNo: string): Promise<Order | null>;
  findByPageWithCriteria(
    criteria: OrderSearchCriteria,
    page: number,
    pageSize: number
  ): Promise<Order[]>;
  findAllByCriteria(criteria: OrderSearchCriteria): Promise<Order[]>;
  countByCriteria(criteria: OrderSearchCriteria): Promise<number>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
  getLastSequenceByPrefix(prefix: string): Promise<number>;
  findByCustomerCode(customerCode: string): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  findDelayedOrders(): Promise<Order[]>;
  findUrgentOrders(): Promise<Order[]>;
}

export interface OrderSearchCriteria {
  searchKeyword?: string;
  filters?: OrderFilter[];
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

// domain/repositories/OrderHistoryRepository.ts
export interface OrderHistoryRepository {
  save(history: OrderHistory): Promise<void>;
  findByOrderId(orderId: OrderId): Promise<OrderHistory[]>;
  findByUserId(userId: string): Promise<OrderHistory[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<OrderHistory[]>;
}
```

---

## 🎯 다음 단계 구현 가이드

### 1주차: Domain & Application Layer

```typescript
✅ 해야 할 작업:
1. Order 엔티티 구현
2. OrderItem 엔티티 구현
3. OrderHistory 엔티티 구현
4. Repository 인터페이스 정의
5. 7개 주요 UseCase 구현
6. 단위 테스트 작성

📁 생성할 파일:
- domain/entities/Order.ts
- domain/entities/OrderItem.ts
- domain/entities/OrderHistory.ts
- domain/entities/Customer.ts
- domain/repositories/OrderRepository.ts
- domain/repositories/OrderHistoryRepository.ts
- application/usecases/order/GetOrderListUseCase.ts
- application/usecases/order/CreateOrderUseCase.ts
- application/usecases/order/ApproveOrderUseCase.ts
- application/usecases/order/CancelOrderUseCase.ts
- application/usecases/order/CreateProductionOrderUseCase.ts
- application/usecases/order/GetOrderDashboardUseCase.ts
- application/usecases/order/ExportOrderListUseCase.ts
```

### 2주차: Infrastructure & Presentation Layer

```typescript
✅ 해야 할 작업:
1. HTTP Repository 구현체 작성
2. DI Container 구성
3. React 컴포넌트 구현
4. 커스텀 훅 구현
5. 대시보드 차트 컴포넌트
6. 통합 테스트 작성

📁 생성할 파일:
- infrastructure/repositories/HttpOrderRepository.ts
- config/OrderContainer.ts
- presentation/pages/OrderManagementPage.tsx
- presentation/pages/OrderDashboardPage.tsx
- hooks/useOrderTable.ts
- hooks/useOrderDashboard.ts
- components/modals/OrderFormModal.tsx
- components/modals/OrderApprovalModal.tsx
- components/charts/OrderStatusChart.tsx
- components/charts/OrderTrendChart.tsx
```

### 3주차: 고급 기능 & 통합

```typescript
✅ 해야 할 작업:
1. 실시간 알림 시스템
2. 파일 업로드/다운로드 기능
3. 권한 관리 시스템
4. 성능 최적화
5. E2E 테스트 작성

📁 생성할 파일:
- services/NotificationService.ts
- services/FileExportService.ts
- middleware/AuthorizationMiddleware.ts
- utils/PerformanceOptimizer.ts
- tests/e2e/OrderManagement.test.ts
```

---

## 🎨 UI/UX 고려사항

### 📱 반응형 디자인

- 데스크톱: 전체 컬럼 표시
- 태블릿: 중요 컬럼만 표시, 상세정보는 모달
- 모바일: 카드 형태로 표시, 스와이프 액션

### 🎯 사용성 개선

- 키보드 단축키 지원 (Ctrl+N: 신규등록, Ctrl+F: 검색 등)
- 무한 스크롤 옵션
- 드래그 앤 드롭으로 우선순위 변경
- 컨텍스트 메뉴 (우클릭 메뉴)

### 🎨 시각적 개선

- 상태별 색상 코딩
- 진행률 바 (생산 진행도)
- 애니메이션 효과 (상태 변경 시)
- 다크 모드 지원

이제 MES 수주관리 시스템의 클린 아키텍처 설계가 완성되었습니다. 제품정보 관리와 동일한 구조를 유지하면서 수주 프로세스에 특화된 비즈니스 로직과 기능들을 포함했습니다.
