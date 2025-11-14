const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function createCitizen() {
  try {
    console.log('🔧 Creating citizen user...\n');

    // Check if citizen already exists
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      ['citizen@smartwaste.com']
    );

    if (existing.length > 0) {
      console.log('✅ Citizen user already exists!');
      process.exit(0);
    }

    // Hash password
    const password = await bcrypt.hash('citizen123', 10);

    // Insert citizen user
    await db.query(
      `INSERT INTO users (name, email, password, phone, address, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Jane Citizen', 'citizen@smartwaste.com', password, '+0987654321', '123 Main Street', 'citizen']
    );

    console.log('✅ Citizen user created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: citizen@smartwaste.com');
    console.log('Password: citizen123');
    console.log('Role: citizen');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createCitizen();
