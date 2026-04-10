import prisma from '../prisma/client';
import bcrypt from 'bcryptjs';
import { maybeEncrypt } from '../utils/encryption';

export class DemoSeederService {
  /**
   * Seeds a professional dataset for a given organization.
   * Ensures absolute isolation by only operating on data within organizationId.
   */
  static async seedTenantData(organizationId: string) {
    console.log(`[DemoSeeder] Initiating professional seed for Org: ${organizationId}`);

    const hash = async (pw: string) => await bcrypt.hash(pw, 12);
    const commonPass = await hash('NexusDemo@2025');

    // 1. Create Core Departments
    const depts = [
      { name: 'Executive Suite', description: 'Leadership and Strategy' },
      { name: 'Human Resources', description: 'People and Culture' },
      { name: 'Finance & Accounts', description: 'Financial Operations' },
      { name: 'IT & Infrastructure', description: 'Technology and Security' },
      { name: 'Operations', description: 'Core Business Logistics' },
      { name: 'Sales & Marketing', description: 'Growth and Branding' },
    ];

    const createdDepts = await Promise.all(
      depts.map(d => prisma.department.create({
        data: { ...d, organizationId }
      }))
    );

    const getDeptId = (name: string) => createdDepts.find(d => d.name === name)?.id;

    // 2. Create MD (Managing Director)
    const md = await prisma.user.create({
      data: {
        organizationId,
        fullName: 'Executive Director',
        email: `md@demo-${organizationId.slice(0, 4)}.com`,
        passwordHash: commonPass,
        role: 'MD',
        jobTitle: 'Managing Director',
        employeeCode: 'DEMO-001',
        departmentId: getDeptId('Executive Suite'),
        status: 'ACTIVE',
        joinDate: new Date('2023-01-01'),
        leaveBalance: 30,
        leaveAllowance: 30,
        salary: 15000,
        currency: 'USD',
        salaryEnc: maybeEncrypt('15000')
      }
    });

    // 3. Create Key Managers
    const hrManager = await prisma.user.create({
      data: {
        organizationId,
        fullName: 'Sarah Jenkins',
        email: `hr@demo-${organizationId.slice(0, 4)}.com`,
        passwordHash: commonPass,
        role: 'HR_OFFICER',
        jobTitle: 'HR Manager',
        employeeCode: 'DEMO-002',
        departmentId: getDeptId('Human Resources'),
        supervisorId: md.id,
        status: 'ACTIVE',
        joinDate: new Date('2023-06-15'),
        salary: 8500,
        currency: 'USD',
        salaryEnc: maybeEncrypt('8500')
      }
    });

    const itManager = await prisma.user.create({
      data: {
        organizationId,
        fullName: 'David Tech',
        email: `it@demo-${organizationId.slice(0, 4)}.com`,
        passwordHash: commonPass,
        role: 'IT_MANAGER',
        jobTitle: 'IT Infrastructure Manager',
        employeeCode: 'DEMO-003',
        departmentId: getDeptId('IT & Infrastructure'),
        supervisorId: md.id,
        status: 'ACTIVE',
        joinDate: new Date('2023-08-20'),
        salary: 9000,
        currency: 'USD',
        salaryEnc: maybeEncrypt('9000')
      }
    });

    // 4. Create Staff
    const staffData = [
      { name: 'Alice Wong', title: 'Senior Accountant', dept: 'Finance & Accounts', supervisor: md.id, role: 'MANAGER' },
      { name: 'Bob Roberts', title: 'Operations Lead', dept: 'Operations', supervisor: md.id, role: 'MANAGER' },
      { name: 'Charlie Dean', title: 'Fullstack Developer', dept: 'IT & Infrastructure', supervisor: itManager.id, role: 'STAFF' },
      { name: 'Diana Prince', title: 'Social Media Strategist', dept: 'Sales & Marketing', supervisor: md.id, role: 'STAFF' },
    ];

    for (const [i, s] of staffData.entries()) {
      await prisma.user.create({
        data: {
          organizationId,
          fullName: s.name,
          email: `${s.name.split(' ')[0].toLowerCase()}@demo-${organizationId.slice(0, 4)}.com`,
          passwordHash: commonPass,
          role: s.role,
          jobTitle: s.title,
          employeeCode: `DEMO-10${i}`,
          departmentId: getDeptId(s.dept),
          supervisorId: s.supervisor,
          status: 'ACTIVE',
          joinDate: new Date('2024-01-10'),
          salary: 5000,
          currency: 'USD',
          salaryEnc: maybeEncrypt('5000')
        }
      });
    }

    // 5. Create Sample Announcements
    await prisma.announcement.create({
      data: {
        organizationId,
        title: 'Welcome to the New HR Portal',
        content: 'We are excited to launch Nexus HRM. Please update your profiles and review the employee handbook.',
        priority: 'HIGH',
        createdById: md.id,
        targetAudience: 'EVERYONE',
      }
    });

    await prisma.announcement.create({
      data: {
        organizationId,
        title: 'Quarterly Town Hall',
        content: 'Join us this Friday at 3:00 PM in the main conference room for our Q3 strategy update.',
        priority: 'MEDIUM',
        createdById: md.id,
        targetAudience: 'EVERYONE',
      }
    });

    await prisma.announcement.create({
      data: {
        organizationId,
        title: 'Planned IT Maintenance',
        content: 'The internal server will be down for maintenance this Sunday between 2:00 AM and 5:00 AM.',
        priority: 'LOW',
        createdById: itManager.id,
        targetAudience: 'EVERYONE',
      }
    });

    // 6. Create Initial Leave Context
    const staffUser = await prisma.user.findFirst({ where: { organizationId, role: 'STAFF' } });
    if (staffUser) {
        await prisma.leaveRequest.create({
            data: {
                organizationId,
                employeeId: staffUser.id,
                leaveType: 'Annual',
                startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                reason: 'Family Vacation',
                status: 'SUBMITTED',
                leaveDays: 5
            }
        });
    }

    console.log(`[DemoSeeder] Seed successfully completed for Org: ${organizationId}`);
    return { mdEmail: md.email, password: 'NexusDemo@2025' };
  }
}
