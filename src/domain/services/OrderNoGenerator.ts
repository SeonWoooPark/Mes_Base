/**
 * OrderNoGenerator 수주번호 자동 채번 서비스
 * 
 * 수주 타입별 수주번호 자동 생성 및 유효성 검증
 * 형식: SO + [타입코드] + [년월] + [시퀀스]
 * 예시: SOD24120001 (2024년 12월 내수 첫 번째 수주)
 */

import { OrderType } from '../entities/Order';

export interface OrderNoInfo {
  prefix: string;
  year: string;
  month: string;
  sequence: number;
  orderType: OrderType;
  isValid: boolean;
}

export interface OrderNoGenerator {
  generateOrderNo(orderType?: OrderType): Promise<string>;
  validateOrderNo(orderNo: string): boolean;
  parseOrderNo(orderNo: string): OrderNoInfo;
}

export interface SequenceRepository {
  getNextSequence(prefix: string): Promise<number>;
  getCurrentSequence(prefix: string): Promise<number>;
  resetSequence(prefix: string): Promise<void>;
}

export class DefaultOrderNoGenerator implements OrderNoGenerator {
  constructor(
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