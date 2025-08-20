/**
 * UseCase 자동 생성기
 * 
 * 새로운 UseCase를 자동으로 생성하여 개발 생산성을 극대화
 * - 표준화된 UseCase 템플릿
 * - TypeScript 타입 안전성 보장
 * - Clean Architecture 패턴 준수
 * - 자동 의존성 주입 설정
 * 
 * 사용 예시:
 * ```typescript
 * const generator = new UseCaseGenerator('Product', 'UpdateProductStock');
 * generator
 *   .withRepository('ProductRepository')
 *   .withService('StockValidator')
 *   .generateFiles();
 * ```
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * UseCase 생성 옵션
 */
export interface UseCaseGenerationOptions {
  featureName: string;
  useCaseName: string;
  repositories: string[];
  services: string[];
  inputType?: string;
  outputType?: string;
  description?: string;
  author?: string;
  generateTests?: boolean;
}

/**
 * 생성된 파일 정보
 */
export interface GeneratedFileInfo {
  path: string;
  type: 'usecase' | 'interface' | 'test';
  name: string;
}

/**
 * UseCase 생성 결과
 */
export interface UseCaseGenerationResult {
  useCaseName: string;
  generatedFiles: GeneratedFileInfo[];
  success: boolean;
  errors: string[];
}

/**
 * UseCase 자동 생성기 클래스
 */
export class UseCaseGenerator {
  private options: Partial<UseCaseGenerationOptions> = {};

  constructor(featureName: string, useCaseName: string) {
    this.options.featureName = featureName;
    this.options.useCaseName = useCaseName;
    this.options.repositories = [];
    this.options.services = [];
    this.options.generateTests = true;
    this.options.author = 'MES System';
    this.options.description = `${useCaseName} 유스케이스`;
  }

  /**
   * Repository 의존성 추가
   */
  withRepository(repositoryName: string): UseCaseGenerator {
    this.options.repositories!.push(repositoryName);
    return this;
  }

  /**
   * 여러 Repository 의존성 추가
   */
  withRepositories(repositories: string[]): UseCaseGenerator {
    this.options.repositories!.push(...repositories);
    return this;
  }

  /**
   * Service 의존성 추가
   */
  withService(serviceName: string): UseCaseGenerator {
    this.options.services!.push(serviceName);
    return this;
  }

  /**
   * 여러 Service 의존성 추가
   */
  withServices(services: string[]): UseCaseGenerator {
    this.options.services!.push(...services);
    return this;
  }

  /**
   * 입출력 타입 설정
   */
  withTypes(inputType: string, outputType: string): UseCaseGenerator {
    this.options.inputType = inputType;
    this.options.outputType = outputType;
    return this;
  }

  /**
   * 설명 추가
   */
  withDescription(description: string): UseCaseGenerator {
    this.options.description = description;
    return this;
  }

  /**
   * 작성자 설정
   */
  withAuthor(author: string): UseCaseGenerator {
    this.options.author = author;
    return this;
  }

  /**
   * 테스트 파일 생성 여부 설정
   */
  withTests(generateTests: boolean): UseCaseGenerator {
    this.options.generateTests = generateTests;
    return this;
  }

  /**
   * UseCase 파일들 생성
   */
  generateFiles(): UseCaseGenerationResult {
    const result: UseCaseGenerationResult = {
      useCaseName: this.options.useCaseName!,
      generatedFiles: [],
      success: false,
      errors: [],
    };

    try {
      this.validateOptions();
      
      // 디렉토리 생성
      this.ensureDirectories();
      
      // UseCase 파일 생성
      this.generateUseCaseFile(result);
      
      // 인터페이스 파일 생성
      this.generateInterfaceFile(result);
      
      // 테스트 파일 생성 (옵션)
      if (this.options.generateTests) {
        this.generateTestFile(result);
      }

      result.success = true;
      console.log(`✅ ${this.options.useCaseName} UseCase generated successfully`);
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error(`❌ Failed to generate ${this.options.useCaseName} UseCase:`, error);
    }

    return result;
  }

  /**
   * 옵션 유효성 검증
   */
  private validateOptions(): void {
    if (!this.options.featureName) {
      throw new Error('Feature name is required');
    }
    if (!this.options.useCaseName) {
      throw new Error('UseCase name is required');
    }
  }

  /**
   * 필요한 디렉토리 생성
   */
  private ensureDirectories(): void {
    const basePath = this.getBasePath();
    const testPath = join(basePath, '__tests__');

    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }

