# MES 제품정보 관리 시스템 클린 아키텍처

## 🎯 시스템 개요

**제조실행시스템(MES)의 제품정보 관리 모듈 - 완제품, 반제품, 원자재의 통합 관리**

---

## 🏗️ Domain Layer (도메인 계층)

### 📦 1. Entities (엔티티) - 핵심 비즈니스 객체

#### Product (제품) 엔티티
```typescript
// domain/entities/Product.ts
export class Product {
  constructor(
    private readonly id: ProductId,
    private readonly cd_material: string,
    private readonly nm_material: string,
    private readonly type: ProductType,
    private readonly category: Category,
    private readonly unit: Unit,
    private readonly safetyStock: number,
    private readonly isActive: boolean,
    private readonly additionalInfo: AdditionalInfo,
    private readonly id_create: string,
    private readonly id_updated: string,
    private readonly dt_create: Date,
    private readonly dt_update: Date
  ) {
    this.validateProduct();
  }

  // 비즈니스 규칙: 제품 정보 검증
  private validateProduct(): void {
    if (!this.cd_material || this.cd_material.trim().length === 0) {
      throw new Error('제품코드는 필수입니다.');
    }
    if (!this.nm_material || this.nm_material.trim().length === 0) {
      throw new Error('제품명은 필수입니다.');
    }
    if (this.safetyStock < 0) {
      throw new Error('안전재고는 0 이상이어야 합니다.');
    }
    if (!this.id_create || this.id_create.trim().length === 0) {
      throw new Error('생성자는 필수입니다.');
    }
    if (!this.id_updated || this.id_updated.trim().length === 0) {
      throw new Error('수정자는 필수입니다.');
    }
  }

  // 비즈니스 로직: 생산 가능 여부
  public canBeProduced(): boolean {
    return this.isActive && 
           (this.type === ProductType.FINISHED_PRODUCT || this.type === ProductType.SEMI_FINISHED);
  }

  // 비즈니스 로직: 원자재 여부
  public isRawMaterial(): boolean {
    return this.type === ProductType.RAW_MATERIAL;
  }

  // 비즈니스 로직: BOM 구성 가능 여부
  public canHaveBOM(): boolean {
    return this.type === ProductType.FINISHED_PRODUCT || this.type === ProductType.SEMI_FINISHED;
  }

  // 비즈니스 로직: 안전재고 부족 여부
  public isBelowSafetyStock(currentStock: number): boolean {
    return currentStock < this.safetyStock;
  }

  // Getters
  public getId(): ProductId { return this.id; }
  public getCdMaterial(): string { return this.cd_material; }
  public getNmMaterial(): string { return this.nm_material; }
  public getType(): ProductType { return this.type; }
  public getCategory(): Category { return this.category; }
  public getUnit(): Unit { return this.unit; }
  public getSafetyStock(): number { return this.safetyStock; }
  public getIsActive(): boolean { return this.isActive; }
  public getAdditionalInfo(): AdditionalInfo { return this.additionalInfo; }
  public getIdCreate(): string { return this.id_create; }
  public getIdUpdated(): string { return this.id_updated; }
  public getDtCreate(): Date { return this.dt_create; }
  public getDtUpdate(): Date { return this.dt_update; }
}

// 제품코드 자동 채번 서비스
export interface ProductCodeGenerator {
  generateCode(type: ProductType): Promise<string>;
}

export class DefaultProductCodeGenerator implements ProductCodeGenerator {
  constructor(private productRepository: ProductRepository) {}

  async generateCode(type: ProductType): Promise<string> {
    const prefix = this.getPrefix(type);
    const today = new Date();
    const yearMonth = today.getFullYear().toString().slice(2) + 
                     (today.getMonth() + 1).toString().padStart(2, '0');
    
    // 해당 년월의 마지막 시퀀스 번호 조회
    const lastSequence = await this.productRepository.getLastSequenceByPrefix(prefix + yearMonth);
    const nextSequence = (lastSequence + 1).toString().padStart(3, '0');
    
    return `${prefix}${yearMonth}${nextSequence}`;
  }

  private getPrefix(type: ProductType): string {
    switch (type) {
      case ProductType.FINISHED_PRODUCT:
        return 'FG'; // Finished Goods
      case ProductType.SEMI_FINISHED:
        return 'SF'; // Semi Finished
      case ProductType.RAW_MATERIAL:
        return 'RM'; // Raw Material
      default:
        return 'PR'; // Product
    }
  }
}

// 채번 예시: FG2412001, SF2412001, RM2412001
export class ProductId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('Product ID는 필수입니다.');
    }
  }
  
  public getValue(): string { return this.value; }
  public equals(other: ProductId): boolean {
    return this.value === other.value;
  }
}

export enum ProductType {
  FINISHED_PRODUCT = 'FINISHED_PRODUCT',    // 완제품
  SEMI_FINISHED = 'SEMI_FINISHED',          // 반제품
  RAW_MATERIAL = 'RAW_MATERIAL'             // 원자재
}

export class Category {
  constructor(
    public readonly code: string,
    public readonly name: string
  ) {}
}

export class Unit {
  constructor(
    public readonly code: string,    // EA, KG, M, L 등
    public readonly name: string     // 개, 킬로그램, 미터, 리터 등
  ) {}
}

export class AdditionalInfo {
  constructor(
    public readonly description?: string,
    public readonly specifications?: string,
    public readonly notes?: string,
    public readonly customFields?: Map<string, any>
  ) {}
}

// 제품 이력 엔티티
export class ProductHistory {
  constructor(
    private readonly id: string,
    private readonly productId: ProductId,
    private readonly action: HistoryAction,
    private readonly changedFields: ChangedField[],
    private readonly userId: string,
    private readonly userName: string,
    private readonly timestamp: Date,
    private readonly reason?: string
  ) {}

  public getId(): string { return this.id; }
  public getProductId(): ProductId { return this.productId; }
  public getAction(): HistoryAction { return this.action; }
  public getChangedFields(): ChangedField[] { return this.changedFields; }
  public getUserId(): string { return this.userId; }
  public getUserName(): string { return this.userName; }
  public getTimestamp(): Date { return this.timestamp; }
  public getReason(): string | undefined { return this.reason; }
}

export enum HistoryAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE'
}

export class ChangedField {
  constructor(
    public readonly fieldName: string,
    public readonly oldValue: any,
    public readonly newValue: any
  ) {}
}
```

