# MES BOM 관리 시스템 클린 아키텍처

## 🎯 시스템 개요

**제조실행시스템(MES)의 BOM(Bill of Materials) 관리 모듈 - 제품의 구성 부품 및 소요량을 트리 구조로 관리**

---

## 🏗️ Domain Layer (도메인 계층)

### 📦 1. Entities (엔티티) - 핵심 비즈니스 객체

#### BOM (BOM) 엔티티
```typescript
// domain/entities/BOM.ts
export class BOM {
  constructor(
    private readonly id: BOMId,
    private readonly productId: ProductId,
    private readonly version: string,
    private readonly isActive: boolean,
    private readonly bomItems: BOMItem[],
    private readonly effectiveDate: Date,      // BOM 적용 시작일 (해당 BOM이 생산에 적용되는 시작일)
    private readonly expiryDate?: Date,        // BOM 만료일 (해당 BOM이 더 이상 사용되지 않는 일자, 없으면 무기한)
    private readonly description?: string,
    private readonly id_create: string,
    private readonly id_updated: string,
    private readonly dt_create: Date,
    private readonly dt_update: Date
  ) {
    this.validateBOM();
  }

  // 비즈니스 규칙: BOM 정보 검증
  private validateBOM(): void {
    if (!this.productId) {
      throw new Error('제품 정보는 필수입니다.');
    }
    if (!this.version || this.version.trim().length === 0) {
      throw new Error('BOM 버전은 필수입니다.');
    }
    if (this.effectiveDate > new Date()) {
      throw new Error('적용일은 현재일보다 미래일 수 없습니다.');
    }
    if (this.expiryDate && this.effectiveDate >= this.expiryDate) {
      throw new Error('만료일은 적용일보다 이후여야 합니다.');
    }
    if (!this.id_create || this.id_create.trim().length === 0) {
      throw new Error('생성자는 필수입니다.');
    }
  }

  // 비즈니스 로직: BOM 활성 여부 확인
  public isCurrentlyActive(): boolean {
    const now = new Date();
    return this.isActive && 
           this.effectiveDate <= now && 
           (!this.expiryDate || this.expiryDate > now);
  }

  // 비즈니스 로직: BOM 아이템 추가
  public addBOMItem(item: BOMItem): void {
    if (this.hasDuplicateItem(item)) {
      throw new Error('동일한 구성품이 이미 존재합니다.');
    }
    this.bomItems.push(item);
  }

  // 비즈니스 로직: 순환 참조 검사
  public hasCircularReference(): boolean {
    return this.checkCircularReference(this.productId, new Set());
  }

  private checkCircularReference(currentProductId: ProductId, visited: Set<string>): boolean {
    if (visited.has(currentProductId.getValue())) {
      return true;
    }
    
    visited.add(currentProductId.getValue());
    
    for (const item of this.bomItems) {
      if (item.getComponentId().equals(currentProductId)) {
        return true;
      }
      // 재귀적으로 하위 BOM 검사 (실제로는 BOM 서비스에서 처리)
    }
    
    visited.delete(currentProductId.getValue());
    return false;
  }

  // 비즈니스 로직: 총 원가 계산
  public calculateTotalCost(): number {
    return this.bomItems.reduce((total, item) => {
      return total + (item.getQuantity() * item.getUnitCost());
    }, 0);
  }

  // 비즈니스 로직: 특정 레벨까지의 BOM 전개
  public expandToLevel(maxLevel: number): BOMItem[] {
    return this.bomItems.filter(item => item.getLevel() <= maxLevel);
  }

  private hasDuplicateItem(newItem: BOMItem): boolean {
    return this.bomItems.some(existingItem => 
      existingItem.getComponentId().equals(newItem.getComponentId()) &&
      existingItem.getLevel() === newItem.getLevel()
    );
  }

  // Getters
  public getId(): BOMId { return this.id; }
  public getProductId(): ProductId { return this.productId; }
  public getVersion(): string { return this.version; }
  public getIsActive(): boolean { return this.isActive; }
  public getBOMItems(): BOMItem[] { return [...this.bomItems]; }
  public getEffectiveDate(): Date { return this.effectiveDate; }
  public getExpiryDate(): Date | undefined { return this.expiryDate; }
  public getDescription(): string | undefined { return this.description; }
  public getIdCreate(): string { return this.id_create; }
  public getIdUpdated(): string { return this.id_updated; }
  public getDtCreate(): Date { return this.dt_create; }
  public getDtUpdate(): Date { return this.dt_update; }
}

export class BOMId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('BOM ID는 필수입니다.');
    }
  }
  
  public getValue(): string { return this.value; }
  public equals(other: BOMId): boolean {
    return this.value === other.value;
  }
}
```

#### BOMItem (BOM 구성품) 엔티티
```typescript
// domain/entities/BOMItem.ts
export class BOMItem {
  constructor(
    private readonly id: BOMItemId,
    private readonly bomId: BOMId,
    private readonly componentId: ProductId,
    private readonly parentItemId?: BOMItemId, // 상위 구성품 ID (트리 구조)
    private readonly level: number,            // 트리 레벨 (0: 최상위)
    private readonly sequence: number,         // 동일 레벨 내 순서
    private readonly quantity: number,         // 소요량
    private readonly unit: Unit,               // 단위
    private readonly unitCost: number,         // 단가
    private readonly scrapRate: number,        // 스크랩률 (%)
    private readonly isOptional: boolean,      // 선택사항 여부
    private readonly componentType: ComponentType,
    private readonly position?: string,        // 조립 위치 (예: "상단좌측", "PCB-U1", "Frame-A")
    private readonly processStep?: string,     // 투입 공정 (예: "SMT", "조립", "검사")
    private readonly remarks?: string,         // 비고 (특별 지시사항, 주의사항 등)
    private readonly effectiveDate: Date,      // 적용일 (해당 구성품이 BOM에 적용되는 시작일)
    private readonly expiryDate?: Date,        // 만료일 (해당 구성품이 BOM에서 제외되는 일자, 없으면 무기한)
    private readonly id_create: string,
    private readonly id_updated: string,
    private readonly dt_create: Date,
    private readonly dt_update: Date
  ) {
    this.validateBOMItem();
  }

  // 비즈니스 규칙: BOM 아이템 검증
  private validateBOMItem(): void {
    if (!this.componentId) {
      throw new Error('구성품은 필수입니다.');
    }
    if (this.level < 0) {
      throw new Error('레벨은 0 이상이어야 합니다.');
    }
    if (this.quantity <= 0) {
      throw new Error('소요량은 0보다 커야 합니다.');
    }
    if (this.scrapRate < 0 || this.scrapRate > 100) {
      throw new Error('스크랩률은 0-100% 범위여야 합니다.');
    }
    if (this.unitCost < 0) {
      throw new Error('단가는 0 이상이어야 합니다.');
    }
  }

  // 비즈니스 로직: 스크랩을 고려한 실제 소요량 계산
  public getActualQuantity(): number {
    return this.quantity * (1 + this.scrapRate / 100);
  }

  // 비즈니스 로직: 총 비용 계산 (스크랩 포함)
  public getTotalCost(): number {
    return this.getActualQuantity() * this.unitCost;
  }

  // 비즈니스 로직: 현재 활성 여부
  public isCurrentlyActive(): boolean {
    const now = new Date();
    return this.effectiveDate <= now && 
           (!this.expiryDate || this.expiryDate > now);
  }

  // 비즈니스 로직: 최상위 구성품 여부
  public isTopLevel(): boolean {
    return this.level === 0 && !this.parentItemId;
  }

  // 비즈니스 로직: 하위 구성품 여부
  public isSubComponent(): boolean {
    return this.level > 0 && !!this.parentItemId;
  }

  // Getters
  public getId(): BOMItemId { return this.id; }
  public getBOMId(): BOMId { return this.bomId; }
  public getComponentId(): ProductId { return this.componentId; }
  public getParentItemId(): BOMItemId | undefined { return this.parentItemId; }
  public getLevel(): number { return this.level; }
  public getSequence(): number { return this.sequence; }
  public getQuantity(): number { return this.quantity; }
  public getUnit(): Unit { return this.unit; }
  public getUnitCost(): number { return this.unitCost; }
  public getScrapRate(): number { return this.scrapRate; }
  public getIsOptional(): boolean { return this.isOptional; }
  public getComponentType(): ComponentType { return this.componentType; }
  public getPosition(): string | undefined { return this.position; }
  public getProcessStep(): string | undefined { return this.processStep; }
  public getRemarks(): string | undefined { return this.remarks; }
  public getEffectiveDate(): Date { return this.effectiveDate; }
  public getExpiryDate(): Date | undefined { return this.expiryDate; }
  public getIdCreate(): string { return this.id_create; }
  public getIdUpdated(): string { return this.id_updated; }
  public getDtCreate(): Date { return this.dt_create; }
  public getDtUpdate(): Date { return this.dt_update; }
}

export class BOMItemId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('BOM Item ID는 필수입니다.');
    }
  }
  
  public getValue(): string { return this.value; }
  public equals(other: BOMItemId): boolean {
    return this.value === other.value;
  }
}

export enum ComponentType {
  RAW_MATERIAL = 'RAW_MATERIAL',      // 원자재
  PURCHASED_PART = 'PURCHASED_PART',  // 구매품
  SUB_ASSEMBLY = 'SUB_ASSEMBLY',      // 조립품
  CONSUMABLE = 'CONSUMABLE'           // 소모품
}
```

