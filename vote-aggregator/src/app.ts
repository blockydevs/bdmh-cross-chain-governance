import 'dotenv/config';
import express from 'express';
import {createClient} from "redis";

const app = express();
const port = process.env.NODE_PORT;

const redis = require('redis');

const client = createClient({
    socket: {
        port: process.env.REDIS_PORT as unknown as number,
        host: process.env.REDIS_HOST,
    }
});

client.on('error', err => console.log('Redis Client Error', err));

(async () => {
    await client.connect();

    await client.set('test_key', 'blockydevs rulez', redis.print);
    const value = await client.get('test_key');
    console.log(value)
})();

app.get('/', (req, res) => {

    res.send('READY');
});

app.listen(port, () => {
    return console.log(`Express is listening on port ${port}`);
});
