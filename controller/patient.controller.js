import { pool } from "../database.js";

export const getAllPatient = async (req, res, next) => {
    try {
        const doctorId = req.params.id;
        
        // Récupérer le terme de recherche
        const searchTerm = req.query.search || '';
        
        let query = "SELECT * FROM patients WHERE doctor_id = ?";
        let queryParams = [doctorId];
        
        // Ajouter la recherche si un terme est fourni
        if (searchTerm) {
            query += ` AND (
                first_name LIKE ? OR 
                last_name LIKE ? OR 
                email LIKE ? OR 
                phone LIKE ?
            )`;
            const searchPattern = `%${searchTerm}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        
        const [patients] = await pool.query(query, queryParams);
        
        res.status(200).json({
            success: true,
            message: 'Patients récupérés avec succès',
            data: patients
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des patients',
        });
    }
}


export const addPatient = async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, birthday, gender, doctorId } = req.body;

        // Validation
        if (!firstName || !lastName || !phone || !doctorId) {
            return res.status(400).json({
                success: false,
                message: 'Le prénom, nom, téléphone et doctorId sont obligatoires'
            });
        }

        // Validate email format if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format d\'email invalide'
                });
            }
        }

        // Check if patient with same email or phone already exists for this doctor
        const [existingPatient] = await pool.query(
            `SELECT id FROM patients 
             WHERE doctor_id = ? AND (email = ? OR phone = ?)`,
            [doctorId, email || null, phone]
        );

        if (existingPatient.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Un patient avec cet email ou ce téléphone existe déjà'
            });
        }

        // Insert new patient
        const [result] = await pool.query(
            `INSERT INTO patients 
             (doctor_id, first_name, last_name, email, phone, birth_date, gender, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
                doctorId,
                firstName,
                lastName,
                email || null,
                phone,
                birthday || null,
                gender || 'M'
            ]
        );

        // Fetch the newly created patient
        const [newPatient] = await pool.query(
            'SELECT * FROM patients WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Patient ajouté avec succès',
            data: newPatient[0]
        });

    } catch (err) {
        console.error('Error adding patient:', err);
        
        // Handle duplicate entry errors
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Un patient avec ces informations existe déjà'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'ajout du patient',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const getPatientById = async (req, res, next) => {
    try {
        const patientId = req.params.patientId;

        const [patients] = await pool.query(
            `SELECT 
                p.*,
                (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id) as total_appointments,
                (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id AND status = 'completed') as completed_appointments,
                (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id AND status = 'cancelled') as cancelled_appointments,
                (SELECT MAX(appointment_date) FROM appointments WHERE patient_id = p.id AND status = 'completed') as last_visit,
                (SELECT MIN(appointment_date) FROM appointments WHERE patient_id = p.id AND status IN ('pending', 'confirmed') AND appointment_date >= CURDATE()) as next_visit
            FROM patients p
            WHERE p.id = ?`,
            [patientId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            data: patients[0]
        });

    } catch (err) {
        console.error('Error fetching patient:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du patient'
        });
    }
};


export const updatePatient = async (req, res, next) => {
    try {
        const patientId = req.params.patientId;
        const { firstName, lastName, email, phone, birthday, gender, status } = req.body;

        // Check if patient exists
        const [existingPatient] = await pool.query(
            'SELECT id FROM patients WHERE id = ?',
            [patientId]
        );

        if (existingPatient.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (firstName) {
            updates.push('first_name = ?');
            values.push(firstName);
        }
        if (lastName) {
            updates.push('last_name = ?');
            values.push(lastName);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            values.push(email || null);
        }
        if (phone) {
            updates.push('phone = ?');
            values.push(phone);
        }
        if (birthday !== undefined) {
            updates.push('birth_date = ?');
            values.push(birthday || null);
        }
        if (gender) {
            updates.push('gender = ?');
            values.push(gender);
        }
        if (status) {
            updates.push('status = ?');
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée à mettre à jour'
            });
        }

        values.push(patientId);

        await pool.query(
            `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Fetch updated patient
        const [updatedPatient] = await pool.query(
            'SELECT * FROM patients WHERE id = ?',
            [patientId]
        );

        res.status(200).json({
            success: true,
            message: 'Patient mis à jour avec succès',
            data: updatedPatient[0]
        });

    } catch (err) {
        console.error('Error updating patient:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du patient',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};


export const deletePatient = async (req, res, next) => {
    try {
        const patientId = req.params.patientId;

        // Check if patient has appointments
        const [appointments] = await pool.query(
            'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?',
            [patientId]
        );

        if (appointments[0].count > 0) {
            // Soft delete - change status to inactive instead of deleting
            await pool.query(
                'UPDATE patients SET status = ? WHERE id = ?',
                ['inactive', patientId]
            );

            return res.status(200).json({
                success: true,
                message: 'Patient marqué comme inactif (a des rendez-vous existants)'
            });
        }

        // Hard delete if no appointments
        const [result] = await pool.query(
            'DELETE FROM patients WHERE id = ?',
            [patientId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Patient supprimé avec succès'
        });

    } catch (err) {
        console.error('Error deleting patient:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du patient'
        });
    }
};

export const getPatientStats = async (req, res, next) => {
    try {
        const doctorId = req.params.doctorId;

        const [stats] = await pool.query(
            `SELECT 
                COUNT(*) as total_patients,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_patients,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_patients,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_patients_last_month,
                COUNT(CASE WHEN gender = 'M' THEN 1 END) as male_patients,
                COUNT(CASE WHEN gender = 'F' THEN 1 END) as female_patients
            FROM patients 
            WHERE doctor_id = ?`,
            [doctorId]
        );

        res.status(200).json({
            success: true,
            data: stats[0]
        });

    } catch (err) {
        console.error('Error fetching patient stats:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques'
        });
    }
};