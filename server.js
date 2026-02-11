import express from 'express';
import cors from 'cors';
import authRouter from './Router/auth.router.js'
import settingRouter from './Router/setting.router.js';
import patientRoute from './Router/patient.router.js';
import appointmentRouter from './Router/appointment.router.js';
const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);
app.use('/setting', settingRouter);
app.use('/patient', patientRoute);
app.use('/appointments', appointmentRouter);


app.get('/', (req, res) => {
    res.send("server is running");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});