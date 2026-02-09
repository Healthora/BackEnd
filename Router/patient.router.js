import { Router } from "express";
import { 
    getAllPatient, 
    addPatient, 
    getPatientById, 
    updatePatient, 
    deletePatient,
    getPatientStats 
} from "../controller/patient.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const patientRoute = Router();

patientRoute.use(verifyToken);

patientRoute.get('/:id', getAllPatient);                    
patientRoute.get('/details/:patientId', getPatientById);    
patientRoute.get('/stats/:doctorId', getPatientStats);      

patientRoute.post('/add', addPatient);                      

patientRoute.put('/:patientId', updatePatient);             

patientRoute.delete('/:patientId', deletePatient);          

export default patientRoute;