#### BOMHistory (BOM 이력) 엔티티
```typescript
// domain/entities/BOMHistory.ts
export class BOMHistory {
  constructor(
    private readonly id: string,
    private readonly bomId: BOMId,
    private readonly action: BOMHistoryAction,
    private readonly targetType: 'BOM' | 'BOM_ITEM',
    private readonly targetId: string,
    private readonly changedFields: ChangedField[],
    private readonly userId: string,
    private readonly userName: string,
    private readonly timestamp: Date,
    private readonly reason?: string
  ) {}

  public getId(): string { return this.id; }
  public getBOMId(): BOMId { return this.bomId; }
  public getAction(): BOMHistoryAction { return this.action; }
  public getTargetType(): 'BOM' | 'BOM_ITEM' { return this.targetType; }
  public getTargetId(): string { return this.targetId; }
  public getChangedFields(): ChangedField[] { return this.changedFields; }
  public getUserId(): string { return this.userId; }
  public getUserName(): string { return this.userName; }
  public getTimestamp(): Date { return this.timestamp; }
  public getReason(): string | undefined { return this.reason; }
}

export enum BOMHistoryAction {
  CREATE_BOM = 'CREATE_BOM',
  UPDATE_BOM = 'UPDATE_BOM',
  DELETE_BOM = 'DELETE_BOM',
  ADD_ITEM = 'ADD_ITEM',
  UPDATE_ITEM = 'UPDATE_ITEM',
  DELETE_ITEM = 'DELETE_ITEM',
  COPY_BOM = 'COPY_BOM',
  VERSION_UP = 'VERSION_UP'
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

#### 1. BOM 트리 조회 UseCase
```typescript
// application/usecases/bom/GetBOMTreeUseCase.ts
export interface GetBOMTreeRequest {
  productId: string;
  version?: string;           // 특정 버전 조회 (없으면 최신 활성 버전)
  maxLevel?: number;          // 최대 전개 레벨 (없으면 전체)
  includeInactive?: boolean;  // 비활성 아이템 포함 여부
  expandAll?: boolean;        // 전체 펼침 여부
}

export interface GetBOMTreeResponse {
  bomInfo: BOMInfo;
  treeNodes: BOMTreeNode[];
  totalItems: number;
  maxLevel: number;
  totalCost: number;
}

export interface BOMInfo {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  version: string;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
  description?: string;
  lastUpdated: Date;
}

export interface BOMTreeNode {
  id: string;
  bomItemId: string;
  componentId: string;
  componentCode: string;
  componentName: string;
  componentType: string;
  parentId?: string;
  level: number;
  sequence: number;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  scrapRate: number;
  actualQuantity: number;
  isOptional: boolean;
  position?: string;
  processStep?: string;        // 투입 공정
  remarks?: string;
  isActive: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  children: BOMTreeNode[];
}

export class GetBOMTreeUseCase {
  constructor(
    private bomRepository: BOMRepository,
    private productRepository: ProductRepository,
    private bomPresenter: BOMPresenter
  ) {}

  async execute(request: GetBOMTreeRequest): Promise<GetBOMTreeResponse> {
    // 1. 입력 검증
    this.validateRequest(request);

    // 2. 제품 정보 확인
    const product = await this.productRepository.findById(new ProductId(request.productId));
    if (!product) {
      throw new Error('존재하지 않는 제품입니다.');
    }

    // 3. BOM 조회 (버전별)
    const bom = await this.findBOMByProductAndVersion(request.productId, request.version);
    if (!bom) {
      return {
        bomInfo: this.createEmptyBOMInfo(product),
        treeNodes: [],
        totalItems: 0,
        maxLevel: 0,
        totalCost: 0
      };
    }

    // 4. BOM 아이템들을 트리 구조로 변환
    const bomItems = bom.getBOMItems();
    const filteredItems = this.filterItems(bomItems, request);
    const treeNodes = await this.buildTreeStructure(filteredItems, request.expandAll || false);

    // 5. 통계 정보 계산
    const totalItems = filteredItems.length;
    const maxLevel = Math.max(...filteredItems.map(item => item.getLevel()));
    const totalCost = bom.calculateTotalCost();

    // 6. BOM 정보 구성
    const bomInfo: BOMInfo = {
      id: bom.getId().getValue(),
      productId: product.getId().getValue(),
      productCode: product.getCdMaterial(),
      productName: product.getNmMaterial(),
      version: bom.getVersion(),
      isActive: bom.getIsActive(),
      effectiveDate: bom.getEffectiveDate(),
      expiryDate: bom.getExpiryDate(),
      description: bom.getDescription(),
      lastUpdated: bom.getDtUpdate()
    };

    return {
      bomInfo,
      treeNodes,
      totalItems,
      maxLevel,
      totalCost
    };
  }

  private async findBOMByProductAndVersion(productId: string, version?: string): Promise<BOM | null> {
    if (version) {
      return await this.bomRepository.findByProductIdAndVersion(new ProductId(productId), version);
    } else {
      return await this.bomRepository.findActiveByProductId(new ProductId(productId));
    }
  }

  private filterItems(bomItems: BOMItem[], request: GetBOMTreeRequest): BOMItem[] {
    let filteredItems = bomItems;

    // 레벨 필터링
    if (request.maxLevel !== undefined) {
      filteredItems = filteredItems.filter(item => item.getLevel() <= request.maxLevel!);
    }

    // 활성 상태 필터링
    if (!request.includeInactive) {
      filteredItems = filteredItems.filter(item => item.isCurrentlyActive());
    }

    return filteredItems;
  }

  private async buildTreeStructure(bomItems: BOMItem[], expandAll: boolean): Promise<BOMTreeNode[]> {
    // 1. 모든 아이템을 노드로 변환
    const nodeMap = new Map<string, BOMTreeNode>();
    
    for (const item of bomItems) {
      const component = await this.productRepository.findById(item.getComponentId());
      if (!component) continue;

      const node: BOMTreeNode = {
        id: `node-${item.getId().getValue()}`,
        bomItemId: item.getId().getValue(),
        componentId: item.getComponentId().getValue(),
        componentCode: component.getCdMaterial(),
        componentName: component.getNmMaterial(),
        componentType: this.bomPresenter.getComponentTypeDisplayName(item.getComponentType()),
        parentId: item.getParentItemId()?.getValue(),
        level: item.getLevel(),
        sequence: item.getSequence(),
        quantity: item.getQuantity(),
        unit: item.getUnit().name,
        unitCost: item.getUnitCost(),
        totalCost: item.getTotalCost(),
        scrapRate: item.getScrapRate(),
        actualQuantity: item.getActualQuantity(),
        isOptional: item.getIsOptional(),
        position: item.getPosition(),
        remarks: item.getRemarks(),
        isActive: item.isCurrentlyActive(),
        hasChildren: false,
        isExpanded: expandAll,
        children: []
      };

      nodeMap.set(item.getId().getValue(), node);
    }

    // 2. 트리 구조 구성
    const rootNodes: BOMTreeNode[] = [];
    const allNodes = Array.from(nodeMap.values());

    // 부모-자식 관계 설정
    allNodes.forEach(node => {
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
          parent.hasChildren = true;
        }
      } else {
        rootNodes.push(node);
      }
    });

    // 3. 각 레벨에서 sequence 순으로 정렬
    this.sortNodesBySequence(rootNodes);

    return rootNodes;
  }

  private sortNodesBySequence(nodes: BOMTreeNode[]): void {
    nodes.sort((a, b) => a.sequence - b.sequence);
    nodes.forEach(node => {
      if (node.children.length > 0) {
        this.sortNodesBySequence(node.children);
      }
    });
  }

  private createEmptyBOMInfo(product: Product): BOMInfo {
    return {
      id: '',
      productId: product.getId().getValue(),
      productCode: product.getCdMaterial(),
      productName: product.getNmMaterial(),
      version: '',
      isActive: false,
      effectiveDate: new Date(),
      lastUpdated: new Date()
    };
  }

  private validateRequest(request: GetBOMTreeRequest): void {
    if (!request.productId) {
      throw new Error('제품 ID는 필수입니다.');
    }
    if (request.maxLevel !== undefined && request.maxLevel < 0) {
      throw new Error('최대 레벨은 0 이상이어야 합니다.');
    }
  }
}
```

#### 2. BOM 아이템 추가 UseCase
```typescript
// application/usecases/bom/AddBOMItemUseCase.ts
export interface AddBOMItemRequest {
  bomId: string;
  parentItemId?: string;    // 상위 구성품 ID (없으면 최상위)
  componentId: string;      // 구성품 ID
  quantity: number;         // 소요량
  unit: {
    code: string;
    name: string;
  };
  unitCost: number;         // 단가
  scrapRate: number;        // 스크랩률
  isOptional: boolean;      // 선택사항 여부
  componentType: ComponentType;
  position?: string;        // 조립 위치 (예: "상단좌측", "PCB-U1")
  processStep?: string;     // 투입 공정 (예: "SMT공정", "조립공정", "검사공정")
  remarks?: string;         // 비고 (특별 지시사항, 주의사항 등)
  effectiveDate: Date;      // 적용일
  expiryDate?: Date;        // 만료일
  id_create: string;        // 생성자 ID
  reason?: string;          // 추가 사유
}

