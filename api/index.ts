import { createAppComponent } from '../server';

let appPromise: any = null;

export default async function handler(req: any, res: any) {
    try {
        if (!appPromise) {
            appPromise = createAppComponent();
        }
        const app = await appPromise;
        return app(req, res);
    } catch (err: any) {
        console.error("Vercel Boot Error:", err);
        res.status(500).json({
            success: false,
            message: "Erro na inicialização do servidor Vercel",
            error: err.message
        });
    }
}
