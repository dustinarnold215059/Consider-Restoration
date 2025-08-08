const { sequelize, User, Service, Appointment, Payment, GiftCertificate, Waitlist, BlockedDate, EmailTemplate, Analytics } = require('../models');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    try {
        console.log('🔄 Setting up database...');

        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Sync all models
        await sequelize.sync({ force: true }); // Use force: true only for initial setup
        console.log('✅ Database tables created');

        // Create default admin user
        const adminPassword = await bcrypt.hash('admin123', 12);
        const admin = await User.create({
            name: 'Christopher Rembisz',
            email: 'admin@considerrestoration.com',
            phone: '(734) 419-4116',
            password: 'admin123', // Will be hashed by the model hook
            role: 'admin',
            emailVerified: true,
            isActive: true
        });
        console.log('✅ Admin user created');

        // Create demo users
        const demoUsers = [
            {
                name: 'John Doe',
                email: 'john.doe@email.com',
                phone: '(555) 234-5678',
                password: 'user123',
                role: 'user',
                emailVerified: true,
                membershipType: 'wellness',
                membershipStatus: 'active',
                membershipStartDate: new Date(),
                membershipSessionsRemaining: 1,
                preferences: 'Prefers deep tissue massage, focus on shoulders and neck',
                totalVisits: 12,
                lastVisit: new Date('2024-01-10')
            },
            {
                name: 'Jane Smith',
                email: 'jane.smith@email.com',
                phone: '(555) 345-6789',
                password: 'user123',
                role: 'user',
                emailVerified: true,
                membershipType: 'restoration-plus',
                membershipStatus: 'active',
                membershipStartDate: new Date(),
                membershipSessionsRemaining: 2,
                preferences: 'Likes relaxing Swedish massage, sensitive to pressure',
                totalVisits: 8,
                lastVisit: new Date('2024-01-08')
            },
            {
                name: 'Dustin',
                email: 'dustin@email.com',
                phone: '(555) 456-7890',
                password: 'user123',
                role: 'user',
                emailVerified: true,
                membershipType: 'therapeutic-elite',
                membershipStatus: 'active',
                membershipStartDate: new Date(),
                membershipSessionsRemaining: 3,
                preferences: 'Prefers deep tissue massage, athletic recovery focus',
                totalVisits: 5,
                lastVisit: new Date('2024-01-12')
            }
        ];

        const createdUsers = await User.bulkCreate(demoUsers);
        console.log('✅ Demo users created');

        // Create services
        const services = [
            {
                name: 'Mindful Start',
                slug: 'mindful-start',
                description: 'Personalized bodywork session combining massage techniques tailored to your specific needs. Perfect for first-time clients or those seeking a customized approach to wellness.',
                shortDescription: 'Customized approach combining massage techniques tailored to your specific needs',
                basePrice: 70.00,
                priceRange: 'Starting at $70',
                duration: 60,
                category: 'massage',
                benefits: [
                    'Personalized treatment approach',
                    'Stress relief and relaxation',
                    'Improved circulation',
                    'Muscle tension relief'
                ],
                techniques: ['Swedish massage', 'Light pressure techniques', 'Relaxation methods'],
                targetAudience: ['First-time clients', 'Stress relief seekers', 'General wellness'],
                membershipDiscount: {
                    'wellness': 15,
                    'restoration-plus': 20,
                    'therapeutic-elite': 25
                }
            },
            {
                name: 'Integrated Massage',
                slug: 'integrated-massage',
                description: 'Comprehensive bodywork addressing multiple concerns with various modalities. This session combines different massage techniques to provide maximum therapeutic benefit.',
                shortDescription: 'Comprehensive bodywork addressing multiple concerns with various modalities',
                basePrice: 100.00,
                priceRange: '$100+',
                duration: 75,
                category: 'massage',
                benefits: [
                    'Multiple technique integration',
                    'Deep muscle tension relief',
                    'Enhanced flexibility',
                    'Comprehensive wellness approach'
                ],
                techniques: ['Swedish massage', 'Deep tissue', 'Trigger point therapy', 'Myofascial release'],
                targetAudience: ['Regular clients', 'Multiple concern areas', 'Comprehensive wellness'],
                membershipDiscount: {
                    'wellness': 15,
                    'restoration-plus': 20,
                    'therapeutic-elite': 25
                }
            },
            {
                name: 'Thai-Stretch Fusion',
                slug: 'thai-stretch-fusion',
                description: 'Dynamic stretching combined with massage for improved mobility and flexibility. This unique approach combines traditional Thai massage techniques with targeted stretching.',
                shortDescription: 'Dynamic stretching combined with massage for improved mobility and flexibility',
                basePrice: 120.00,
                priceRange: '$120+',
                duration: 90,
                category: 'bodywork',
                benefits: [
                    'Improved flexibility and range of motion',
                    'Enhanced athletic performance',
                    'Stress relief through movement',
                    'Better posture and alignment'
                ],
                techniques: ['Thai massage', 'Assisted stretching', 'Joint mobilization', 'Energy line work'],
                targetAudience: ['Athletes', 'Flexibility improvement', 'Movement enthusiasts'],
                membershipDiscount: {
                    'wellness': 15,
                    'restoration-plus': 20,
                    'therapeutic-elite': 25
                }
            },
            {
                name: 'Applied Neurology Consultation',
                slug: 'applied-neurology',
                description: 'Specialized assessment and treatment using neurology-based techniques. This advanced approach addresses pain and dysfunction at the neurological level.',
                shortDescription: 'Specialized assessment and treatment using neurology-based techniques',
                basePrice: 150.00,
                priceRange: '$150+',
                duration: 90,
                category: 'consultation',
                benefits: [
                    'Neurological assessment and treatment',
                    'Advanced pain management',
                    'Functional movement improvement',
                    'Root cause analysis'
                ],
                techniques: ['Neurological testing', 'Applied kinesiology', 'Functional neurology', 'Corrective exercise'],
                targetAudience: ['Chronic pain sufferers', 'Complex conditions', 'Neurological concerns'],
                contraindications: ['Recent neurological injury', 'Uncontrolled seizures'],
                membershipDiscount: {
                    'wellness': 15,
                    'restoration-plus': 20,
                    'therapeutic-elite': 25
                }
            },
            {
                name: 'Prenatal Massage',
                slug: 'prenatal',
                description: 'Safe, gentle massage therapy specifically designed for expecting mothers. Specialized techniques and positioning ensure comfort and safety throughout pregnancy.',
                shortDescription: 'Safe, gentle massage therapy specifically designed for expecting mothers',
                basePrice: 90.00,
                priceRange: '$90',
                duration: 60,
                category: 'specialty',
                benefits: [
                    'Pregnancy-related discomfort relief',
                    'Reduced swelling',
                    'Better sleep quality',
                    'Stress and anxiety reduction'
                ],
                techniques: ['Prenatal positioning', 'Gentle Swedish massage', 'Lymphatic drainage'],
                targetAudience: ['Pregnant women (2nd & 3rd trimester)'],
                contraindications: ['First trimester', 'High-risk pregnancy', 'Certain medical conditions'],
                specialRequests: 'Please inform us of your due date and any pregnancy-related concerns',
                membershipDiscount: {
                    'wellness': 15,
                    'restoration-plus': 20,
                    'therapeutic-elite': 25
                }
            },
            {
                name: 'Applied Neurology Training',
                slug: 'neurology-training',
                description: 'Comprehensive training and education in applied neurology techniques for healthcare professionals and advanced clients.',
                shortDescription: 'Comprehensive training and education in applied neurology techniques',
                basePrice: 330.00,
                priceRange: 'Up to $330',
                duration: 180,
                category: 'training',
                benefits: [
                    'Professional education',
                    'Advanced technique training',
                    'Continuing education credits',
                    'Hands-on learning'
                ],
                techniques: ['Educational instruction', 'Hands-on practice', 'Case study review'],
                targetAudience: ['Healthcare professionals', 'Advanced practitioners', 'Continuing education seekers'],
                bookingEnabled: false, // Requires consultation first
                membershipDiscount: {
                    'wellness': 10,
                    'restoration-plus': 15,
                    'therapeutic-elite': 20
                }
            }
        ];

        const createdServices = await Service.bulkCreate(services);
        console.log('✅ Services created');

        // Create sample appointments
        const sampleAppointments = [
            {
                userId: createdUsers[0].id,
                serviceId: createdServices[0].id,
                appointmentDate: new Date('2024-08-10'),
                startTime: '10:00',
                endTime: '11:00',
                duration: 60,
                status: 'confirmed',
                price: 70.00,
                clientName: createdUsers[0].name,
                clientEmail: createdUsers[0].email,
                clientPhone: createdUsers[0].phone,
                notes: 'First time client, prefers light pressure'
            },
            {
                userId: createdUsers[1].id,
                serviceId: createdServices[1].id,
                appointmentDate: new Date('2024-08-12'),
                startTime: '14:00',
                endTime: '15:15',
                duration: 75,
                status: 'confirmed',
                price: 80.00, // Member discount applied
                clientName: createdUsers[1].name,
                clientEmail: createdUsers[1].email,
                clientPhone: createdUsers[1].phone,
                notes: 'Focus on neck and shoulders'
            },
            {
                userId: createdUsers[2].id,
                serviceId: createdServices[2].id,
                appointmentDate: new Date('2024-08-15'),
                startTime: '09:00',
                endTime: '10:30',
                duration: 90,
                status: 'pending',
                price: 90.00, // Elite member discount applied
                clientName: createdUsers[2].name,
                clientEmail: createdUsers[2].email,
                clientPhone: createdUsers[2].phone,
                notes: 'Pre-workout preparation'
            }
        ];

        const createdAppointments = await Appointment.bulkCreate(sampleAppointments);
        console.log('✅ Sample appointments created');

        // Create email templates
        const emailTemplates = [
            {
                name: 'appointment_confirmation',
                subject: 'Appointment Confirmed - Consider Restoration',
                template: 'appointmentConfirmation',
                isActive: true
            },
            {
                name: 'appointment_reminder',
                subject: 'Appointment Reminder - Tomorrow at {{appointmentTime}}',
                template: 'appointmentReminder',
                isActive: true
            },
            {
                name: 'gift_certificate',
                subject: 'Your Gift Certificate from Consider Restoration',
                template: 'giftCertificate',
                isActive: true
            },
            {
                name: 'welcome',
                subject: 'Welcome to Consider Restoration!',
                template: 'welcome',
                isActive: true
            }
        ];

        await EmailTemplate.bulkCreate(emailTemplates);
        console.log('✅ Email templates created');

        // Create blocked dates (example)
        const blockedDates = [
            {
                blockDate: new Date('2024-08-25'),
                reason: 'Vacation',
                type: 'vacation',
                isAllDay: true
            },
            {
                blockDate: new Date('2024-09-02'),
                reason: 'Labor Day',
                type: 'holiday',
                isAllDay: true
            }
        ];

        await BlockedDate.bulkCreate(blockedDates);
        console.log('✅ Blocked dates created');

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Setup Summary:');
        console.log(`   • Admin user: admin@considerrestoration.com / admin123`);
        console.log(`   • Demo users: 3 users with different membership levels`);
        console.log(`   • Services: 6 massage and bodywork services`);
        console.log(`   • Sample appointments: 3 upcoming appointments`);
        console.log(`   • Email templates: 4 notification templates`);
        console.log(`   • Blocked dates: 2 example blocked dates`);
        console.log('\n✅ Ready for production use!');

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    }
}