export interface AddBOMItemResponse {
  bomItemId: string;
  success: boolean;
  message: string;
  newTreeNode: BOMTreeNode;
}

export class AddBOMItemUseCase {
  constructor(
    private bomRepository: BOMRepository,
    private bomItemRepository: BOMItemRepository,
    private productRepository: ProductRepository,
    private bomHistoryRepository: BOMHistoryRepository,
    private bomCircularChecker: BOMCircularChecker
  ) {}

  async execute(request: AddBOMItemRequest): Promise<AddBOMItemResponse> {
    // 1. 입력 검증
    await this.validateRequest(request);

    // 2. BOM 존재 확인
    const bom = await this.bomRepository.findById(new BOMId(request.bomId));
    if (!bom) {
      throw new Error('존재하지 않는 BOM입니다.');
    }

    // 3. 구성품 정보 확인
    const component = await this.productRepository.findById(new ProductId(request.componentId));
    if (!component) {
      throw new Error('존재하지 않는 구성품입니다.');
    }

    // 4. 비즈니스 규칙 검증
    await this.validateBusinessRules(bom, request);

    // 5. 레벨 및 순서 계산
    const level = await this.calculateLevel(request.parentItemId);
    const sequence = await this.getNextSequence(request.bomId, request.parentItemId, level);

    // 6. BOM 아이템 생성
    const bomItemId = new BOMItemId(this.generateBOMItemId());
    const parentItemId = request.parentItemId ? new BOMItemId(request.parentItemId) : undefined;
    const unit = new Unit(request.unit.code, request.unit.name);

    const bomItem = new BOMItem(
      bomItemId,
      new BOMId(request.bomId),
      new ProductId(request.componentId),
      parentItemId,
      level,
      sequence,
      request.quantity,
      unit,
      request.unitCost,
      request.scrapRate,
      request.isOptional,
      request.componentType,
      request.position,
      request.remarks,
      request.effectiveDate,
      request.expiryDate,
      request.id_create,
      request.id_create,
      new Date(),
      new Date()
    );

    // 7. 순환 참조 검사
    if (await this.bomCircularChecker.hasCircularReference(bom, bomItem)) {
      throw new Error('순환 참조가 발생합니다. 해당 구성품을 추가할 수 없습니다.');
    }

    // 8. 저장
    await this.bomItemRepository.save(bomItem);

    // 9. BOM 수정일시 업데이트
    await this.updateBOMLastModified(bom, request.id_create);

    // 10. 이력 기록
    await this.recordHistory(bom, bomItem, request);

    // 11. 트리 노드 생성
    const newTreeNode = await this.createTreeNode(bomItem, component);

    return {
      bomItemId: bomItemId.getValue(),
      success: true,
      message: '구성품이 성공적으로 추가되었습니다.',
      newTreeNode
    };
  }

  private async validateRequest(request: AddBOMItemRequest): Promise<void> {
    if (request.quantity <= 0) {
      throw new Error('소요량은 0보다 커야 합니다.');
    }
    if (request.scrapRate < 0 || request.scrapRate > 100) {
      throw new Error('스크랩률은 0-100% 범위여야 합니다.');
    }
    if (request.unitCost < 0) {
      throw new Error('단가는 0 이상이어야 합니다.');
    }
  }

  private async validateBusinessRules(bom: BOM, request: AddBOMItemRequest): Promise<void> {
    // 1. 동일 구성품 중복 검사
    const existingItems = bom.getBOMItems();
    const isDuplicate = existingItems.some(item => 
      item.getComponentId().getValue() === request.componentId &&
      item.getParentItemId()?.getValue() === request.parentItemId
    );
    
    if (isDuplicate) {
      throw new Error('동일한 구성품이 이미 존재합니다.');
    }

    // 2. 상위 구성품 존재 확인
    if (request.parentItemId) {
      const parentExists = existingItems.some(item => 
        item.getId().getValue() === request.parentItemId
      );
      if (!parentExists) {
        throw new Error('상위 구성품이 존재하지 않습니다.');
      }
    }

    // 3. 자기 자신을 구성품으로 추가하는지 확인
    if (bom.getProductId().getValue() === request.componentId) {
      throw new Error('자기 자신을 구성품으로 추가할 수 없습니다.');
    }
  }

  private async calculateLevel(parentItemId?: string): Promise<number> {
    if (!parentItemId) {
      return 0; // 최상위 레벨
    }

    const parentItem = await this.bomItemRepository.findById(new BOMItemId(parentItemId));
    if (!parentItem) {
      throw new Error('상위 구성품을 찾을 수 없습니다.');
    }

    return parentItem.getLevel() + 1;
  }

  private async getNextSequence(bomId: string, parentItemId?: string, level: number = 0): Promise<number> {
    const siblings = await this.bomItemRepository.findByParentAndLevel(
      new BOMId(bomId), 
      parentItemId ? new BOMItemId(parentItemId) : undefined,
      level
    );

    return siblings.length + 1;
  }

  private async updateBOMLastModified(bom: BOM, userId: string): Promise<void> {
    // BOM의 수정일시를 현재 시간으로 업데이트하는 로직
    // 실제로는 새로운 BOM 인스턴스를 생성하여 저장
  }

  private async recordHistory(bom: BOM, bomItem: BOMItem, request: AddBOMItemRequest): Promise<void> {
    const history = new BOMHistory(
      this.generateHistoryId(),
      bom.getId(),
      BOMHistoryAction.ADD_ITEM,
      'BOM_ITEM',
      bomItem.getId().getValue(),
      [], // 신규 추가이므로 변경 필드 없음
      request.id_create,
      request.id_create, // 사용자명 (실제로는 사용자 정보 조회 필요)
      new Date(),
      request.reason || '구성품 추가'
    );

    await this.bomHistoryRepository.save(history);
  }

  private async createTreeNode(bomItem: BOMItem, component: Product): Promise<BOMTreeNode> {
    return {
      id: `node-${bomItem.getId().getValue()}`,
      bomItemId: bomItem.getId().getValue(),
      componentId: component.getId().getValue(),
      componentCode: component.getCdMaterial(),
      componentName: component.getNmMaterial(),
      componentType: bomItem.getComponentType(),
      parentId: bomItem.getParentItemId()?.getValue(),
      level: bomItem.getLevel(),
      sequence: bomItem.getSequence(),
      quantity: bomItem.getQuantity(),
      unit: bomItem.getUnit().name,
      unitCost: bomItem.getUnitCost(),
      totalCost: bomItem.getTotalCost(),
      scrapRate: bomItem.getScrapRate(),
      actualQuantity: bomItem.getActualQuantity(),
      isOptional: bomItem.getIsOptional(),
      position: bomItem.getPosition(),
      processStep: bomItem.getProcessStep(),
      remarks: bomItem.getRemarks(),
      isActive: bomItem.isCurrentlyActive(),
      hasChildren: false,
      isExpanded: false,
      children: []
    };
  }

  private generateBOMItemId(): string {
    return 'BOMITEM-' + Date.now().toString();
  }

  private generateHistoryId(): string {
    return 'BOMHIST-' + Date.now().toString();
  }
}
```

#### 3. BOM 아이템 수정 UseCase
```typescript
// application/usecases/bom/UpdateBOMItemUseCase.ts
export interface UpdateBOMItemRequest {
  bomItemId: string;
  quantity?: number;
  unitCost?: number;
  scrapRate?: number;
  isOptional?: boolean;
  position?: string;        // 조립 위치
  processStep?: string;     // 투입 공정
  remarks?: string;         // 비고
  effectiveDate?: Date;     // 적용일
  expiryDate?: Date;        // 만료일
  id_updated: string;
  reason?: string;
}