---

## 🎯 Application Layer (애플리케이션 계층)

### 🔄 Use Cases (유스케이스)

#### 1. 제품 목록 조회 UseCase
```typescript
// application/usecases/product/GetProductListUseCase.ts
export interface GetProductListRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  searchKeyword?: string;          // 모든 컬럼 통합 검색
  filters?: ProductFilter[];
}

export interface ProductFilter {
  field: 'type' | 'category' | 'unit' | 'isActive';
  value: any;
}

export interface GetProductListResponse {
  products: ProductListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface ProductListItem {
  id: string;
  cd_material: string;
  nm_material: string;
  type: string;
  typeName: string;
  category: string;
  categoryName: string;
  unit: string;
  unitName: string;
  safetyStock: number;
  isActive: boolean;
  statusDisplay: string;
  lastUpdated: Date;
}

export class GetProductListUseCase {
  constructor(
    private productRepository: ProductRepository,
    private productPresenter: ProductPresenter
  ) {}

  async execute(request: GetProductListRequest): Promise<GetProductListResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 검색 조건 구성
    const searchCriteria = this.buildSearchCriteria(request);

    // 3. 제품 목록 조회 (페이징 포함)
    const products = await this.productRepository.findByPageWithCriteria(
      searchCriteria,
      request.page,
      request.pageSize
    );

    // 4. 전체 개수 조회
    const totalCount = await this.productRepository.countByCriteria(searchCriteria);

    // 5. 프레젠테이션 데이터 변환
    const productListItems = products.map(product => ({
      id: product.getId().getValue(),
      cd_material: product.getCdMaterial(),
      nm_material: product.getNmMaterial(),
      type: product.getType(),
      typeName: this.productPresenter.getTypeDisplayName(product.getType()),
      category: product.getCategory().code,
      categoryName: product.getCategory().name,
      unit: product.getUnit().code,
      unitName: product.getUnit().name,
      safetyStock: product.getSafetyStock(),
      isActive: product.getIsActive(),
      statusDisplay: product.getIsActive() ? '사용' : '미사용',
      lastUpdated: product.getDtUpdate()
    }));

    // 6. 페이징 정보 계산
    const totalPages = Math.ceil(totalCount / request.pageSize);
    const hasNextPage = request.page < totalPages;

    return {
      products: productListItems,
      totalCount,
      currentPage: request.page,
      totalPages,
      hasNextPage
    };
  }

  private validateRequest(request: GetProductListRequest): void {
    if (request.page < 1) {
      throw new Error('페이지 번호는 1 이상이어야 합니다.');
    }
    if (request.pageSize < 1 || request.pageSize > 1000) {
      throw new Error('페이지 크기는 1-1000 범위여야 합니다.');
    }
  }

  private buildSearchCriteria(request: GetProductListRequest): ProductSearchCriteria {
    return {
      searchKeyword: request.searchKeyword,
      filters: request.filters || [],
      sortBy: request.sortBy || 'code',
      sortDirection: request.sortDirection || 'asc'
    };
  }
}
```

