import { FastifyInstance } from "fastify";
import fastifyCron from "fastify-cron";

// Services
import { processMaturedInvestments } from './../modules/investment/investment.services';


export const investmentCronJob = async (app: FastifyInstance) => {
    await app.register(fastifyCron, {
        jobs: [
            {
                name: "apply-savings-interest",
                cronTime: "*/10 * * * *", // Every 10 minutes
                onTick: async () => {
                    app.log.info(
                        "Running 10 minutes investment maturity processing job..."
                    );
                    try {
                        await processMaturedInvestments();
                        app.log.info("Investment maturity processing completed.");
                    } catch (err) {
                        console.error("Investment maturity processing job failed:", err);
                    }
                },
                startWhenReady: true,
            },
        ],
    });
};
