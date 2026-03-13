const jwt = require('jsonwebtoken');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const md = await prisma.user.findFirst({ where: { role: 'MD' } });
  const token = jwt.sign({ id: md.id }, process.env.JWT_SECRET || 'dev_secret_key_for_nexus_hrm', { expiresIn: '1h' });
  
  try {
     const res = await fetch('https://nexus-hrm-api.onrender.com/api/employees', {
         headers: { Authorization: `Bearer ${token}` }
     });
     const data = await res.json();
     console.log('API Returned:', data);
  } catch (err) {
     console.error('Error fetching API:', err.message);
  }
}
test().catch(console.error).finally(() => prisma.$disconnect());
