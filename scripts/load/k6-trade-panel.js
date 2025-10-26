/**
 * K6 Load Testing Script for Trade Panel
 * 
 * Simulates realistic user behavior:
 * - 200 VUs for lightweight reads (quotes/holders)
 * - 50 VUs for trading operations
 * - 100 VUs for chat interactions
 * 
 * Tracks p95 latency, error rates, and dropped WebSocket messages
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const tradeSuccessRate = new Rate('trade_success_rate');
const chatSuccessRate = new Rate('chat_success_rate');
const priceUpdateLatency = new Trend('price_update_latency');
const wsMessageLoss = new Counter('ws_message_loss');
const apiErrorRate = new Rate('api_error_rate');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000/ws/prices';
const TEST_DURATION = __ENV.TEST_DURATION || '2m';
const VU_COUNT = __ENV.VU_COUNT || 350;

// Test data
const TEST_TOKENS = [
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
];

const TEST_USERS = Array.from({ length: 100 }, (_, i) => ({
  id: `test_user_${i}`,
  email: `test${i}@example.com`,
  password: 'TestPassword123!',
  token: null
}));

// Scenario configuration
export const options = {
  scenarios: {
    // Lightweight read operations
    price_readers: {
      executor: 'constant-vus',
      vus: 200,
      duration: TEST_DURATION,
      exec: 'priceReader',
      tags: { scenario: 'price_reader' }
    },

    // Trading operations
    traders: {
      executor: 'constant-vus',
      vus: 50,
      duration: TEST_DURATION,
      exec: 'trader',
      tags: { scenario: 'trader' }
    },
    
    // Chat interactions
    chatters: {
      executor: 'constant-vus',
      vus: 100,
      duration: TEST_DURATION,
      exec: 'chatter',
      tags: { scenario: 'chatter' }
    }
  },

  thresholds: {
    'trade_success_rate': ['rate>0.95'],
    'chat_success_rate': ['rate>0.98'],
    'price_update_latency': ['p(95)<250'],
    'api_error_rate': ['rate<0.05'],
    'http_req_duration': ['p(95)<500'],
    'ws_connect_duration': ['p(95)<1000']
  }
};

// Utility functions
function getRandomToken() {
  return TEST_TOKENS[Math.floor(Math.random() * TEST_TOKENS.length)];
}

function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

function generateRandomQuantity() {
  return (Math.random() * 10 + 0.1).toFixed(6);
}

function generateRandomMessage() {
  const messages = [
    'Great trade! 🚀',
    'This token is pumping!',
    'What do you think about this price?',
    'HODL! 💎',
    'Nice entry point',
    'Volume is looking good',
    'Let\'s go to the moon! 🌙',
    'This is the way',
    'Diamond hands only',
    'Buy the dip!'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Authentication helper
function authenticateUser(user) {
  if (user.token) return user.token;
  
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password
  });
  
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (loginResponse.status === 200) {
    const data = JSON.parse(loginResponse.body);
    user.token = data.token;
    return data.token;
  }
  
  return null;
}

// Price reader scenario
export function priceReader() {
  const user = getRandomUser();
  const token = authenticateUser(user);
  
  if (!token) {
    console.error('Failed to authenticate user for price reading');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test portfolio endpoint
  const portfolioResponse = http.get(`${BASE_URL}/api/portfolio`, { headers });
  check(portfolioResponse, {
    'portfolio status is 200': (r) => r.status === 200,
    'portfolio response time < 500ms': (r) => r.timings.duration < 500
  });
  
  // Test price endpoint
  const tokenMint = getRandomToken();
  const priceResponse = http.get(`${BASE_URL}/api/price/${tokenMint}`, { headers });
  check(priceResponse, {
    'price status is 200': (r) => r.status === 200,
    'price response time < 300ms': (r) => r.timings.duration < 300
  });
  
  // Test search endpoint
  const searchResponse = http.get(`${BASE_URL}/api/search?q=SOL`, { headers });
  check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 400ms': (r) => r.timings.duration < 400
  });
  
  // Track API errors
  apiErrorRate.add(portfolioResponse.status >= 400 ? 1 : 0);
  apiErrorRate.add(priceResponse.status >= 400 ? 1 : 0);
  apiErrorRate.add(searchResponse.status >= 400 ? 1 : 0);
  
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds between requests
}

// Trader scenario
export function trader() {
  const user = getRandomUser();
  const token = authenticateUser(user);
  
  if (!token) {
    console.error('Failed to authenticate user for trading');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  const tokenMint = getRandomToken();
  const quantity = generateRandomQuantity();
  const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
  
  // Execute trade
  const tradePayload = JSON.stringify({
    userId: user.id,
    mint: tokenMint,
    side: side,
    qty: quantity
  });
  
  const tradeResponse = http.post(`${BASE_URL}/api/trade`, tradePayload, { headers });
  
  const tradeSuccess = tradeResponse.status === 200;
  tradeSuccessRate.add(tradeSuccess);
  
  check(tradeResponse, {
    'trade status is 200': (r) => r.status === 200,
    'trade response time < 1000ms': (r) => r.timings.duration < 1000,
    'trade has tradeId': (r) => {
      if (r.status === 200) {
        const data = JSON.parse(r.body);
        return data.trade && data.trade.id;
      }
      return false;
    }
  });
  
  // Track API errors
  apiErrorRate.add(tradeResponse.status >= 400 ? 1 : 0);
  
  // Get portfolio after trade
  if (tradeSuccess) {
    const portfolioResponse = http.get(`${BASE_URL}/api/portfolio`, { headers });
    check(portfolioResponse, {
      'portfolio after trade is 200': (r) => r.status === 200
    });
  }
  
  sleep(Math.random() * 5 + 2); // 2-7 seconds between trades
}

// Chatter scenario
export function chatter() {
  const user = getRandomUser();
  const token = authenticateUser(user);
  
  if (!token) {
    console.error('Failed to authenticate user for chat');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Send chat message
  const message = generateRandomMessage();
  const chatPayload = JSON.stringify({
    userId: user.id,
    roomId: 'general',
    content: message
  });
  
  const chatResponse = http.post(`${BASE_URL}/api/chat/send`, chatPayload, { headers });
  
  const chatSuccess = chatResponse.status === 200;
  chatSuccessRate.add(chatSuccess);
  
  check(chatResponse, {
    'chat status is 200': (r) => r.status === 200,
    'chat response time < 300ms': (r) => r.timings.duration < 300,
    'chat has messageId': (r) => {
      if (r.status === 200) {
        const data = JSON.parse(r.body);
        return data.message && data.message.id;
      }
      return false;
    }
  });
  
  // Track API errors
  apiErrorRate.add(chatResponse.status >= 400 ? 1 : 0);
  
  // Get recent messages
  const messagesResponse = http.get(`${BASE_URL}/api/chat/rooms/general/messages?limit=20`, { headers });
  check(messagesResponse, {
    'messages status is 200': (r) => r.status === 200,
    'messages response time < 200ms': (r) => r.timings.duration < 200
  });
  
  sleep(Math.random() * 3 + 1); // 1-4 seconds between messages
}

// WebSocket price streaming test
export function priceStreamer() {
  const user = getRandomUser();
  const token = authenticateUser(user);
  
  if (!token) {
    console.error('Failed to authenticate user for price streaming');
    return;
  }
  
  const wsUrl = `${WS_URL}?token=${token}`;
  const params = { tags: { scenario: 'price_streamer' } };
  
  ws.connect(wsUrl, params, function (socket) {
    let messageCount = 0;
    let lastTimestamp = Date.now();
    const expectedMessages = 50;
    
    socket.on('open', function () {
      console.log('WebSocket connected for price streaming');
      
      // Subscribe to price updates
      const subscribeMessage = JSON.stringify({
        type: 'subscribe',
        mint: getRandomToken()
      });
      socket.send(subscribeMessage);
    });
    
    socket.on('message', function (data) {
      messageCount++;
      const currentTimestamp = Date.now();
      const latency = currentTimestamp - lastTimestamp;
      
      priceUpdateLatency.add(latency);
      lastTimestamp = currentTimestamp;
      
      try {
        const message = JSON.parse(data);
        check(message, {
          'message has type': (m) => m.t === 'price' || m.type === 'price',
          'message has mint': (m) => m.d && m.d.mint || m.mint,
          'message has price': (m) => m.d && m.d.priceUsd || m.priceUsd
        });
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
      
      if (messageCount >= expectedMessages) {
        socket.close();
      }
    });
    
    socket.on('close', function () {
      console.log('WebSocket closed for price streaming');
    });
    
    socket.on('error', function (e) {
      console.error('WebSocket error:', e);
      wsMessageLoss.add(1);
    });
    
    // Keep connection alive for 30 seconds
    setTimeout(() => {
      socket.close();
    }, 30000);
  });
}

// Setup function
export function setup() {
  console.log('Setting up K6 load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  console.log(`Test Duration: ${TEST_DURATION}`);
  console.log(`VU Count: ${VU_COUNT}`);
  
  // Pre-authenticate some users
  const authPromises = TEST_USERS.slice(0, 10).map(user => {
    return new Promise((resolve) => {
      const loginPayload = JSON.stringify({
        email: user.email,
        password: user.password
      });
      
      const response = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status === 200) {
        const data = JSON.parse(response.body);
        user.token = data.token;
      }
      
      resolve(user);
    });
  });
  
  return Promise.all(authPromises);
}

// Teardown function
export function teardown(data) {
  console.log('K6 load test completed');
  console.log('Test data:', data);
}

// Main execution
export default function() {
  // This function is not used in the current setup
  // Each scenario has its own execution function
}