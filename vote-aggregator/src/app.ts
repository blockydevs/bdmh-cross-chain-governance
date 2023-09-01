import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import proposalRoutes from './routes/proposalRoutes';

const app = express();
const port = process.env.NODE_PORT || 8080;

app.use(cors());

app.use(proposalRoutes);

app.listen(port, () => {
    console.log(`Application is listening on port ${port}`);
});