// Additional setup functions
async function createAdditionalData() {
    try {
        // Create sample gift certificates
        const giftCertificates = [
            {
                purchasedBy: (await User.findOne({ where: { email: 'john.doe@email.com' } })).id,
                recipientName: 'Sarah Johnson',
                recipientEmail: 'sarah.johnson@example.com',
                amount: 100.00,
                message: 'Hope you enjoy this relaxing massage! Happy Birthday!',
                occasion: 'Birthday'
            }
        ];

        await GiftCertificate.bulkCreate(giftCertificates);
        console.log('✅ Sample gift certificates created');

        // Create sample waitlist entries
        const waitlistEntries = [
            {
                userId: (await User.findOne({ where: { email: 'jane.smith@email.com' } })).id,
                serviceId: (await Service.findOne({ where: { slug: 'applied-neurology' } })).id,
                preferredDate: new Date('2024-08-20'),
                preferredTimeStart: '14:00',
                preferredTimeEnd: '16:00',
                clientName: 'Jane Smith',
                clientEmail: 'jane.smith@email.com',
                clientPhone: '(555) 345-6789',
                membershipType: 'restoration-plus',
                notes: 'Flexible with dates, just need the neurology consultation'
            }
        ];

        await Waitlist.bulkCreate(waitlistEntries);
        console.log('✅ Sample waitlist entries created');

    } catch (error) {
        console.error('❌ Additional data creation failed:', error);
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase()
        .then(() => createAdditionalData())
        .then(() => {
            console.log('\n🎯 Full database setup completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupDatabase, createAdditionalData };