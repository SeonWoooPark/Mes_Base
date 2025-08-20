// API 연결 테스트 스크립트
const axios = require('axios');

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

async function testAPIConnection() {
  console.log(`🔍 Testing API connection to: ${API_BASE_URL}`);
  
  try {
    // 1. 기본 연결 테스트 (health check)
    console.log('\n📊 1. Health Check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Health check successful:', healthResponse.status);
  } catch (error) {
    console.log('❌ Health check failed - 서버가 실행되고 있지 않거나 경로가 잘못되었을 수 있습니다.');
    console.log('Error:', error.message);
  }

  try {
    // 2. Product API 테스트
    console.log('\n📦 2. Testing Product API...');
    const productResponse = await axios.get(`${API_BASE_URL}/api/products`, { 
      timeout: 5000,
      params: { page: 1, pageSize: 5 }
    });
    console.log('✅ Product API successful:', productResponse.status);
    console.log('Response structure:', Object.keys(productResponse.data));
  } catch (error) {
    console.log('❌ Product API failed');
    if (error.response) {
      console.log(`HTTP ${error.response.status}: ${error.response.statusText}`);
      console.log('Response:', error.response.data);
    } else if (error.request) {
      console.log('No response received - 서버가 응답하지 않습니다.');
    } else {
      console.log('Error:', error.message);
    }
  }

  try {
    // 3. BOM API 테스트  
    console.log('\n🏗️ 3. Testing BOM API...');
    const bomResponse = await axios.get(`${API_BASE_URL}/api/boms`, { 
      timeout: 5000,
      params: { page: 1, pageSize: 5 }
    });
    console.log('✅ BOM API successful:', bomResponse.status);
    console.log('Response structure:', Object.keys(bomResponse.data));
  } catch (error) {
    console.log('❌ BOM API failed');
    if (error.response) {
      console.log(`HTTP ${error.response.status}: ${error.response.statusText}`);
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n🔧 API 연동 확인 완료!');
  console.log('\n💡 다음 단계:');
  console.log('   1. 백엔드 서버가 실행 중인지 확인');
  console.log('   2. API 엔드포인트가 올바르게 구현되어 있는지 확인');
  console.log('   3. CORS 설정이 적절한지 확인');
  console.log('   4. 응답 데이터 구조가 Frontend 예상과 일치하는지 확인');
}

testAPIConnection();