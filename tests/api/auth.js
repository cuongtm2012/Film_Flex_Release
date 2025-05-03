// Authentication API tests

import fetch from 'node-fetch';

/**
 * Test user registration and authentication
 * This test covers:
 * 1. Registering a new user
 * 2. Attempting to register a duplicate user (should fail)
 * 3. Login with valid credentials
 * 4. Login with invalid credentials (should fail)
 * 5. Accessing a protected route
 * 6. Logging out
 * 7. Verifying protected routes are inaccessible after logout
 */
async function testAuthentication() {
  console.log('\n=== Testing Authentication API ===');
  
  // Generate a unique test username to avoid conflicts
  const testUsername = `test_user_${Date.now()}`;
  const testPassword = 'Test@123456';
  const testEmail = `${testUsername}@example.com`;
  const testFullName = 'Test User';
  let authCookie = null;
  
  try {
    // 1. Test user registration
    console.log('\n1. Testing user registration...');
    
    const registerData = {
      username: testUsername,
      password: testPassword,
      confirmPassword: testPassword, // Make sure to include confirmPassword
      email: testEmail,
      fullName: testFullName
    };
    
    const registerResponse = await fetch('http://localhost:5000/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });
    
    console.log(`Registration status: ${registerResponse.status}`);
    
    if (registerResponse.status === 201) {
      const userData = await registerResponse.json();
      console.log('✅ Registration successful');
      console.log(`User created with ID: ${userData.id}`);
      
      // 2. Test duplicate registration
      console.log('\n2. Testing duplicate registration...');
      
      const duplicateResponse = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      
      console.log(`Duplicate registration status: ${duplicateResponse.status}`);
      
      if (duplicateResponse.status === 400) {
        console.log('✅ Duplicate registration correctly rejected');
      } else {
        console.log('❌ Duplicate registration was not properly handled');
      }
      
      // 3. Test login with valid credentials
      console.log('\n3. Testing login with valid credentials...');
      
      const loginResponse = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          password: testPassword
        })
      });
      
      console.log(`Login status: ${loginResponse.status}`);
      
      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        console.log(`Logged in as: ${loginData.username}`);
        
        // Store the auth cookie for subsequent requests
        authCookie = loginResponse.headers.get('set-cookie');
        console.log(`Auth cookie received: ${authCookie ? 'Yes' : 'No'}`);
      } else {
        console.log('❌ Login failed');
        if (loginResponse.headers.get('content-type')?.includes('application/json')) {
          const errorData = await loginResponse.json();
          console.log('Error message:', errorData.message || 'No error message');
        }
      }
      
      // 4. Test login with invalid credentials
      console.log('\n4. Testing login with invalid credentials...');
      
      const badLoginResponse = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          password: 'wrong_password'
        })
      });
      
      console.log(`Invalid login status: ${badLoginResponse.status}`);
      
      if (badLoginResponse.status === 401) {
        console.log('✅ Invalid login correctly rejected');
      } else {
        console.log('❌ Invalid login was not properly handled');
      }
      
      // 5. Test accessing protected route
      if (authCookie) {
        console.log('\n5. Testing access to protected route...');
        
        const userInfoResponse = await fetch('http://localhost:5000/api/user', {
          headers: { 'Cookie': authCookie }
        });
        
        console.log(`Protected route status: ${userInfoResponse.status}`);
        
        if (userInfoResponse.status === 200) {
          const userData = await userInfoResponse.json();
          console.log('✅ Protected route access successful');
          console.log(`User info: ${JSON.stringify(userData)}`);
        } else {
          console.log('❌ Protected route access failed');
        }
        
        // 6. Test logout
        console.log('\n6. Testing logout...');
        
        const logoutResponse = await fetch('http://localhost:5000/api/logout', {
          method: 'POST',
          headers: { 'Cookie': authCookie }
        });
        
        console.log(`Logout status: ${logoutResponse.status}`);
        
        if (logoutResponse.status === 200) {
          console.log('✅ Logout successful');
          
          // 7. Verify protected route is inaccessible after logout
          console.log('\n7. Testing protected route after logout...');
          
          const afterLogoutResponse = await fetch('http://localhost:5000/api/user', {
            headers: { 'Cookie': authCookie }
          });
          
          console.log(`Protected route after logout status: ${afterLogoutResponse.status}`);
          
          if (afterLogoutResponse.status === 401) {
            console.log('✅ Protected route correctly inaccessible after logout');
          } else {
            console.log('❌ Protected route still accessible after logout');
          }
        } else {
          console.log('❌ Logout failed');
        }
      } else {
        console.log('\n5-7. Skipping protected route and logout tests (no auth cookie)');
      }
    } else {
      console.log('❌ Registration failed');
      
      if (registerResponse.headers.get('content-type')?.includes('application/json')) {
        const errorData = await registerResponse.json();
        console.log('Error message:', errorData.message || 'No error message');
      }
    }
  } catch (error) {
    console.error('Unexpected error during authentication tests:', error);
  }
  
  console.log('\n=== Authentication API Tests Completed ===');
}

// Run the tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testAuthentication();
}

export { testAuthentication };