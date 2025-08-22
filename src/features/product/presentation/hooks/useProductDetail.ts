import { useQuery } from '@tanstack/react-query';
import { ProductDI } from '../../config/ProductDIModule';
import { GetProductDetailResponse } from '../../application/usecases/product/GetProductDetailUseCase';
import { createQueryKey } from '@app/providers/QueryProvider';

/**
 * 제품 상세 정보 조회 Hook
 * 
 * 제품 ID를 기반으로 전체 제품 정보를 조회합니다.
 * additionalInfo를 포함한 모든 정보를 반환합니다.
 */
export const useProductDetail = (productId: string | undefined) => {
  const getProductDetailUseCase = ProductDI.getProductDetailUseCase();

  const productDetailQuery = useQuery<GetProductDetailResponse | null>({
    queryKey: createQueryKey.product.detail(productId || ''),
    queryFn: async () => {
      if (!productId) {
        return null;
      }
      
      console.log('🔍 Fetching product detail for ID:', productId);
      const result = await getProductDetailUseCase.execute({ productId });
      console.log('✅ Product detail fetched:', result);
      
      return result;
    },
    enabled: !!productId, // productId가 있을 때만 쿼리 실행
    staleTime: 1000 * 30, // 30초간 fresh 상태 유지
    gcTime: 1000 * 60 * 5, // 5분간 캐시 유지
    retry: 1,
  });

  return {
    productDetail: productDetailQuery.data,
    loading: productDetailQuery.isLoading,
    error: productDetailQuery.error?.message || null,
    isFetching: productDetailQuery.isFetching,
    refetch: productDetailQuery.refetch,
  };
};