export interface UpdateBOMItemResponse {
  success: boolean;
  message: string;
  updatedTreeNode: BOMTreeNode;
}

export class UpdateBOMItemUseCase {
  constructor(
    private bomItemRepository: BOMItemRepository,
    private bomRepository: BOMRepository,
    private productRepository: ProductRepository,
    private bomHistoryRepository: BOMHistoryRepository
  ) {}

  async execute(request: UpdateBOMItemRequest): Promise<UpdateBOMItemResponse> {
    // 1. BOM 아이템 존재 확인
    const existingItem = await this.bomItemRepository.findById(new BOMItemId(request.bomItemId));
    if (!existingItem) {
      throw new Error('존재하지 않는 BOM 아이템입니다.');
    }

    // 2. 입력 검증
    this.validateRequest(request);

    // 3. 변경사항 추적
    const changedFields = this.detectChanges(existingItem, request);
    if (changedFields.length === 0) {
      throw new Error('변경된 항목이 없습니다.');
    }

    // 4. BOM 아이템 업데이트
    const updatedItem = this.createUpdatedBOMItem(existingItem, request);

    // 5. 저장
    await this.bomItemRepository.save(updatedItem);

    // 6. BOM 수정일시 업데이트
    const bom = await this.bomRepository.findById(existingItem.getBOMId());
    if (bom) {
      await this.updateBOMLastModified(bom, request.id_updated);
    }

    // 7. 이력 기록
    await this.recordUpdateHistory(existingItem, changedFields, request);

    // 8. 업데이트된 트리 노드 생성
    const component = await this.productRepository.findById(updatedItem.getComponentId());
    const updatedTreeNode = await this.createTreeNode(updatedItem, component!);

    return {
      success: true,
      message: 'BOM 아이템이 성공적으로 수정되었습니다.',
      updatedTreeNode
    };
  }

  private validateRequest(request: UpdateBOMItemRequest): void {
    if (request.quantity !== undefined && request.quantity <= 0) {
      throw new Error('소요량은 0보다 커야 합니다.');
    }
    if (request.scrapRate !== undefined && (request.scrapRate < 0 || request.scrapRate > 100)) {
      throw new Error('스크랩률은 0-100% 범위여야 합니다.');
    }
    if (request.unitCost !== undefined && request.unitCost < 0) {
      throw new Error('단가는 0 이상이어야 합니다.');
    }
  }

  private detectChanges(existingItem: BOMItem, request: UpdateBOMItemRequest): ChangedField[] {
    const changes: ChangedField[] = [];

    if (request.quantity !== undefined && request.quantity !== existingItem.getQuantity()) {
      changes.push(new ChangedField('quantity', existingItem.getQuantity(), request.quantity));
    }

    if (request.unitCost !== undefined && request.unitCost !== existingItem.getUnitCost()) {
      changes.push(new ChangedField('unitCost', existingItem.getUnitCost(), request.unitCost));
    }

    if (request.scrapRate !== undefined && request.scrapRate !== existingItem.getScrapRate()) {
      changes.push(new ChangedField('scrapRate', existingItem.getScrapRate(), request.scrapRate));
    }

    if (request.isOptional !== undefined && request.isOptional !== existingItem.getIsOptional()) {
      changes.push(new ChangedField('isOptional', existingItem.getIsOptional(), request.isOptional));
    }

    if (request.position !== undefined && request.position !== existingItem.getPosition()) {
      changes.push(new ChangedField('position', existingItem.getPosition(), request.position));
    }

    if (request.processStep !== undefined && request.processStep !== existingItem.getProcessStep()) {
      changes.push(new ChangedField('processStep', existingItem.getProcessStep(), request.processStep));
    }

    if (request.remarks !== undefined && request.remarks !== existingItem.getRemarks()) {
      changes.push(new ChangedField('remarks', existingItem.getRemarks(), request.remarks));
    }

    return changes;
  }

  private createUpdatedBOMItem(existingItem: BOMItem, request: UpdateBOMItemRequest): BOMItem {
    return new BOMItem(
      existingItem.getId(),
      existingItem.getBOMId(),
      existingItem.getComponentId(),
      existingItem.getParentItemId(),
      existingItem.getLevel(),
      existingItem.getSequence(),
      request.quantity ?? existingItem.getQuantity(),
      existingItem.getUnit(),
      request.unitCost ?? existingItem.getUnitCost(),
      request.scrapRate ?? existingItem.getScrapRate(),
      request.isOptional ?? existingItem.getIsOptional(),
      existingItem.getComponentType(),
      request.position ?? existingItem.getPosition(),
      request.processStep ?? existingItem.getProcessStep(),
      request.remarks ?? existingItem.getRemarks(),
      request.effectiveDate ?? existingItem.getEffectiveDate(),
      request.expiryDate ?? existingItem.getExpiryDate(),
      existingItem.getIdCreate(),
      request.id_updated,
      existingItem.getDtCreate(),
      new Date()
    );
  }

  private async recordUpdateHistory(
    existingItem: BOMItem, 
    changedFields: ChangedField[], 
    request: UpdateBOMItemRequest
  ): Promise<void> {
    const history = new BOMHistory(
      this.generateHistoryId(),
      existingItem.getBOMId(),
      BOMHistoryAction.UPDATE_ITEM,
      'BOM_ITEM',
      existingItem.getId().getValue(),
      changedFields,
      request.id_updated,
      request.id_updated, // 사용자명
      new Date(),
      request.reason || 'BOM 아이템 수정'
    );

    await this.bomHistoryRepository.save(history);
  }

  private async updateBOMLastModified(bom: BOM, userId: string): Promise<void> {
    // BOM 수정일시 업데이트 로직
  }

  private async createTreeNode(bomItem: BOMItem, component: Product): Promise<BOMTreeNode> {
    return {
      id: `node-${bomItem.getId().getValue()}`,
      bomItemId: bomItem.getId().getValue(),
      componentId: component.getId().getValue(),
      componentCode: component.getCdMaterial(),
      componentName: component.getNmMaterial(),
      componentType: bomItem.getComponentType(),
      parentId: bomItem.getParentItemId()?.getValue(),
      level: bomItem.getLevel(),
      sequence: bomItem.getSequence(),
      quantity: bomItem.getQuantity(),
      unit: bomItem.getUnit().name,
      unitCost: bomItem.getUnitCost(),
      totalCost: bomItem.getTotalCost(),
      scrapRate: bomItem.getScrapRate(),
      actualQuantity: bomItem.getActualQuantity(),
      isOptional: bomItem.getIsOptional(),
      position: bomItem.getPosition(),
      remarks: bomItem.getRemarks(),
      isActive: bomItem.isCurrentlyActive(),
      hasChildren: false,
      isExpanded: false,
      children: []
    };
  }

  private generateHistoryId(): string {
    return 'BOMHIST-' + Date.now().toString();
  }
}
```

#### 4. BOM 아이템 삭제 UseCase
```typescript
// application/usecases/bom/DeleteBOMItemUseCase.ts
export interface DeleteBOMItemRequest {
  bomItemId: string;
  deleteChildren?: boolean;  // 하위 구성품도 함께 삭제할지 여부
  id_updated: string;
  reason?: string;
}

export interface DeleteBOMItemResponse {
  success: boolean;
  message: string;
  deletedItemIds: string[];
}

export class DeleteBOMItemUseCase {
  constructor(
    private bomItemRepository: BOMItemRepository,
    private bomRepository: BOMRepository,
    private bomHistoryRepository: BOMHistoryRepository,
    private bomUsageChecker: BOMUsageChecker
  ) {}

  async execute(request: DeleteBOMItemRequest): Promise<DeleteBOMItemResponse> {
    // 1. BOM 아이템 존재 확인
    const bomItem = await this.bomItemRepository.findById(new BOMItemId(request.bomItemId));
    if (!bomItem) {
      throw new Error('존재하지 않는 BOM 아이템입니다.');
    }

    // 2. 삭제 가능성 검사
    await this.validateDeletion(bomItem);

    // 3. 삭제할 아이템 목록 구성
    const itemsToDelete = await this.getItemsToDelete(bomItem, request.deleteChildren || false);

    // 4. 삭제 실행 (논리 삭제)
    const deletedItemIds: string[] = [];
    for (const item of itemsToDelete) {
      await this.bomItemRepository.delete(item.getId());
      deletedItemIds.push(item.getId().getValue());
      
      // 개별 삭제 이력 기록
      await this.recordDeleteHistory(item, request);
    }

    // 5. BOM 수정일시 업데이트
    const bom = await this.bomRepository.findById(bomItem.getBOMId());
    if (bom) {
      await this.updateBOMLastModified(bom, request.id_updated);
    }

    return {
      success: true,
      message: `${deletedItemIds.length}개의 구성품이 삭제되었습니다.`,
      deletedItemIds
    };
  }

