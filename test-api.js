#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080';

async function testProductAPIs() {
  console.log('🧪 제품 정보 관리 API 테스트 시작\n');
  
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
      nm_material: 'API 테스트 제품',
      type: 'RAW_MATERIAL',
      category: { code: 'TEST', name: '테스트' },
      unit: { code: 'EA', name: '개' },
      safetyStock: 100,
      isActive: true,
      additionalInfo: {
        description: 'API 테스트용 제품',
        specifications: '테스트 스펙',
        notes: '테스트 노트'
      },
      id_create: 'api-test'
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/api/products`, newProduct);
    const createdProductId = createResponse.data.data.id;
    console.log('✅ 제품 생성 성공:', {
      id: createdProductId,
      cd_material: createResponse.data.data.cd_material,
      nm_material: createResponse.data.data.nm_material
    });
    console.log('');

    // 3. 제품 상세 조회
    console.log('3️⃣ 제품 상세 조회 테스트');
    const detailResponse = await axios.get(`${API_BASE_URL}/api/products/${createdProductId}`);
    console.log('✅ 제품 상세 조회 성공:', {
      id: detailResponse.data.data.id,
      nm_material: detailResponse.data.data.nm_material,
      type: detailResponse.data.data.type
    });
    console.log('');

    // 4. 제품 수정
    console.log('4️⃣ 제품 수정 테스트');
    const updateData = {
      nm_material: 'API 테스트 제품 (수정됨)',
      safetyStock: 200,
      id_updated: 'api-test',
      reason: 'API 테스트 수정'
    };
    
    const updateResponse = await axios.put(`${API_BASE_URL}/api/products/${createdProductId}`, updateData);
    console.log('✅ 제품 수정 성공:', {
      id: updateResponse.data.data.id,
      nm_material: updateResponse.data.data.nm_material,
      safetyStock: updateResponse.data.data.safetyStock
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
      console.log('   최근 이력:', historyResponse.data.data.data[0]);
    }
    console.log('');

    // 6. 제품 삭제 (소프트 삭제)
    console.log('6️⃣ 제품 삭제 테스트');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/api/products/${createdProductId}`, {
      data: {
        id_updated: 'api-test',
        reason: 'API 테스트 삭제',
        softDelete: true
      }
    });
    console.log('✅ 제품 삭제 성공:', deleteResponse.data.message);
    console.log('');

    // 7. 삭제 후 상태 확인
    console.log('7️⃣ 삭제 후 상태 확인');
    const checkResponse = await axios.get(`${API_BASE_URL}/api/products/${createdProductId}`);
    console.log('✅ 삭제 후 상태:', {
      id: checkResponse.data.data.id,
      isActive: checkResponse.data.data.isActive
    });

    console.log('\n✨ 모든 API 테스트 성공!');

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