#### 2. 제품 정보 등록 UseCase
```typescript
// application/usecases/product/CreateProductUseCase.ts
export interface CreateProductRequest {
  nm_material: string;
  type: ProductType;
  category: {
    code: string;
    name: string;
  };
  unit: {
    code: string;
    name: string;
  };
  safetyStock: number;
  isActive: boolean;
  additionalInfo?: {
    description?: string;
    specifications?: string;
    notes?: string;
  };
  id_create: string; // 생성자 ID
}

export interface CreateProductResponse {
  productId: string;
  success: boolean;
  message: string;
}

export class CreateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private productHistoryRepository: ProductHistoryRepository,
    private productCodeGenerator: ProductCodeGenerator
  ) {}

  async execute(request: CreateProductRequest): Promise<CreateProductResponse> {
    // 1. 비즈니스 규칙 검증
    await this.validateBusinessRules(request);

    // 2. 제품 코드 자동 채번
    const cd_material = await this.productCodeGenerator.generateCode(request.type);

    // 3. 제품 엔티티 생성
    const productId = new ProductId(this.generateProductId());
    const category = new Category(request.category.code, request.category.name);
    const unit = new Unit(request.unit.code, request.unit.name);
    const additionalInfo = new AdditionalInfo(
      request.additionalInfo?.description,
      request.additionalInfo?.specifications,
      request.additionalInfo?.notes
    );

    const now = new Date();
    const product = new Product(
      productId,
      cd_material,
      request.nm_material,
      request.type,
      category,
      unit,
      request.safetyStock,
      request.isActive,
      additionalInfo,
      request.id_create,    // 생성자
      request.id_create,    // 수정자 (신규 등록 시 생성자와 동일)
      now,                  // dt_create
      now                   // dt_update
    );

    // 5. 저장
    await this.productRepository.save(product);

    // 6. 이력 기록
    const history = new ProductHistory(
      this.generateHistoryId(),
      productId,
      HistoryAction.CREATE,
      [],
      request.id_create,
      request.id_create, // 생성자명 (실제로는 사용자 정보 조회 필요)
      new Date(),
      '신규 제품 등록'
    );
    await this.productHistoryRepository.save(history);

    return {
      productId: productId.getValue(),
      success: true,
      message: '제품 정보가 성공적으로 등록되었습니다.'
    };
  }

  private async validateBusinessRules(request: CreateProductRequest): Promise<void> {
    if (request.safetyStock < 0) {
      throw new Error('안전재고는 0 이상이어야 합니다.');
    }
  }

  private generateProductId(): string {
    return 'PROD-' + Date.now().toString();
  }

  private generateHistoryId(): string {
    return 'HIST-' + Date.now().toString();
  }
}
```

#### 3. 제품 정보 수정 UseCase
```typescript
// application/usecases/product/UpdateProductUseCase.ts
export interface UpdateProductRequest {
  productId: string;
  nm_material?: string;
  type?: ProductType;
  category?: {
    code: string;
    name: string;
  };
  unit?: {
    code: string;
    name: string;
  };
  safetyStock?: number;
  isActive?: boolean;
  additionalInfo?: {
    description?: string;
    specifications?: string;
    notes?: string;
  };
  id_updated: string; // 수정자 ID
  reason?: string;
}

export class UpdateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private productHistoryRepository: ProductHistoryRepository
  ) {}

  async execute(request: UpdateProductRequest): Promise<void> {
    // 1. 제품 존재 확인
    const existingProduct = await this.productRepository.findById(new ProductId(request.productId));
    if (!existingProduct) {
      throw new Error('존재하지 않는 제품입니다.');
    }

    // 2. 비즈니스 규칙 검증
    await this.validateBusinessRules(existingProduct, request);

    // 3. 변경 사항 추적
    const changedFields = this.detectChanges(existingProduct, request);
    if (changedFields.length === 0) {
      throw new Error('변경된 항목이 없습니다.');
    }

    // 4. 제품 정보 업데이트 (새로운 엔티티 인스턴스 생성)
    const updatedProduct = this.createUpdatedProduct(existingProduct, request);

    // 5. 저장
    await this.productRepository.save(updatedProduct);

    // 6. 이력 기록
    const history = new ProductHistory(
      this.generateHistoryId(),
      existingProduct.getId(),
      HistoryAction.UPDATE,
      changedFields,
      request.userId,
      request.userName,
      new Date(),
      request.reason
    );
    await this.productHistoryRepository.save(history);
  }

  private async validateBusinessRules(
    existingProduct: Product, 
    request: UpdateProductRequest
  ): Promise<void> {
    // 완제품을 원자재로 변경하는 것은 금지
    if (existingProduct.getType() === ProductType.FINISHED_PRODUCT && 
        request.type === ProductType.RAW_MATERIAL) {
      throw new Error('완제품을 원자재로 변경할 수 없습니다.');
    }

    // 안전재고 검증
    if (request.safetyStock !== undefined && request.safetyStock < 0) {
      throw new Error('안전재고는 0 이상이어야 합니다.');
    }
  }

  private detectChanges(existingProduct: Product, request: UpdateProductRequest): ChangedField[] {
    const changes: ChangedField[] = [];

    if (request.nm_material && request.nm_material !== existingProduct.getNmMaterial()) {
      changes.push(new ChangedField('nm_material', existingProduct.getNmMaterial(), request.nm_material));
    }

    if (request.type && request.type !== existingProduct.getType()) {
      changes.push(new ChangedField('type', existingProduct.getType(), request.type));
    }

    if (request.safetyStock !== undefined && request.safetyStock !== existingProduct.getSafetyStock()) {
      changes.push(new ChangedField('safetyStock', existingProduct.getSafetyStock(), request.safetyStock));
    }

    if (request.isActive !== undefined && request.isActive !== existingProduct.getIsActive()) {
      changes.push(new ChangedField('isActive', existingProduct.getIsActive(), request.isActive));
    }

    return changes;
  }

  private createUpdatedProduct(existingProduct: Product, request: UpdateProductRequest): Product {
    const category = request.category 
      ? new Category(request.category.code, request.category.name)
      : existingProduct.getCategory();

    const unit = request.unit 
      ? new Unit(request.unit.code, request.unit.name)
      : existingProduct.getUnit();

    const additionalInfo = request.additionalInfo 
      ? new AdditionalInfo(
          request.additionalInfo.description,
          request.additionalInfo.specifications,
          request.additionalInfo.notes
        )
      : existingProduct.getAdditionalInfo();

    return new Product(
      existingProduct.getId(),
      existingProduct.getCdMaterial(), // 제품코드는 수정 불가
      request.nm_material ?? existingProduct.getNmMaterial(),
      request.type ?? existingProduct.getType(),
      category,
      unit,
      request.safetyStock ?? existingProduct.getSafetyStock(),
      request.isActive ?? existingProduct.getIsActive(),
      additionalInfo,
      existingProduct.getIdCreate(),  // 생성자는 변경 불가
      request.id_updated,             // 수정자 업데이트
      existingProduct.getDtCreate(),  // 생성일은 변경 불가
      new Date()                      // 수정일 업데이트
    );
  }

  private generateHistoryId(): string {
    return 'HIST-' + Date.now().toString();
  }
}
```

