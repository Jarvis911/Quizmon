import prisma from './src/prismaClient.js';
import { Request, Response, NextFunction } from 'express';
import orgMiddleware from './src/middleware/orgMiddleware.js';

async function testSelfHealing() {
    console.log('--- Testing orgMiddleware Self-Healing ---');

    // 1. Create a user with NO organization
    const email = `no_org_${Date.now()}@test.com`;
    const user = await prisma.user.create({
        data: {
            email,
            username: 'NoOrgUser'
        }
    });
    console.log(`Created test user: ${user.username} (ID: ${user.id})`);

    // 2. Mock Request and Response
    const req = {
        userId: user.id,
        headers: {},
        organizationId: undefined
    } as any;

    const res = {
        status: function(code: number) {
            console.log(`Response status set to: ${code}`);
            return this;
        },
        json: function(data: any) {
            console.log('Response JSON:', data);
            return this;
        }
    } as any;

    const next = () => {
        console.log('Next() called.');
    };

    // 3. Run Middleware
    console.log('Running orgMiddleware...');
    await orgMiddleware(req, res, next);

    // 4. Verify organizationId is set
    console.log('Resulting req.organizationId:', req.organizationId);

    if (req.organizationId) {
        console.log('SUCCESS: Organization was automatically created and assigned.');
        
        // Check database to confirm
        const membership = await prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId: req.organizationId,
                    userId: user.id
                }
            },
            include: { organization: true }
        });
        
        if (membership) {
            console.log(`Verified in DB: User is OWNER of "${membership.organization.name}"`);
        } else {
            console.error('FAILED: Membership not found in database.');
        }
    } else {
        console.error('FAILED: organizationId not set on request.');
    }

    // Cleanup (optional, but good practice)
    // await prisma.user.delete({ where: { id: user.id } });
}

testSelfHealing()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
