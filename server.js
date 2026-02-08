import express from 'express';
import cors from 'cors';
import authRouter from './Router/auth.router.js'
const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);

app.get('/', (req, res) => {
    res.send("server is running");
});


app.listen(3000, (req, res) => {
    console.log("Server is running on port http://localhost:3000");
});