#### 4. 제품 정보 삭제 UseCase
```typescript
// application/usecases/product/DeleteProductUseCase.ts
export interface DeleteProductRequest {
  productId: string;
  id_updated: string; // 삭제 처리하는 사용자 ID
  reason?: string;
}

export class DeleteProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private productHistoryRepository: ProductHistoryRepository,
    private productUsageChecker: ProductUsageChecker
  ) {}

  async execute(request: DeleteProductRequest): Promise<void> {
    const product = await this.productRepository.findById(new ProductId(request.productId));
    if (!product) {
      throw new Error('존재하지 않는 제품입니다.');
    }

    // 비즈니스 규칙: 삭제 가능성 검사
    await this.validateDeletion(product);

    // 논리 삭제 (비활성화)
    const deletedProduct = new Product(
      product.getId(),
      product.getCdMaterial(),
      product.getNmMaterial(),
      product.getType(),
      product.getCategory(),
      product.getUnit(),
      product.getSafetyStock(),
      false, // 비활성화
      product.getAdditionalInfo(),
      product.getIdCreate(),
      request.id_updated,        // 수정자 업데이트
      product.getDtCreate(),
      new Date()                 // 수정일 업데이트
    );

    await this.productRepository.save(deletedProduct);

    // 이력 기록
    const history = new ProductHistory(
      this.generateHistoryId(),
      product.getId(),
      HistoryAction.DELETE,
      [new ChangedField('isActive', true, false)],
      request.id_updated,
      request.id_updated, // 사용자명 (실제로는 사용자 정보 조회 필요)
      new Date(),
      request.reason || '제품 삭제'
    );
    await this.productHistoryRepository.save(history);
  }

  private async validateDeletion(product: Product): Promise<void> {
    // 1. BOM에서 사용 중인지 확인
    const isUsedInBOM = await this.productUsageChecker.isUsedInBOM(product.getId());
    if (isUsedInBOM) {
      throw new Error('BOM에서 사용 중인 제품은 삭제할 수 없습니다.');
    }

    // 2. 생산 계획에서 사용 중인지 확인
    const isUsedInProduction = await this.productUsageChecker.isUsedInProduction(product.getId());
    if (isUsedInProduction) {
      throw new Error('생산 계획에서 사용 중인 제품은 삭제할 수 없습니다.');
    }

    // 3. 재고가 있는지 확인
    const hasStock = await this.productUsageChecker.hasStock(product.getId());
    if (hasStock) {
      throw new Error('재고가 있는 제품은 삭제할 수 없습니다.');
    }
  }

  private generateHistoryId(): string {
    return 'HIST-' + Date.now().toString();
  }
}
```

