import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

/**
 * Seed data demo.
 *
 * Per `tempelan-1.txt` bagian 22: 1 admin, 2 owner, 5 tenant dengan data
 * fiktif. Properti/kamar/booking menyusul pada fase berikutnya.
 *
 * Semua akun memakai password yang sama agar mudah didemokan.
 */

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'KosDemo123!'

interface DemoUser {
  fullName: string
  email: string
  role: 'ADMIN' | 'OWNER' | 'TENANT'
  phone: string
}

const demoUsers: DemoUser[] = [
  { fullName: 'Admin KosPlatform', email: 'admin@kosplatform.test', role: 'ADMIN', phone: '081200000001' },
  { fullName: 'Hendra Wijaya', email: 'owner1@kosplatform.test', role: 'OWNER', phone: '081200000002' },
  { fullName: 'Sari Lestari', email: 'owner2@kosplatform.test', role: 'OWNER', phone: '081200000003' },
  { fullName: 'Budi Santoso', email: 'tenant1@kosplatform.test', role: 'TENANT', phone: '081200000004' },
  { fullName: 'Nadia Putri', email: 'tenant2@kosplatform.test', role: 'TENANT', phone: '081200000005' },
  { fullName: 'Rizky Ramadhan', email: 'tenant3@kosplatform.test', role: 'TENANT', phone: '081200000006' },
  { fullName: 'Dewi Anggraini', email: 'tenant4@kosplatform.test', role: 'TENANT', phone: '081200000007' },
  { fullName: 'Fajar Nugroho', email: 'tenant5@kosplatform.test', role: 'TENANT', phone: '081200000008' },
]

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  for (const demo of demoUsers) {
    const user = await prisma.users.upsert({
      where: { email: demo.email },
      update: {
        full_name: demo.fullName,
        role: demo.role,
        account_status: 'ACTIVE',
      },
      create: {
        full_name: demo.fullName,
        email: demo.email,
        phone_number: demo.phone,
        password_hash: passwordHash,
        role: demo.role,
        account_status: 'ACTIVE',
        email_verified_at: new Date(),
      },
      select: { id: true },
    })

    if (demo.role === 'OWNER') {
      await prisma.owner_profiles.upsert({
        where: { user_id: user.id },
        update: {},
        create: {
          user_id: user.id,
          business_name: `Kos ${demo.fullName.split(' ')[0]}`,
          description: 'Pemilik kos demo untuk pengembangan platform.',
        },
      })
    }

    if (demo.role === 'TENANT') {
      await prisma.tenant_profiles.upsert({
        where: { user_id: user.id },
        update: {},
        create: {
          user_id: user.id,
          occupation: 'Mahasiswa',
          institution_name: 'Universitas Demo',
          emergency_contact_name: 'Kontak Darurat ' + demo.fullName.split(' ')[0],
          emergency_contact_phone: '081299990000',
        },
      })
    }

    console.log(`  ok ${demo.email} (${demo.role})`)
  }

  console.log('')
  console.log(`Seed selesai. ${demoUsers.length} akun demo siap dipakai.`)
  console.log(`Password semua akun demo: ${DEMO_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('Seed gagal:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
