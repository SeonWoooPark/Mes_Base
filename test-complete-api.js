#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080';

async function testProductAPIs() {
  console.log('🧪 제품 정보 관리 전체 API 테스트 시작\n');
  
  try {
    // 1. 제품 목록 조회
    console.log('1️⃣ 제품 목록 조회 테스트');
    const listResponse = await axios.get(`${API_BASE_URL}/api/products?page=1&pageSize=10`);
    console.log('✅ 제품 목록 조회 성공:', {
      totalCount: listResponse.data.data.totalCount,
      currentPage: listResponse.data.data.currentPage,
      productsLength: listResponse.data.data.data.length
    });
    console.log('');

    // 2. 제품 생성
    console.log('2️⃣ 제품 생성 테스트');
    const newProduct = {
      nm_material: '전체 테스트 제품',
      type: 'RAW_MATERIAL',
      category: { code: 'TEST', name: '테스트' },
      unit: { code: 'EA', name: '개' },
      safetyStock: 100,
      isActive: true,
      additionalInfo: {
        description: '전체 API 테스트용 제품',
        specifications: '테스트 스펙',
        notes: '테스트 노트'
      },
      id_create: 'api-test'
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/api/products`, newProduct);
    const createdProductId = createResponse.data.data.productId;
    const createdProductCode = createResponse.data.data.productCode;
    console.log('✅ 제품 생성 성공:', {
      id: createdProductId,
      productCode: createdProductCode,
      message: createResponse.data.data.message
    });
    console.log('');

    // 3. 제품 상세 조회
    console.log('3️⃣ 제품 상세 조회 테스트');
    const detailResponse = await axios.get(`${API_BASE_URL}/api/products/${createdProductId}`);
    console.log('✅ 제품 상세 조회 성공:', {
      id: detailResponse.data.data.id,
      cd_material: detailResponse.data.data.cd_material,
      nm_material: detailResponse.data.data.nm_material,
      type: detailResponse.data.data.type,
      safetyStock: detailResponse.data.data.safetyStock
    });
    console.log('');

    // 4. 제품 수정 (백엔드 API 스펙에 맞게)
    console.log('4️⃣ 제품 수정 테스트');
    const updateData = {
      nm_material: '전체 테스트 제품 (수정됨)',
      safetyStock: 200,
      id_update: 'api-test',  // id_updated가 아닌 id_update 사용
      updateReason: 'API 테스트 수정'
    };
    
    const updateResponse = await axios.put(`${API_BASE_URL}/api/products/${createdProductId}`, updateData);
    console.log('✅ 제품 수정 성공:', {
      productId: updateResponse.data.data.productId,
      message: updateResponse.data.data.message,
      updatedFields: updateResponse.data.data.updatedFields
    });
    console.log('');

    // 5. 제품 이력 조회
    console.log('5️⃣ 제품 이력 조회 테스트');
    const historyResponse = await axios.get(`${API_BASE_URL}/api/products/${createdProductId}/history?page=1&pageSize=10`);
    console.log('✅ 제품 이력 조회 성공:', {
      totalCount: historyResponse.data.data.totalCount,
      historiesLength: historyResponse.data.data.data.length
    });
    if (historyResponse.data.data.data.length > 0) {
      const latestHistory = historyResponse.data.data.data[0];
      console.log('   최근 이력:', {
        action: latestHistory.action,
        actionName: latestHistory.actionName,
        changedFields: latestHistory.changedFields,
        timestamp: latestHistory.timestamp
      });
    }
    console.log('');

    // 6. 제품 삭제 (백엔드 API 스펙에 맞게)
    console.log('6️⃣ 제품 삭제 테스트');
    const deleteData = {
      deleteReason: 'API 테스트 삭제',  // reason이 아닌 deleteReason 사용
      id_delete: 'api-test',  // id_updated가 아닌 id_delete 사용
      softDelete: true
    };
    
    const deleteResponse = await axios.delete(`${API_BASE_URL}/api/products/${createdProductId}`, {
      data: deleteData
    });
    console.log('✅ 제품 삭제 성공:', {
      productId: deleteResponse.data.data.productId,
      message: deleteResponse.data.data.message,
      deleteType: deleteResponse.data.data.deleteType
    });
    console.log('');

    // 7. 삭제 후 상태 확인
    console.log('7️⃣ 삭제 후 상태 확인');
    const checkResponse = await axios.get(`${API_BASE_URL}/api/products/${createdProductId}`);
    console.log('✅ 삭제 후 상태:', {
      id: checkResponse.data.data.id,
      nm_material: checkResponse.data.data.nm_material,
      isActive: checkResponse.data.data.isActive
    });

    console.log('\n✨ 모든 API 테스트 성공!');
    console.log('📝 테스트 요약:');
    console.log('   - 제품 목록 조회: ✅');
    console.log('   - 제품 생성: ✅');
    console.log('   - 제품 상세 조회: ✅');
    console.log('   - 제품 수정: ✅');
    console.log('   - 제품 이력 조회: ✅');
    console.log('   - 제품 삭제 (소프트): ✅');
    console.log('   - 삭제 후 상태 확인: ✅');

  } catch (error) {
    console.error('❌ API 테스트 실패:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    process.exit(1);
  }
}

testProductAPIs();