#### 5. 제품 정보 내보내기 UseCase
```typescript
// application/usecases/product/ExportProductListUseCase.ts
export interface ExportProductListRequest {
  format: 'excel' | 'csv';
  filters?: ProductFilter[];
  columns?: string[];
  includeHistory?: boolean;
}

export interface ExportProductListResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

export class ExportProductListUseCase {
  constructor(
    private productRepository: ProductRepository,
    private fileExportService: FileExportService,
    private productPresenter: ProductPresenter
  ) {}

  async execute(request: ExportProductListRequest): Promise<ExportProductListResponse> {
    // 1. 내보낼 제품 목록 조회 (페이징 없이 전체)
    const searchCriteria = {
      filters: request.filters || [],
      sortBy: 'code',
      sortDirection: 'asc' as const
    };

    const products = await this.productRepository.findAllByCriteria(searchCriteria);

    // 2. 내보내기 데이터 구성
    const exportData = products.map(product => ({
      제품코드: product.getCdMaterial(),
      제품명: product.getNmMaterial(),
      제품유형: this.productPresenter.getTypeDisplayName(product.getType()),
      카테고리: product.getCategory().name,
      단위: product.getUnit().name,
      안전재고: product.getSafetyStock(),
      사용여부: product.getIsActive() ? '사용' : '미사용',
      등록일: product.getDtCreate().toLocaleDateString('ko-KR'),
      수정일: product.getDtUpdate().toLocaleDateString('ko-KR')
    }));

    // 3. 컬럼 필터링
    const filteredData = request.columns 
      ? this.filterColumns(exportData, request.columns)
      : exportData;

    // 4. 파일 생성
    const fileName = `제품정보_${new Date().toISOString().split('T')[0]}.${request.format}`;
    const fileResult = await this.fileExportService.createFile(filteredData, request.format, fileName);

    return {
      downloadUrl: fileResult.url,
      fileName: fileResult.name,
      fileSize: fileResult.size
    };
  }

  private filterColumns(data: any[], columns: string[]): any[] {
    return data.map(row => {
      const filteredRow: any = {};
      columns.forEach(column => {
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

### 👤 시나리오 1: 신규 제품 등록
```
전제조건: 사용자가 제품정보 관리 화면에 접속한 상태

1. 사용자가 "신규 등록" 버튼 클릭
2. 제품 등록 모달/페이지가 열림
3. 필수 정보 입력:
   - 제품명: 삼성 갤럭시 케이스
   - 제품유형: 완제품 선택
   - 카테고리: 전자제품 선택
   - 단위: EA 선택
   - 안전재고: 100
   - 사용여부: 사용 체크
4. "저장" 버튼 클릭
5. 시스템이 비즈니스 규칙 검증 수행 및 제품코드 자동 채번
   - 제품코드 자동 생성: FG2412001 (완제품-2024년12월-001번)
   - 필수 항목 검증
   - 안전재고 범위 확인
6. 검증 성공 시:
   - 제품 정보 저장
   - 등록 이력 기록
   - "제품이 성공적으로 등록되었습니다 (제품코드: FG2412001)" 메시지 표시
   - 제품 목록 화면으로 돌아가며 새 제품이 목록에 추가됨고 범위 확인
6. 검증 성공 시:
   - 제품 정보 저장
   - 등록 이력 기록
   - "제품이 성공적으로 등록되었습니다" 메시지 표시
   - 제품 목록 화면으로 돌아가며 새 제품이 목록에 추가됨
7. 검증 실패 시:
   - 오류 메시지 표시
   - 사용자가 수정 후 재시도 가능

후속조건: 새로운 제품이 시스템에 등록되고 제품 목록에 표시됨
```

### 👤 시나리오 2: 등록된 제품 수정 (이력 관리)
```
전제조건: 제품 목록에서 수정할 제품을 선택한 상태

1. 사용자가 특정 제품 행의 "수정" 버튼 클릭
2. 제품 수정 모달이 열리며 기존 정보가 표시됨
3. 사용자가 변경할 정보 입력:
   - 제품명: "삼성 갤럭시 S24 케이스"로 변경
   - 안전재고: 100 → 150으로 변경
   - 수정 사유: "신제품 출시로 인한 수요 증가" 입력
4. "저장" 버튼 클릭
5. 시스템이 변경사항 검증:
   - 변경된 필드 식별 (제품명, 안전재고)
   - 비즈니스 규칙 확인
6. 검증 성공 시:
   - 제품 정보 업데이트
   - 변경 이력 기록 (변경 전/후 값, 사용자, 시간, 사유)
   - "제품 정보가 수정되었습니다" 메시지 표시
   - 목록에서 수정된 정보 반영
7. 사용자가 "이력조회" 버튼으로 변경 이력 확인 가능