  private async validateDeletion(bomItem: BOMItem): Promise<void> {
    // 1. 생산 계획에서 사용 중인지 확인
    const isUsedInProduction = await this.bomUsageChecker.isUsedInProduction(bomItem.getBOMId());
    if (isUsedInProduction) {
      throw new Error('생산 계획에서 사용 중인 BOM의 구성품은 삭제할 수 없습니다.');
    }

    // 2. 작업 지시에서 사용 중인지 확인
    const isUsedInWorkOrder = await this.bomUsageChecker.isUsedInWorkOrder(bomItem.getBOMId());
    if (isUsedInWorkOrder) {
      throw new Error('작업 지시에서 사용 중인 BOM의 구성품은 삭제할 수 없습니다.');
    }
  }

  private async getItemsToDelete(bomItem: BOMItem, deleteChildren: boolean): Promise<BOMItem[]> {
    const itemsToDelete: BOMItem[] = [bomItem];

    if (deleteChildren) {
      // 하위 구성품 재귀적으로 찾기
      const childItems = await this.bomItemRepository.findByParentId(bomItem.getId());
      for (const child of childItems) {
        const childItemsToDelete = await this.getItemsToDelete(child, true);
        itemsToDelete.push(...childItemsToDelete);
      }
    } else {
      // 하위 구성품이 있는지 확인
      const hasChildren = await this.bomItemRepository.hasChildren(bomItem.getId());
      if (hasChildren) {
        throw new Error('하위 구성품이 있는 아이템은 하위 구성품을 먼저 삭제하거나 함께 삭제 옵션을 선택해야 합니다.');
      }
    }

    return itemsToDelete;
  }

  private async recordDeleteHistory(bomItem: BOMItem, request: DeleteBOMItemRequest): Promise<void> {
    const history = new BOMHistory(
      this.generateHistoryId(),
      bomItem.getBOMId(),
      BOMHistoryAction.DELETE_ITEM,
      'BOM_ITEM',
      bomItem.getId().getValue(),
      [new ChangedField('deleted', false, true)],
      request.id_updated,
      request.id_updated, // 사용자명
      new Date(),
      request.reason || 'BOM 아이템 삭제'
    );

    await this.bomHistoryRepository.save(history);
  }

  private async updateBOMLastModified(bom: BOM, userId: string): Promise<void> {
    // BOM 수정일시 업데이트 로직
  }

  private generateHistoryId(): string {
    return 'BOMHIST-' + Date.now().toString();
  }
}
```

#### 5. BOM 복사 UseCase
```typescript
// application/usecases/bom/CopyBOMUseCase.ts
export interface CopyBOMRequest {
  sourceBOMId: string;
  targetProductId: string;
  newVersion: string;
  copyOptions: {
    includeInactiveItems: boolean;
    adjustCosts: boolean;
    costAdjustmentRate?: number; // 단가 조정률 (%)
  };
  effectiveDate: Date;
  description?: string;
  id_create: string;
  reason?: string;
}

export interface CopyBOMResponse {
  newBOMId: string;
  copiedItemsCount: number;
  success: boolean;
  message: string;
}

export class CopyBOMUseCase {
  constructor(
    private bomRepository: BOMRepository,
    private bomItemRepository: BOMItemRepository,
    private productRepository: ProductRepository,
    private bomHistoryRepository: BOMHistoryRepository
  ) {}

  async execute(request: CopyBOMRequest): Promise<CopyBOMResponse> {
    // 1. 입력 검증
    await this.validateRequest(request);

    // 2. 원본 BOM 조회
    const sourceBOM = await this.bomRepository.findById(new BOMId(request.sourceBOMId));
    if (!sourceBOM) {
      throw new Error('원본 BOM이 존재하지 않습니다.');
    }

    // 3. 대상 제품 확인
    const targetProduct = await this.productRepository.findById(new ProductId(request.targetProductId));
    if (!targetProduct) {
      throw new Error('대상 제품이 존재하지 않습니다.');
    }

    // 4. 버전 중복 확인
    const existingBOM = await this.bomRepository.findByProductIdAndVersion(
      new ProductId(request.targetProductId), 
      request.newVersion
    );
    if (existingBOM) {
      throw new Error('동일한 버전의 BOM이 이미 존재합니다.');
    }

    // 5. 새로운 BOM 생성
    const newBOMId = new BOMId(this.generateBOMId());
    const newBOM = new BOM(
      newBOMId,
      new ProductId(request.targetProductId),
      request.newVersion,
      true, // 활성화
      [], // BOM 아이템은 별도 생성
      request.effectiveDate,
      undefined, // 만료일 없음
      request.description || `${sourceBOM.getVersion()}에서 복사`,
      request.id_create,
      request.id_create,
      new Date(),
      new Date()
    );

    // 6. BOM 저장
    await this.bomRepository.save(newBOM);

    // 7. BOM 아이템 복사
    const sourceItems = sourceBOM.getBOMItems();
    const filteredItems = this.filterSourceItems(sourceItems, request.copyOptions);
    const copiedItemsCount = await this.copyBOMItems(filteredItems, newBOMId, request);

    // 8. 복사 이력 기록
    await this.recordCopyHistory(sourceBOM, newBOM, request);

    return {
      newBOMId: newBOMId.getValue(),
      copiedItemsCount,
      success: true,
      message: `BOM이 성공적으로 복사되었습니다. (${copiedItemsCount}개 아이템)`
    };
  }

  private async validateRequest(request: CopyBOMRequest): Promise<void> {
    if (request.copyOptions.adjustCosts && request.copyOptions.costAdjustmentRate === undefined) {
      throw new Error('단가 조정 옵션 선택 시 조정률을 입력해야 합니다.');
    }
    if (request.copyOptions.costAdjustmentRate !== undefined && 
        (request.copyOptions.costAdjustmentRate < -100 || request.copyOptions.costAdjustmentRate > 1000)) {
      throw new Error('단가 조정률은 -100% ~ 1000% 범위여야 합니다.');
    }
  }

  private filterSourceItems(sourceItems: BOMItem[], copyOptions: any): BOMItem[] {
    let filteredItems = sourceItems;

    if (!copyOptions.includeInactiveItems) {
      filteredItems = filteredItems.filter(item => item.isCurrentlyActive());
    }

    return filteredItems;
  }

  private async copyBOMItems(
    sourceItems: BOMItem[], 
    newBOMId: BOMId, 
    request: CopyBOMRequest
  ): Promise<number> {
    const itemIdMapping = new Map<string, string>(); // 원본 ID -> 새 ID 매핑
    let copiedCount = 0;

    // 레벨 순으로 정렬하여 상위부터 복사
    const sortedItems = sourceItems.sort((a, b) => a.getLevel() - b.getLevel());

    for (const sourceItem of sortedItems) {
      const newItemId = new BOMItemId(this.generateBOMItemId());
      
      // 새로운 parent ID 찾기
      const newParentId = sourceItem.getParentItemId() 
        ? itemIdMapping.get(sourceItem.getParentItemId()!.getValue())
        : undefined;

      // 단가 조정
      const adjustedUnitCost = request.copyOptions.adjustCosts && request.copyOptions.costAdjustmentRate
        ? sourceItem.getUnitCost() * (1 + request.copyOptions.costAdjustmentRate / 100)
        : sourceItem.getUnitCost();

      const newItem = new BOMItem(
        newItemId,
        newBOMId,
        sourceItem.getComponentId(),
        newParentId ? new BOMItemId(newParentId) : undefined,
        sourceItem.getLevel(),
        sourceItem.getSequence(),
        sourceItem.getQuantity(),
        sourceItem.getUnit(),
        adjustedUnitCost,
        sourceItem.getScrapRate(),
        sourceItem.getIsOptional(),
        sourceItem.getComponentType(),
        sourceItem.getPosition(),
        sourceItem.getProcessStep(),
        sourceItem.getRemarks(),
        request.effectiveDate,
        sourceItem.getExpiryDate(),
        request.id_create,
        request.id_create,
        new Date(),
        new Date()
      );

      await this.bomItemRepository.save(newItem);
      itemIdMapping.set(sourceItem.getId().getValue(), newItemId.getValue());
      copiedCount++;
    }

    return copiedCount;
  }

