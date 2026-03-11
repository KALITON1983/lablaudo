import { createAppComponent } from '../server';

let app;
try {
    app = await createAppComponent();
} catch (err) {
    console.error("Failed to initialize Vercel application", err);
    // Re-throw to let Vercel handle the crash if necessary, 
    // but at least it's logged now.
    throw err;
}

export default app;