후속조건: 제품 정보가 업데이트되고 모든 변경사항이 이력으로 기록됨
```

### 👤 시나리오 3: 등록된 제품 삭제
```
전제조건: 삭제할 제품을 선택한 상태

1. 사용자가 제품 행의 "삭제" 버튼 클릭
2. 확인 대화상자 표시: "제품 'FG004 삼성 갤럭시 케이스'를 삭제하시겠습니까?"
3. 사용자가 "확인" 클릭
4. 시스템이 삭제 가능성 검사:
   - BOM에서 사용 여부 확인
   - 생산 계획에서 사용 여부 확인
   - 현재 재고 존재 여부 확인
5. 삭제 가능한 경우:
   - 제품을 논리 삭제 (사용여부를 '미사용'으로 변경)
   - 삭제 이력 기록
   - "제품이 삭제되었습니다" 메시지 표시
   - 목록에서 해당 제품이 비활성 상태로 표시
6. 삭제 불가능한 경우:
   - "BOM에서 사용 중인 제품은 삭제할 수 없습니다" 등의 구체적 오류 메시지 표시

후속조건: 제품이 논리적으로 삭제되어 비활성 상태가 됨
```

### 👤 시나리오 4: 제품 이력 조회
```
전제조건: 제품 목록에서 이력을 조회할 제품을 선택한 상태

1. 사용자가 제품 행의 "이력조회" 버튼 클릭
2. 제품 이력 모달이 열림
3. 시간순으로 정렬된 이력 목록 표시:
   - 2024-01-15 10:30 | 김담당자 | 등록 | 신규 제품 등록
   - 2024-01-16 14:20 | 이관리자 | 수정 | 제품명: 갤럭시 케이스 → 갤럭시 S24 케이스
   - 2024-01-16 14:20 | 이관리자 | 수정 | 안전재고: 100 → 150 (신제품 출시로 인한 수요 증가)
   - 2024-01-17 09:15 | 박생산자 | 활성화 | 생산 계획 등록을 위한 활성화
4. 사용자가 특정 이력 항목 클릭 시 상세 변경사항 확인 가능
5. "닫기" 버튼으로 모달 종료

후속조건: 사용자가 제품의 모든 변경 이력을 확인함
```

### 👤 시나리오 5: 제품 검색 (통합 검색)
```
전제조건: 제품정보 관리 화면에 접속한 상태

1. 사용자가 검색창에 "갤럭시" 입력
2. 엔터키 또는 "검색" 버튼 클릭
3. 시스템이 모든 컬럼에서 "갤럭시" 키워드 검색:
   - 제품코드에 "갤럭시" 포함
   - 제품명에 "갤럭시" 포함
   - 카테고리에 "갤럭시" 포함
   - 기타 텍스트 필드에 "갤럭시" 포함
4. 검색 결과가 테이블에 표시됨:
   - FG001 | 삼성 갤럭시 스마트폰 | 완제품 | ...
   - FG004 | 삼성 갤럭시 S24 케이스 | 완제품 | ...
5. 검색 결과 상단에 "총 2건 검색됨" 표시
6. 사용자가 검색창을 비우고 엔터 시 전체 목록으로 복원

후속조건: 검색 조건에 맞는 제품들만 목록에 표시됨
```

### 👤 시나리오 6: 엑셀 업로드 및 다운로드
```
A. 엑셀 다운로드 시나리오:
1. 사용자가 "Excel 업로드" 버튼 클릭
2. 템플릿 다운로드 링크와 파일 선택 영역이 있는 모달 표시
3. "템플릿 다운로드" 클릭 시 표준 형식의 엑셀 파일 다운로드
4. 사용자가 템플릿에 제품 정보 입력
5. "파일 선택" 버튼으로 작성된 엑셀 파일 선택
6. "업로드" 버튼 클릭
7. 시스템이 파일 검증:
   - 형식 확인 (필수 컬럼 존재 여부)
   - 데이터 유효성 검사 (제품코드 중복, 필수값 등)
8. 검증 성공 시:
   - 일괄 등록 실행
   - "총 10건 중 8건 성공, 2건 실패" 등의 결과 표시
   - 실패 항목은 상세 오류 메시지와 함께 표시
9. 검증 실패 시:
   - 오류 목록 표시하여 사용자가 수정 후 재업로드 가능

B. 엑셀 다운로드 시나리오:
1. 사용자가 필요시 필터/검색 조건 설정
2. "Excel 다운로드" 버튼 클릭
3. 다운로드 옵션 모달 표시:
   - 포함할 컬럼 선택
   - 이력 정보 포함 여부
   - 파일 형식 (Excel/CSV)
4. "다운로드" 버튼 클릭
5. 현재 화면의 조건에 맞는 제품 데이터를 파일로 생성
6. 브라우저에서 자동 다운로드 시작

