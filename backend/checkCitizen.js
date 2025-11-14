const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function checkCitizen() {
  try {
    console.log('🔍 Checking citizen account...\n');

    // Get citizen user
    const [users] = await db.query(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      ['citizen@smartwaste.com']
    );

    if (users.length === 0) {
      console.log('❌ Citizen user not found!');
      process.exit(1);
    }

    const user = users[0];
    console.log('✅ Found user:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    console.log('\nStored password hash:', user.password.substring(0, 20) + '...');

    // Test password
    const testPassword = 'citizen123';
    console.log('\nTesting password:', testPassword);
    
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('Password valid:', isValid ? '✅ YES' : '❌ NO');

    if (!isValid) {
      console.log('\n🔧 Updating password...');
      const newHash = await bcrypt.hash(testPassword, 10);
      await db.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [newHash, 'citizen@smartwaste.com']
      );
      console.log('✅ Password updated successfully!');
    }

    console.log('\n✅ Citizen account is ready!');
    console.log('Email: citizen@smartwaste.com');
    console.log('Password: citizen123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCitizen();