  private async recordCopyHistory(sourceBOM: BOM, newBOM: BOM, request: CopyBOMRequest): Promise<void> {
    const history = new BOMHistory(
      this.generateHistoryId(),
      newBOM.getId(),
      BOMHistoryAction.COPY_BOM,
      'BOM',
      newBOM.getId().getValue(),
      [
        new ChangedField('sourceBOMId', null, sourceBOM.getId().getValue()),
        new ChangedField('sourceVersion', null, sourceBOM.getVersion())
      ],
      request.id_create,
      request.id_create, // 사용자명
      new Date(),
      request.reason || `${sourceBOM.getVersion()}에서 BOM 복사`
    );

    await this.bomHistoryRepository.save(history);
  }

  private generateBOMId(): string {
    return 'BOM-' + Date.now().toString();
  }

  private generateBOMItemId(): string {
    return 'BOMITEM-' + Date.now().toString();
  }

  private generateHistoryId(): string {
    return 'BOMHIST-' + Date.now().toString();
  }
}
```

#### 6. BOM 비교 UseCase
```typescript
// application/usecases/bom/CompareBOMUseCase.ts
export interface CompareBOMRequest {
  bomId1: string;
  bomId2: string;
  compareOptions: {
    includeQuantityChanges: boolean;
    includeCostChanges: boolean;
    includeStructureChanges: boolean;
  };
}

export interface CompareBOMResponse {
  bom1Info: BOMInfo;
  bom2Info: BOMInfo;
  differences: BOMDifference[];
  summary: BOMComparisonSummary;
}

export interface BOMDifference {
  type: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'MOVED';
  componentId: string;
  componentCode: string;
  componentName: string;
  level: number;
  field?: string;
  oldValue?: any;
  newValue?: any;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BOMComparisonSummary {
  totalDifferences: number;
  addedItems: number;
  removedItems: number;
  modifiedItems: number;
  movedItems: number;
  costImpact: number;
}

export class CompareBOMUseCase {
  constructor(
    private bomRepository: BOMRepository,
    private productRepository: ProductRepository,
    private bomPresenter: BOMPresenter
  ) {}

  async execute(request: CompareBOMRequest): Promise<CompareBOMResponse> {
    // 1. 두 BOM 조회
    const [bom1, bom2] = await Promise.all([
      this.bomRepository.findById(new BOMId(request.bomId1)),
      this.bomRepository.findById(new BOMId(request.bomId2))
    ]);

    if (!bom1 || !bom2) {
      throw new Error('비교할 BOM 중 존재하지 않는 것이 있습니다.');
    }

    // 2. BOM 정보 구성
    const [bom1Info, bom2Info] = await Promise.all([
      this.createBOMInfo(bom1),
      this.createBOMInfo(bom2)
    ]);

    // 3. 차이점 분석
    const differences = await this.analyzeDifferences(bom1, bom2, request.compareOptions);

    // 4. 요약 정보 생성
    const summary = this.createComparisonSummary(differences);

    return {
      bom1Info,
      bom2Info,
      differences,
      summary
    };
  }

  private async createBOMInfo(bom: BOM): Promise<BOMInfo> {
    const product = await this.productRepository.findById(bom.getProductId());
    if (!product) {
      throw new Error('제품 정보를 찾을 수 없습니다.');
    }

    return {
      id: bom.getId().getValue(),
      productId: product.getId().getValue(),
      productCode: product.getCdMaterial(),
      productName: product.getNmMaterial(),
      version: bom.getVersion(),
      isActive: bom.getIsActive(),
      effectiveDate: bom.getEffectiveDate(),
      expiryDate: bom.getExpiryDate(),
      description: bom.getDescription(),
      lastUpdated: bom.getDtUpdate()
    };
  }