후속조건: 대량의 제품 데이터가 일괄 처리됨
```

---

## 🎯 Use Cases 상세 정의

### 1. 제품 목록 조회 UseCase
```typescript
📋 UseCase: GetProductListUseCase
📝 설명: 페이징, 정렬, 필터링, 검색이 적용된 제품 목록을 조회한다.

🎯 주요 액터: 제품 관리자, 생산 계획자, 품질 관리자
📥 입력: 페이지 정보, 정렬 조건, 필터 조건, 검색 키워드
📤 출력: 제품 목록, 페이징 정보, 총 개수

✅ 성공 시나리오:
1. 사용자가 제품 목록 조회 요청
2. 시스템이 입력 조건 검증
3. 데이터베이스에서 조건에 맞는 제품 조회
4. 페이징 정보 계산
5. 결과 반환

❌ 예외 시나리오:
- 잘못된 페이지 번호 입력 시 오류 메시지
- 데이터베이스 연결 오류 시 재시도 안내
- 권한 없는 사용자 접근 시 접근 거부

🔍 비즈니스 규칙:
- 페이지 크기는 1-1000 범위
- 비활성 제품도 조회 가능 (별도 표시)
- 검색은 모든 텍스트 컬럼 대상
```

### 2. 제품 정보 등록 UseCase
```typescript
📋 UseCase: CreateProductUseCase
📝 설명: 새로운 제품 정보를 시스템에 등록한다.

🎯 주요 액터: 제품 관리자
📥 입력: 제품 정보 (코드, 명, 유형, 카테고리, 단위, 안전재고 등)
📤 출력: 등록 성공 여부, 생성된 제품 ID

✅ 성공 시나리오:
1. 사용자가 제품 등록 정보 입력
2. 시스템이 입력 데이터 검증
3. 제품 코드 중복 확인
4. 제품 엔티티 생성 및 저장
5. 등록 이력 기록
6. 성공 응답 반환

❌ 예외 시나리오:
- 제품 코드 중복 시 오류
- 필수 정보 누락 시 검증 오류
- 잘못된 제품 유형 선택 시 오류

🔍 비즈니스 규칙:
- 제품 코드는 시스템 내 유일해야 함
- 안전재고는 0 이상이어야 함
- 제품명은 50자 이내
- 등록 즉시 이력 기록 생성
```

### 3. 제품 정보 수정 UseCase
```typescript
📋 UseCase: UpdateProductUseCase
📝 설명: 기존 제품 정보를 수정하고 변경 이력을 관리한다.

🎯 주요 액터: 제품 관리자
📥 입력: 제품 ID, 수정할 정보, 수정 사유
📤 출력: 수정 성공 여부

✅ 성공 시나리오:
1. 사용자가 제품 수정 정보 입력
2. 시스템이 기존 제품 정보 조회
3. 변경사항 검증 및 추적
4. 제품 정보 업데이트
5. 변경 이력 기록
6. 성공 응답 반환

❌ 예외 시나리오:
- 존재하지 않는 제품 ID
- 변경 불가능한 필드 수정 시도
- 비즈니스 규칙 위반 시 오류

🔍 비즈니스 규칙:
- 완제품을 원자재로 변경 금지
- 생산 중인 제품의 핵심 정보 변경 제한
- 모든 변경사항 이력 기록 필수
- 변경 사유 입력 권장
```

### 4. 제품 정보 삭제 UseCase
```typescript
📋 UseCase: DeleteProductUseCase
📝 설명: 제품 정보를 논리적으로 삭제한다.

🎯 주요 액터: 제품 관리자
📥 입력: 제품 ID, 삭제 사유
📤 출력: 삭제 성공 여부

✅ 성공 시나리오:
1. 사용자가 제품 삭제 요청
2. 시스템이 삭제 가능성 검사
3. 논리적 삭제 수행 (비활성화)
4. 삭제 이력 기록
5. 성공 응답 반환

❌ 예외 시나리오:
- BOM에서 사용 중인 제품 삭제 시도
- 재고가 있는 제품 삭제 시도
- 생산 계획에 포함된 제품 삭제 시도

🔍 비즈니스 규칙:
- 물리적 삭제 금지 (논리적 삭제만)
- 다른 시스템에서 참조 중인 제품 삭제 금지
- 삭제 이력 보존 필수
```

### 5. 제품 정보 내보내기 UseCase
```typescript
📋 UseCase: ExportProductListUseCase
📝 설명: 제품 목록을 Excel 또는 CSV 형태로 내보낸다.

🎯 주요 액터: 제품 관리자, 생산 계획자
📥 입력: 내보내기 형식, 필터 조건, 포함할 컬럼
📤 출력: 다운로드 가능한 파일 정보

✅ 성공 시나리오:
1. 사용자가 내보내기 조건 설정
2. 시스템이 조건에 맞는 제품 데이터 조회
3. 지정된 형식으로 파일 생성
4. 다운로드 링크 반환

