export const config = {
    port: process.env.PORT || 3001,
    database: {
        url: process.env.DATABASE_URL!,
    },
    jwt: {
        secret: process.env.JWT_SECRET!,
        expiresIn: '7d',
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    },
} as const;