// Test script to verify signup works with remote database
import { createClient } from '@supabase/supabase-js';

// Use the remote Supabase URL from the error message
const supabaseUrl = 'https://irugsjzjqdxulliobuwt.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  console.log('Testing signup process with remote database...');
  
  // Generate a random email for testing
  const testEmail = `test${Math.floor(Math.random() * 10000)}@example.com`;
  const testPassword = 'testpassword123';
  const testName = 'Test User';
  
  try {
    console.log(`Attempting to sign up with email: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: testName,
        }
      }
    });

    if (error) {
      console.error('❌ Signup failed:', error);
      return false;
    }

    console.log('✅ Signup successful!');
    console.log('User ID:', data.user?.id);
    
    // Check if profile was created
    if (data.user?.id) {
      console.log('Checking if profile was created...');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile check failed:', profileError);
        return false;
      }
      
      console.log('✅ Profile created successfully!');
      console.log('Profile data:', profile);
    }
    
    return true;
    
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    return false;
  }
}

// Run the test
testSignup()
  .then(success => {
    if (success) {
      console.log('\n🎉 All tests passed! Signup process is working correctly.');
    } else {
      console.log('\n💥 Tests failed. Check the errors above.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('💥 Test runner failed:', err);
    process.exit(1);
  });
