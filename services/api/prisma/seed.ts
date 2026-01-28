import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create dummy doctor
  const doctorPassword = await bcrypt.hash('doctor123', 10);
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@test.com' },
    update: {},
    create: {
      email: 'doctor@test.com',
      phone: '9876543210',
      password: doctorPassword,
      firstName: 'Dr. Priya',
      lastName: 'Sharma',
      role: UserRole.DOCTOR,
      isVerified: true,
      isActive: true,
      doctorProfile: {
        create: {
          specialization: 'Obstetrics & Gynecology',
          licenseNumber: 'MCI-123456',
          yearsOfExperience: 10,
          rating: 4.8,
          totalReviews: 120,
          bio: 'Experienced OB/GYN specialist with expertise in maternal healthcare and high-risk pregnancies.',
          hospitalAffiliation: 'Apollo Hospital',
          consultationFee: 500,
          isAvailable: true,
          availableHours: {
            monday: ['09:00-13:00', '14:00-18:00'],
            tuesday: ['09:00-13:00', '14:00-18:00'],
            wednesday: ['09:00-13:00', '14:00-18:00'],
            thursday: ['09:00-13:00', '14:00-18:00'],
            friday: ['09:00-13:00', '14:00-17:00'],
            saturday: ['10:00-14:00'],
            sunday: [],
          },
        },
      },
    },
  });
  console.log('Created doctor:', doctor.email);

  // Create dummy mother/patient
  const motherPassword = await bcrypt.hash('mother123', 10);
  const mother = await prisma.user.upsert({
    where: { email: 'mother@test.com' },
    update: {},
    create: {
      email: 'mother@test.com',
      phone: '9123456789',
      password: motherPassword,
      firstName: 'Anita',
      lastName: 'Patel',
      role: UserRole.PATIENT,
      isVerified: true,
      isActive: true,
      patientProfile: {
        create: {
          dateOfBirth: new Date('1995-05-15'),
          bloodGroup: 'O+',
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          pregnancyWeek: 24,
          allergies: ['Penicillin'],
          currentMedications: ['Prenatal vitamins', 'Iron supplements'],
          address: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          latitude: 19.076,
          longitude: 72.8777,
        },
      },
    },
  });
  console.log('Created mother:', mother.email);

  // Create a VIDEO appointment for TODAY (doctor dashboard shows this)
  const today = new Date();
  today.setHours(14, 0, 0, 0); // 2:00 PM today

  const todayAppointment = await prisma.appointment.upsert({
    where: { id: 'test-appointment-today' },
    update: {
      scheduledAt: today,
    },
    create: {
      id: 'test-appointment-today',
      patientId: mother.id,
      doctorId: doctor.id,
      scheduledAt: today,
      duration: 30,
      status: 'SCHEDULED',
      type: 'VIDEO',
      reason: 'Regular prenatal checkup',
    },
  });
  console.log('Created today appointment:', todayAppointment.id);

  // Create another VIDEO appointment for TOMORROW
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowAppointment = await prisma.appointment.upsert({
    where: { id: 'test-appointment-tomorrow' },
    update: {},
    create: {
      id: 'test-appointment-tomorrow',
      patientId: mother.id,
      doctorId: doctor.id,
      scheduledAt: tomorrow,
      duration: 30,
      status: 'SCHEDULED',
      type: 'VIDEO',
      reason: 'Follow-up consultation',
    },
  });
  console.log('Created tomorrow appointment:', tomorrowAppointment.id);

  console.log('\n✅ Seed completed!');
  console.log('\n📋 Test Accounts:');
  console.log('─────────────────────────────────────');
  console.log('DOCTOR:');
  console.log('  Email: doctor@test.com');
  console.log('  Password: doctor123');
  console.log('─────────────────────────────────────');
  console.log('MOTHER/PATIENT:');
  console.log('  Email: mother@test.com');
  console.log('  Password: mother123');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