    if (this.options.generateTests && !existsSync(testPath)) {
      mkdirSync(testPath, { recursive: true });
    }
  }

  /**
   * UseCase 파일 생성
   */
  private generateUseCaseFile(result: UseCaseGenerationResult): void {
    const template = this.generateUseCaseTemplate();
    const filePath = join(this.getBasePath(), `${this.options.useCaseName}.ts`);
    
    writeFileSync(filePath, template);
    
    result.generatedFiles.push({
      path: filePath,
      type: 'usecase',
      name: `${this.options.useCaseName}.ts`,
    });
  }

  /**
   * 인터페이스 파일 생성
   */
  private generateInterfaceFile(result: UseCaseGenerationResult): void {
    const template = this.generateInterfaceTemplate();
    const filePath = join(this.getBasePath(), `${this.options.useCaseName}Interfaces.ts`);
    
    writeFileSync(filePath, template);
    
    result.generatedFiles.push({
      path: filePath,
      type: 'interface',
      name: `${this.options.useCaseName}Interfaces.ts`,
    });
  }

  /**
   * 테스트 파일 생성
   */
  private generateTestFile(result: UseCaseGenerationResult): void {
    const template = this.generateTestTemplate();
    const filePath = join(this.getBasePath(), '__tests__', `${this.options.useCaseName}.test.ts`);
    
    writeFileSync(filePath, template);
    
    result.generatedFiles.push({
      path: filePath,
      type: 'test',
      name: `${this.options.useCaseName}.test.ts`,
    });
  }

  /**
   * 기본 경로 생성
   */
  private getBasePath(): string {
    return join(
      process.cwd(),
      'src',
      'features',
      this.options.featureName!.toLowerCase(),
      'application',
      'usecases',
      this.options.featureName!.toLowerCase()
    );
  }

  /**
   * UseCase 템플릿 생성
   */
  private generateUseCaseTemplate(): string {
    const { featureName, useCaseName, repositories, services, description, author } = this.options;
    const inputType = this.options.inputType || `${useCaseName}Request`;
    const outputType = this.options.outputType || `${useCaseName}Response`;

    const repositoryImports = repositories!.map(repo => 
      `import type { ${repo} } from '../../../domain/repositories/${repo}';`
    ).join('\n');

    const serviceImports = services!.map(service => 
      `import type { ${service} } from '../../../domain/services/${service}';`
    ).join('\n');

    const repositoryInjections = repositories!.map(repo => 
      `    @inject(${featureName!.toUpperCase()}_TOKENS.${repo}) private ${repo.charAt(0).toLowerCase()}${repo.slice(1)}: ${repo},`
    ).join('\n');

    const serviceInjections = services!.map(service => 
      `    @inject(${featureName!.toUpperCase()}_TOKENS.${service}) private ${service.charAt(0).toLowerCase()}${service.slice(1)}: ${service},`
    ).join('\n');

    return `/**
 * ${description}
 * 
 * 작성자: ${author}
 * 생성일: ${new Date().toISOString().split('T')[0]}
 * 
 * 워크플로우:
 * 1. 요청 데이터 검증
 * 2. 비즈니스 로직 실행
 * 3. 결과 반환
 * 
 * 의존성:
${repositories!.map(repo => ` * - ${repo}: 데이터 저장소`).join('\n')}
${services!.map(service => ` * - ${service}: 도메인 서비스`).join('\n')}
 */

import { injectable, inject } from 'tsyringe';
${repositoryImports}
${serviceImports}
import type { ${inputType}, ${outputType} } from './${useCaseName}Interfaces';
import * as ${featureName}DIModule from '../../../config/${featureName}DIModule';

// Token 상수 추출
const ${featureName!.toUpperCase()}_TOKENS = ${featureName}DIModule.${featureName!.toUpperCase()}_TOKENS;

/**
 * ${description} 클래스
 * Clean Architecture의 Application Layer에 위치
 * 
 * @injectable - tsyringe DI 컨테이너가 이 클래스의 인스턴스를 관리
 */
@injectable()
export class ${useCaseName} {
  constructor(
${repositoryInjections}
${serviceInjections}
  ) {}

  /**
   * ${description} 실행
   * @param request 요청 정보
   * @returns 실행 결과
   */
  async execute(request: ${inputType}): Promise<${outputType}> {
    // 1. 요청 데이터 유효성 검증
    this.validateRequest(request);

    // 2. 비즈니스 로직 실행
    // TODO: 실제 비즈니스 로직 구현
    
    // 3. 결과 반환
    return {
      success: true,
      message: '${description}가 성공적으로 완료되었습니다.',
      data: null, // TODO: 실제 반환 데이터 설정
    } as ${outputType};
  }

  /**
   * 요청 데이터 유효성 검증
   * @param request 검증할 요청 데이터
   */
  private validateRequest(request: ${inputType}): void {
    if (!request) {
      throw new Error('요청 데이터가 필요합니다.');
    }
    
    // TODO: 구체적인 검증 로직 추가
  }
}`;
  }

  /**
   * 인터페이스 템플릿 생성
   */
  private generateInterfaceTemplate(): string {
    const { useCaseName, description } = this.options;
    const inputType = this.options.inputType || `${useCaseName}Request`;
    const outputType = this.options.outputType || `${useCaseName}Response`;

    return `/**
 * ${description} 인터페이스 정의
 * 
 * UseCase의 입출력 타입과 관련 인터페이스들을 정의
 */

/**
 * ${description} 요청 인터페이스
 */
export interface ${inputType} {
  // TODO: 실제 요청 필드 정의
  id?: string;
  data?: any;
}

/**
 * ${description} 응답 인터페이스
 */
export interface ${outputType} {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

/**
 * ${description} 에러 타입
 */
export enum ${useCaseName}ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

/**
 * ${description} 에러 정보
 */
export interface ${useCaseName}Error {
  type: ${useCaseName}ErrorType;
  message: string;
  field?: string;
  code?: string;
}`;
  }

  /**
   * 테스트 템플릿 생성
   */
  private generateTestTemplate(): string {
    const { useCaseName, repositories, services, description } = this.options;
    const inputType = this.options.inputType || `${useCaseName}Request`;

    const repositoryMocks = repositories!.map(repo => 
      `  let mock${repo}: jest.Mocked<${repo}>;`
    ).join('\n');

    const serviceMocks = services!.map(service => 
      `  let mock${service}: jest.Mocked<${service}>;`
    ).join('\n');

    const mockSetup = [
      ...repositories!.map(repo => `    mock${repo} = createMock${repo}();`),
      ...services!.map(service => `    mock${service} = createMock${service}();`)
    ].join('\n');

    const constructorParams = [
      ...repositories!.map(repo => `mock${repo}`),
      ...services!.map(service => `mock${service}`)
    ].join(', ');

    return `/**
 * ${description} 테스트
 */

import { ${useCaseName} } from '../${useCaseName}';
import type { ${inputType} } from '../${useCaseName}Interfaces';
${repositories!.map(repo => `import type { ${repo} } from '../../../../domain/repositories/${repo}';`).join('\n')}
${services!.map(service => `import type { ${service} } from '../../../../domain/services/${service}';`).join('\n')}

// Mock 생성 함수들
${repositories!.map(repo => `const createMock${repo} = (): jest.Mocked<${repo}> => ({
  // TODO: Repository 메서드 mock 구현
} as jest.Mocked<${repo}>);`).join('\n\n')}

${services!.map(service => `const createMock${service} = (): jest.Mocked<${service}> => ({
  // TODO: Service 메서드 mock 구현
} as jest.Mocked<${service}>);`).join('\n\n')}

describe('${useCaseName}', () => {
  let useCase: ${useCaseName};
${repositoryMocks}
${serviceMocks}

  beforeEach(() => {
${mockSetup}
    useCase = new ${useCaseName}(${constructorParams});
  });

  describe('execute', () => {
    it('should execute successfully with valid request', async () => {
      // Given
      const request: ${inputType} = {
        // TODO: 테스트 데이터 설정
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should throw error with invalid request', async () => {
      // Given
      const invalidRequest = null as any;

      // When & Then
      await expect(useCase.execute(invalidRequest)).rejects.toThrow('요청 데이터가 필요합니다.');
    });

    // TODO: 추가 테스트 케이스 작성
  });
});`;
  }
}

