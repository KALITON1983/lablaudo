import { createAppComponent } from '../server';

export default async (req: any, res: any) => {
    const app = await createAppComponent();
    return app(req, res);
};