  private async analyzeDifferences(
    bom1: BOM, 
    bom2: BOM, 
    options: any
  ): Promise<BOMDifference[]> {
    const differences: BOMDifference[] = [];
    const items1 = bom1.getBOMItems();
    const items2 = bom2.getBOMItems();

    // 구성품별로 그룹화
    const items1Map = new Map(items1.map(item => [item.getComponentId().getValue(), item]));
    const items2Map = new Map(items2.map(item => [item.getComponentId().getValue(), item]));

    // 추가된 항목 찾기
    for (const [componentId, item] of items2Map) {
      if (!items1Map.has(componentId)) {
        const component = await this.productRepository.findById(item.getComponentId());
        differences.push({
          type: 'ADDED',
          componentId,
          componentCode: component?.getCdMaterial() || '',
          componentName: component?.getNmMaterial() || '',
          level: item.getLevel(),
          impact: this.calculateImpact('ADDED', item)
        });
      }
    }

    // 제거된 항목 찾기
    for (const [componentId, item] of items1Map) {
      if (!items2Map.has(componentId)) {
        const component = await this.productRepository.findById(item.getComponentId());
        differences.push({
          type: 'REMOVED',
          componentId,
          componentCode: component?.getCdMaterial() || '',
          componentName: component?.getNmMaterial() || '',
          level: item.getLevel(),
          impact: this.calculateImpact('REMOVED', item)
        });
      }
    }

    // 수정된 항목 찾기
    for (const [componentId, item1] of items1Map) {
      const item2 = items2Map.get(componentId);
      if (item2) {
        const itemDifferences = this.compareItems(item1, item2, options);
        differences.push(...itemDifferences);
      }
    }

    return differences.sort((a, b) => {
      // 영향도 순으로 정렬
      const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  private async compareItems(item1: BOMItem, item2: BOMItem, options: any): Promise<BOMDifference[]> {
    const differences: BOMDifference[] = [];
    const component = await this.productRepository.findById(item1.getComponentId());
    
    if (!component) return differences;

    const baseInfo = {
      componentId: item1.getComponentId().getValue(),
      componentCode: component.getCdMaterial(),
      componentName: component.getNmMaterial(),
      level: item1.getLevel()
    };

    // 구조 변경 확인
    if (options.includeStructureChanges) {
      if (item1.getLevel() !== item2.getLevel()) {
        differences.push({
          ...baseInfo,
          type: 'MOVED',
          field: 'level',
          oldValue: item1.getLevel(),
          newValue: item2.getLevel(),
          impact: 'HIGH'
        });
      }
    }

    // 수량 변경 확인
    if (options.includeQuantityChanges && item1.getQuantity() !== item2.getQuantity()) {
      differences.push({
        ...baseInfo,
        type: 'MODIFIED',
        field: 'quantity',
        oldValue: item1.getQuantity(),
        newValue: item2.getQuantity(),
        impact: this.calculateQuantityChangeImpact(item1.getQuantity(), item2.getQuantity())
      });
    }

    // 비용 변경 확인
    if (options.includeCostChanges && item1.getUnitCost() !== item2.getUnitCost()) {
      differences.push({
        ...baseInfo,
        type: 'MODIFIED',
        field: 'unitCost',
        oldValue: item1.getUnitCost(),
        newValue: item2.getUnitCost(),
        impact: this.calculateCostChangeImpact(item1.getUnitCost(), item2.getUnitCost())
      });
    }

    return differences;
  }

  private calculateImpact(type: 'ADDED' | 'REMOVED', item: BOMItem): 'HIGH' | 'MEDIUM' | 'LOW' {
    // 최상위 레벨이거나 비용이 높은 경우 HIGH
    if (item.getLevel() === 0 || item.getTotalCost() > 1000) {
      return 'HIGH';
    }
    
    // 중간 레벨이거나 중간 비용인 경우 MEDIUM
    if (item.getLevel() <= 2 || item.getTotalCost() > 100) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  private calculateQuantityChangeImpact(oldQuantity: number, newQuantity: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    const changeRate = Math.abs((newQuantity - oldQuantity) / oldQuantity);
    
    if (changeRate > 0.5) return 'HIGH';
    if (changeRate > 0.2) return 'MEDIUM';
    return 'LOW';
  }

  private calculateCostChangeImpact(oldCost: number, newCost: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    const changeRate = Math.abs((newCost - oldCost) / oldCost);
    
    if (changeRate > 0.3) return 'HIGH';
    if (changeRate > 0.1) return 'MEDIUM';
    return 'LOW';
  }

  private createComparisonSummary(differences: BOMDifference[]): BOMComparisonSummary {
    const summary = {
      totalDifferences: differences.length,
      addedItems: differences.filter(d => d.type === 'ADDED').length,
      removedItems: differences.filter(d => d.type === 'REMOVED').length,
      modifiedItems: differences.filter(d => d.type === 'MODIFIED').length,
      movedItems: differences.filter(d => d.type === 'MOVED').length,
      costImpact: 0
    };

    // 비용 영향 계산
    summary.costImpact = differences
      .filter(d => d.field === 'unitCost' || d.type === 'ADDED' || d.type === 'REMOVED')
      .reduce((total, d) => {
        if (d.type === 'ADDED') return total + (d.newValue || 0);
        if (d.type === 'REMOVED') return total - (d.oldValue || 0);
        if (d.field === 'unitCost') return total + ((d.newValue || 0) - (d.oldValue || 0));
        return total;
      }, 0);

    return summary;
  }
}
```

---

## 🎬 사용자 시나리오

### 👤 시나리오 1: BOM 트리 조회 및 탐색
```
전제조건: 사용자가 BOM 관리 화면에 접속하고 제품을 선택한 상태

1. 사용자가 제품 선택 드롭다운에서 "삼성 갤럭시 S24" 선택
2. 시스템이 해당 제품의 최신 활성 BOM을 조회하여 트리 형태로 표시:
   ├── 삼성 갤럭시 S24 (완제품)
   │   ├── [L1] 메인보드 (1 EA) - ₩150,000
   │   │   ├── [L2] CPU (1 EA) - ₩80,000
   │   │   ├── [L2] 메모리 (1 EA) - ₩40,000
   │   │   └── [L2] PCB (1 EA) - ₩30,000
   │   ├── [L1] 디스플레이 (1 EA) - ₩120,000
   │   ├── [L1] 배터리 (1 EA) - ₩25,000
   │   └── [L1] 케이스 (1 SET) - ₩15,000
3. 사용자가 메인보드 노드의 "▼" 아이콘 클릭하여 하위 구성품 펼침/접기
4. 우측 상단에 "총 구성품: 7개, 총 비용: ₩310,000" 표시
5. 사용자가 "2레벨까지만 보기" 필터 적용 시 L3 이하 구성품 숨김
6. 검색창에 "메모리" 입력 시 해당 구성품만 하이라이트 표시

후속조건: 사용자가 BOM 구조를 직관적으로 파악함
```

### 👤 시나리오 2: BOM 구성품 추가
```
전제조건: BOM 트리가 화면에 표시된 상태

1. 사용자가 메인보드 노드를 우클릭하여 컨텍스트 메뉴 표시
2. "하위 구성품 추가" 메뉴 선택
3. 구성품 추가 모달이 열리며 다음 정보 입력:
   - 구성품: "스피커" 검색하여 선택
   - 소요량: 2
   - 단위: EA
   - 단가: 5,000
   - 스크랩률: 5%
   - 구성품 유형: 구매품
   - 조립위치: 상단
   - 비고: 스테레오 스피커
4. "저장" 버튼 클릭
5. 시스템이 비즈니스 규칙 검증:
   - 중복 구성품 확인
   - 순환 참조 검사
   - 소요량/단가 유효성 확인
6. 검증 성공 시:
   - 새로운 구성품이 메인보드 하위에 추가됨
   - 실제 소요량 계산: 2 × 1.05 = 2.1 EA
   - 총 비용 자동 업데이트: ₩320,000
   - 변경 이력 자동 기록
   - "구성품이 성공적으로 추가되었습니다" 메시지 표시

후속조건: BOM 구조가 업데이트되고 새로운 구성품이 트리에 표시됨
```

### 👤 시나리오 3: BOM 구성품 수정 (인라인 편집)
```
전제조건: BOM 트리에서 수정할 구성품이 표시된 상태

1. 사용자가 "배터리" 구성품의 소요량 셀(1 EA)을 더블클릭
2. 인라인 편집 모드로 전환되어 입력 필드 활성화
3. 사용자가 "2"로 변경하고 Enter 키 누름
4. 시스템이 즉시 검증 및 업데이트:
   - 소요량 유효성 검사
   - 총 비용 재계산: 배터리 비용 ₩25,000 → ₩50,000
   - 전체 BOM 비용 업데이트: ₩320,000 → ₩345,000
5. 변경사항이 시각적으로 표시됨:
   - 수정된 셀에 노란색 배경 하이라이트
   - 비용 변화를 화살표로 표시 (₩25,000 ↗ ₩50,000)
6. 사용자가 "저장" 버튼 클릭하여 확정
7. 변경 이력 자동 기록:
   - "배터리 소요량 변경: 1 → 2 (수요 증가로 인한 변경)"

후속조건: 변경사항이 확정되고 이력으로 기록됨
```

### 👤 시나리오 4: BOM 구성품 삭제
```
전제조건: 삭제할 구성품이 선택된 상태

1. 사용자가 "스피커" 구성품을 선택하고 Delete 키 누름
2. 삭제 확인 대화상자 표시:
   "스피커 구성품을 삭제하시겠습니까?
   ☑ 하위 구성품도 함께 삭제 (하위 구성품이 있는 경우)"
3. 사용자가 "확인" 클릭
4. 시스템이 삭제 가능성 검사:
   - 생산 계획에서 사용 중인지 확인
   - 작업 지시에서 참조 중인지 확인
   - 하위 구성품 존재 여부 확인
5. 삭제 가능한 경우:
   - 해당 구성품이 트리에서 제거됨
   - 총 비용 자동 업데이트: ₩345,000 → ₩335,000
   - 삭제 이력 기록
   - "구성품이 삭제되었습니다" 메시지 표시
6. 삭제 불가능한 경우:
   - "생산 계획에서 사용 중인 BOM의 구성품은 삭제할 수 없습니다" 오류 메시지

후속조건: 구성품이 제거되고 BOM 구조가 업데이트됨
```

### 👤 시나리오 5: BOM 버전 관리 및 복사
```
전제조건: 기존 BOM(v1.0)이 존재하는 상태

1. 사용자가 BOM 헤더의 "버전 관리" 버튼 클릭
2. 버전 관리 모달이 열리며 기존 버전 목록 표시:
   - v1.0 (활성) - 2024-01-15 생성
   - v0.9 (비활성) - 2024-01-10 생성
3. 사용자가 "새 버전 생성" 버튼 클릭
4. BOM 복사 설정 화면이 표시됨:
   - 새 버전: v1.1 (자동 생성)
   - 기준 버전: v1.0 선택
   - 복사 옵션:
     ☑ 비활성 구성품도 포함
     ☑ 단가 조정 (5% 인상)
     ☐ 구조만 복사 (단가 제외)
   - 적용일: 2024-02-01
   - 설명: "원자재 가격 인상 반영"
5. "복사 실행" 버튼 클릭
6. 시스템이 복사 작업 수행:
   - 7개 구성품 복사
   - 단가 5% 인상 적용
   - 새 BOM ID 생성: BOM-20240201001
   - 복사 이력 기록
7. 완료 메시지: "v1.1이 성공적으로 생성되었습니다 (7개 구성품 복사)"
8. 화면에 새 버전(v1.1)의 BOM 트리 표시

후속조건: 새로운 BOM 버전이 생성되어 관리됨
```

### 👤 시나리오 6: BOM 버전 간 비교
```
전제조건: 여러 BOM 버전이 존재하는 상태

1. 사용자가 "BOM 비교" 버튼 클릭
2. 비교 설정 모달이 열림:
   - 기준 버전: v1.0 선택
   - 비교 버전: v1.1 선택
   - 비교 옵션:
     ☑ 구조 변경 포함
     ☑ 수량 변경 포함
     ☑ 단가 변경 포함
3. "비교 실행" 버튼 클릭
4. 비교 결과 화면이 표시됨:
   
   **비교 요약**
   - 총 변경사항: 7건
   - 추가된 구성품: 0개
   - 제거된 구성품: 0개  
   - 수정된 구성품: 7개
   - 총 비용 영향: +₩16,750

   **상세 변경사항** (영향도 순 정렬)
   - [HIGH] CPU 단가: ₩80,000 → ₩84,000 (+5%)
   - [HIGH] 메모리 단가: ₩40,000 → ₩42,000 (+5%)
   - [MEDIUM] 디스플레이 단가: ₩120,000 → ₩126,000 (+5%)
   - [MEDIUM] PCB 단가: ₩30,000 → ₩31,500 (+5%)
   - [LOW] 배터리 단가: ₩25,000 → ₩26,250 (+5%)
   - [LOW] 케이스 단가: ₩15,000 → ₩15,750 (+5%)
   - [LOW] 스피커 단가: ₩5,000 → ₩5,250 (+5%)

5. 사용자가 특정 변경사항 클릭 시 해당 구성품이 트리에서 하이라이트
6. "비교 결과 내보내기" 버튼으로 Excel 리포트 생성 가능

후속조건: 버전 간 차이점을 명확히 파악하여 의사결정에 활용
```

---

## 🎯 **트리 테이블 기능 상세 정의**

### ✅ 필수 기능 (Must Have)

#### 🌳 트리 구조 표시
- [x] **계층적 표시**: 들여쓰기와 연결선으로 부모-자식 관계 표현
- [x] **펼침/접기**: 각 노드별 expand/collapse 기능
- [x] **레벨 표시**: 각 구성품의 계층 레벨 시각적 표시 (L1, L2, L3...)
- [x] **루트 노드**: 완제품을 최상위 노드로 표시

#### 📊 데이터 표시
- [x] **구성품 정보**: 코드, 명칭, 유형, 소요량, 단위, 단가
- [x] **계산 필드**: 총 비용, 실제 소요량(스크랩률 포함)
- [x] **공정 정보**: 투입 공정, 조립 위치
- [x] **상태 표시**: 활성/비활성, 선택사항 여부
- [x] **추가 정보**: 비고

#### ⚡ 인터랙션
- [x] **노드 선택**: 단일/다중 선택 지원
- [x] **컨텍스트 메뉴**: 우클릭으로 추가/수정/삭제 메뉴
- [x] **드래그앤드롭**: 구성품 순서 변경 및 구조 재배치

#### 🎯 액션 버튼
- [x] **구성품 추가**: 선택된 노드의 하위 구성품 추가
- [x] **구성품 수정**: 선택된 구성품 정보 수정 (모달 방식)
- [x] **구성품 삭제**: 선택된 구성품 삭제 (하위 포함 옵션)
- [x] **이력 조회**: 선택된 구성품의 변경 이력

### 💫 고급 기능 (Should Have)

#### 🔍 필터링 및 검색
- [x] **레벨 필터**: 특정 레벨까지만 표시
- [x] **구성품 유형 필터**: 원자재, 구매품, 조립품 등
- [x] **공정별 필터**: 특정 공정에 투입되는 구성품만 표시
- [x] **상태 필터**: 활성/비활성 구성품 필터링
- [x] **검색**: 구성품명, 코드로 검색 및 하이라이트
- [x] **비용 범위 필터**: 특정 비용 범위의 구성품만 표시

#### 🎨 시각화 옵션
- [x] **색상 코딩**: 구성품 유형별 색상 구분
- [x] **아이콘 표시**: 구성품 유형별 아이콘
- [x] **공정별 색상**: 투입 공정별 색상 구분

### 🚀 선택 기능 (Could Have)

#### 🔧 편의 기능
- [x] **컬럼 표시/숨김**: 사용자가 원하는 컬럼만 선택적 표시
- [x] **컬럼 순서 변경**: 드래그앤드롭으로 컬럼 순서 조정
- [x] **컬럼 너비 조정**: 마우스 드래그로 컬럼 너비 변경
- [x] **컬럼 고정**: 좌측 컬럼 고정으로 스크롤 시에도 항상 표시
- [x] **전체 펼치기/접기**: 모든 노드 일괄 펼침/접기
- [x] **엑셀 내보내기**: 현재 표시된 BOM 데이터를 Excel로 출력나리오 분석
- [x] **대체재 분석**: 구성품별 대체재 제안 및 비용 비교
- [x] **공급업체 분석**: 구성품별 공급업체 정보 및 리스크 분석
- [x] **제조 가능성 분석**: 재고 기반 제조 가능 수량 계산

#### 🔧 사용자 설정
- [x] **컬럼 설정**: 표시할 컬럼 선택 및 순서 변경
- [x] **레이아웃 저장**: 사용자별 트리 레이아웃 설정 저장
- [x] **즐겨찾기**: 자주 사용하는 BOM 즐겨찾기 등록
- [x] **대시보드**: 개인화된 BOM 관리 대시보드

---

## 📈 Repository 인터페이스

### BOM Repository
```typescript
// domain/repositories/BOMRepository.ts
export interface BOMRepository {
  findById(id: BOMId): Promise<BOM | null>;
  findByProductId(productId: ProductId): Promise<BOM[]>;
  findByProductIdAndVersion(productId: ProductId, version: string): Promise<BOM | null>;
  findActiveByProductId(productId: ProductId): Promise<BOM | null>;
  save(bom: BOM): Promise<void>;
  delete(id: BOMId): Promise<void>;
  
  // 검색 및 필터링
  findByProductIds(productIds: ProductId[]): Promise<BOM[]>;
  findByVersionPattern(pattern: string): Promise<BOM[]>;
  findActiveBOMsWithinDateRange(startDate: Date, endDate: Date): Promise<BOM[]>;
}

// domain/repositories/BOMItemRepository.ts
export interface BOMItemRepository {
  findById(id: BOMItemId): Promise<BOMItem | null>;
  findByBOMId(bomId: BOMId): Promise<BOMItem[]>;
  findByParentId(parentId: BOMItemId): Promise<BOMItem[]>;
  findByParentAndLevel(bomId: BOMId, parentId: BOMItemId | undefined, level: number): Promise<BOMItem[]>;
  findByComponentId(componentId: ProductId): Promise<BOMItem[]>;
  hasChildren(id: BOMItemId): Promise<boolean>;
  save(bomItem: BOMItem): Promise<void>;
  delete(id: BOMItemId): Promise<void>;
  
  // 트리 구조 전용
  findTreeStructure(bomId: BOMId, maxLevel?: number): Promise<BOMItem[]>;
  findByLevelRange(bomId: BOMId, minLevel: number, maxLevel: number): Promise<BOMItem[]>;
  getMaxLevel(bomId: BOMId): Promise<number>;
}

// domain/repositories/BOMHistoryRepository.ts
export interface BOMHistoryRepository {
  findByBOMId(bomId: BOMId): Promise<BOMHistory[]>;
  findByTargetId(targetId: string): Promise<BOMHistory[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<BOMHistory[]>;
  findByUserId(userId: string): Promise<BOMHistory[]>;
  save(history: BOMHistory): Promise<void>;
}
```

---

## 🎯 다음 단계 구현 가이드

### 1주차: Domain & Application Layer
```typescript
✅ 해야 할 작업:
1. BOM, BOMItem, BOMHistory 엔티티 구현
2. Repository 인터페이스 정의
3. 6개 주요 UseCase 구현
4. 순환 참조 체커 및 사용량 체커 서비스 구현
5. 단위 테스트 작성

📁 생성할 파일:
- domain/entities/BOM.ts
- domain/entities/BOMItem.ts  
- domain/entities/BOMHistory.ts
- domain/repositories/BOMRepository.ts
- domain/repositories/BOMItemRepository.ts
- domain/services/BOMCircularChecker.ts
- domain/services/BOMUsageChecker.ts
- application/usecases/bom/GetBOMTreeUseCase.ts
- application/usecases/bom/AddBOMItemUseCase.ts
- application/usecases/bom/UpdateBOMItemUseCase.ts
- application/usecases/bom/DeleteBOMItemUseCase.ts
- application/usecases/bom/CopyBOMUseCase.ts
- application/usecases/bom/CompareBOMUseCase.ts
```

### 2주차: Infrastructure & Presentation Layer
```typescript
✅ 해야 할 작업:
1. HTTP Repository 구현체 작성
2. DI Container 구성
3. React 트리 테이블 컴포넌트 구현
4. 커스텀 훅 구현 (트리 상태 관리)
5. 컨텍스트 메뉴 및 모달 컴포넌트
6. 통합 테스트 작성

📁 생성할 파일:
- infrastructure/repositories/HttpBOMRepository.ts
- infrastructure/repositories/HttpBOMItemRepository.ts
- config/BOMContainer.ts
- presentation/pages/BOMManagementPage.tsx
- presentation/components/BOMTreeTable.tsx
- presentation/components/BOMNodeRow.tsx
- hooks/useBOMTree.ts
- hooks/useBOMActions.ts
- components/modals/BOMItemFormModal.tsx
- components/modals/BOMCompareModal.tsx
- components/context-menu/BOMContextMenu.tsx
```

### 3주차: 고급 기능 및 최적화
```typescript
✅ 해야 할 작업:
1. 버전 관리 기능 구현
2. BOM 비교 및 분석 기능
3. 드래그앤드롭 구현
4. 성능 최적화 (가상화, 지연 로딩)
5. 접근성 및 키보드 내비게이션
6. E2E 테스트 작성

📁 생성할 파일:
- components/advanced/BOMVersionManager.tsx
- components/advanced/BOMComparisonView.tsx
- components/advanced/BOMAnalyticsDashboard.tsx
- hooks/useBOMDragDrop.ts
- hooks/useBOMVirtualization.ts
- utils/BOMTreeUtils.ts
- utils/BOMAnalyticsCalculator.ts
```

이제 MES BOM 관리 시스템의 클린 아키텍처 설계가 완성되었습니다. 트리 테이블 형태의 복잡한 UI와 다양한 비즈니스 규칙을 체계적으로 관리할 수 있는 구조를 제공합니다.
        