/**
 * 빠른 UseCase 생성을 위한 헬퍼 함수
 */
export const generateUseCase = (options: UseCaseGenerationOptions): UseCaseGenerationResult => {
  const generator = new UseCaseGenerator(options.featureName, options.useCaseName);
  
  return generator
    .withRepositories(options.repositories)
    .withServices(options.services)
    .withTypes(options.inputType || '', options.outputType || '')
    .withDescription(options.description || '')
    .withAuthor(options.author || 'MES System')
    .withTests(options.generateTests !== false)
    .generateFiles();
};

/**
 * 표준 CRUD UseCase들을 일괄 생성하는 헬퍼
 */
export const generateCRUDUseCases = (
  featureName: string,
  entityName: string,
  repositoryName: string
): UseCaseGenerationResult[] => {
  const useCases = [
    { name: `Create${entityName}UseCase`, description: `${entityName} 생성` },
    { name: `Get${entityName}ListUseCase`, description: `${entityName} 목록 조회` },
    { name: `Get${entityName}ByIdUseCase`, description: `${entityName} 상세 조회` },
    { name: `Update${entityName}UseCase`, description: `${entityName} 수정` },
    { name: `Delete${entityName}UseCase`, description: `${entityName} 삭제` },
  ];

  return useCases.map(useCase => 
    generateUseCase({
      featureName,
      useCaseName: useCase.name,
      repositories: [repositoryName],
      services: [],
      description: useCase.description,
      generateTests: true,
    })
  );
};

/**
 * UseCase 생성 결과 출력 유틸리티
 */
export const printGenerationResult = (result: UseCaseGenerationResult): void => {
  console.log(`\n📁 ${result.useCaseName} Generation Result:`);
  console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
  
  if (result.errors.length > 0) {
    console.log('   Errors:');
    result.errors.forEach(error => console.log(`     - ${error}`));
  }
  
  if (result.generatedFiles.length > 0) {
    console.log('   Generated Files:');
    result.generatedFiles.forEach(file => {
      const icon = file.type === 'usecase' ? '🎯' : file.type === 'test' ? '🧪' : '📄';
      console.log(`     ${icon} ${file.name}`);
    });
  }
};