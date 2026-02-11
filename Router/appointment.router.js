
import { Router } from 'express';
import {
    createAppointment,
    getAppointments,
    updateAppointmentStatus,
    updateAppointment
} from '../controller/appointment.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const appointmentRouter = Router();

appointmentRouter.use(verifyToken);

appointmentRouter.post('/', createAppointment);
appointmentRouter.get('/doctor/:doctorId', getAppointments);
appointmentRouter.put('/:id/status', updateAppointmentStatus);
appointmentRouter.put('/:id', updateAppointment);

export default appointmentRouter;