❌ 예외 시나리오:
- 너무 많은 데이터 요청 시 제한
- 파일 생성 실패 시 오류
- 권한 없는 컬럼 접근 시 필터링

🔍 비즈니스 규칙:
- 최대 10,000건까지 내보내기 가능
- 민감 정보는 권한에 따라 마스킹
- 파일명에 생성일시 포함
```

---

## 📊 테이블 기능 체크리스트

### ✅ 필수 기능 (Must Have)

#### 🔤 기본 표시
- [x] **데이터 렌더링**: 제품 목록을 테이블 형태로 표시
- [x] **로딩 상태**: 데이터 로딩 중 스켈레톤 또는 스피너 표시
- [x] **빈 데이터 처리**: "등록된 제품이 없습니다" 메시지 표시
- [x] **에러 상태**: 네트워크 오류 등 예외 상황 처리

#### ⬆️⬇️ 컬럼별 정렬
- [x] **단일 컬럼 정렬**: 제품코드, 제품명, 등록일 등 정렬 가능
- [x] **정렬 방향 표시**: 화살표 아이콘으로 정렬 방향 표시
- [x] **기본 정렬**: 제품코드 오름차순으로 기본 정렬

#### 📄 페이지네이션
- [x] **기본 페이징**: 10/50/100개씩 보기 옵션
- [x] **페이지 네비게이션**: 이전/다음, 첫페이지/마지막페이지 버튼
- [x] **페이지 점프**: 특정 페이지로 직접 이동
- [x] **총 개수 표시**: "총 152건" 형태로 전체 데이터 수 표시
- [x] **현재 범위 표시**: "1-10 / 152" 형태로 현재 표시 범위 안내

#### 🎯 액션 버튼
- [x] **수정 버튼**: 각 행의 수정 액션
- [x] **삭제 버튼**: 각 행의 삭제 액션 (확인 대화상자 포함)
- [x] **이력조회 버튼**: 해당 제품의 변경 이력 조회

### 💫 선택 기능 (Could Have)
*있으면 좋고 없어도 크게 지장이 없음*

#### 🔍 컬럼별 필터링
- [x] **제품명 필터**: 텍스트 입력으로 제품명 필터링
- [x] **제품유형 필터**: 드롭다운으로 완제품/반제품/원자재 선택
- [x] **카테고리 필터**: 다중 선택 가능한 카테고리 필터
- [x] **단위 필터**: 단위별 필터링 (EA, KG, M 등)
- [x] **상태 필터**: 사용/미사용 상태별 필터링

#### ⚙️ 컬럼 설정
- [x] **컬럼 표시/숨김**: 사용자가 원하는 컬럼만 선택적 표시
- [x] **컬럼 순서 변경**: 드래그앤드랍으로 컬럼 순서 조정
- [x] **컬럼 너비 조정**: 마우스 드래그로 컬럼 너비 변경
- [x] **컬럼 고정**: 좌측 컬럼 고정으로 스크롤 시에도 항상 표시
- [x] **설정 저장**: 사용자별 컬럼 설정 저장 및 복원

#### 🎨 기타 고급 기능
- [x] **상태 아이콘**: 사용/미사용 상태를 시각적 아이콘으로 표시
- [x] **통합 검색**: 모든 컬럼을 대상으로 한 키워드 검색
- [x] **실시간 새로고침**: 5분마다 자동 데이터 갱신

---



## 🎯 다음 단계 구현 가이드

### 1주차: Domain & Application Layer
```typescript
✅ 해야 할 작업:
1. Product 엔티티 구현
2. ProductHistory 엔티티 구현
3. Repository 인터페이스 정의
4. 5개 주요 UseCase 구현
5. 단위 테스트 작성

📁 생성할 파일:
- domain/entities/Product.ts
- domain/entities/ProductHistory.ts
- domain/repositories/ProductRepository.ts
- application/usecases/product/GetProductListUseCase.ts
- application/usecases/product/CreateProductUseCase.ts
- application/usecases/product/UpdateProductUseCase.ts
- application/usecases/product/DeleteProductUseCase.ts
- application/usecases/product/ExportProductListUseCase.ts
```

### 2주차: Infrastructure & Presentation Layer
```typescript
✅ 해야 할 작업:
1. HTTP Repository 구현체 작성
2. DI Container 구성
3. React 컴포넌트 구현
4. 커스텀 훅 구현
5. 통합 테스트 작성

📁 생성할 파일:
- infrastructure/repositories/HttpProductRepository.ts
- config/ProductContainer.ts
- presentation/pages/ProductManagementPage.tsx
- hooks/useProductTable.ts
- components/modals/ProductFormModal.tsx
```

이제 실제 MES 제품정보 시스템의 클린 아키텍처 설계가 완성되었습니다. 스크린샷의 UI와 요구사항을 모두 반영하여 구체적이고 실용적인 설계를 제공했습니다.