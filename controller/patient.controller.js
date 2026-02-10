import { pool } from "../database.js";

export const getAllPatient = async (req, res, next) => {
    try {
        const doctorId = req.params.id;
        const searchTerm = req.query.search || '';

        let query = "SELECT * FROM patients WHERE doctor_id = ?";
        let queryParams = [doctorId];

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
};

export const addPatient = async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, birthday, gender, doctorId } = req.body;

        if (!firstName || !lastName || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: 'Le prénom, nom, téléphone et email sont obligatoires'
            });
        }

        const phoneRegex = /^0[567]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Le numéro de téléphone doit contenir 10 chiffres et commencer par 05, 06 ou 07'
            });
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format d\'email invalide'
                });
            }
        }

        const [existingPatient] = await pool.query(
            `SELECT id FROM patients WHERE doctor_id = ? AND (email = ? OR phone = ?)`,
            [doctorId, email || null, phone]
        );

        if (existingPatient.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Un patient avec cet email ou ce téléphone existe déjà'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO patients 
             (doctor_id, first_name, last_name, email, phone, birth_date, gender, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [doctorId, firstName, lastName, email || null, phone, birthday || null, gender || 'M']
        );

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

export const updatePatient = async (req, res, next) => {
    try {
        const patientId = req.params.patientId;
        const { firstName, lastName, email, phone, birthday, gender, status } = req.body;

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

        const updates = [];
        const values = [];

        if (firstName) { updates.push('first_name = ?'); values.push(firstName); }
        if (lastName) { updates.push('last_name = ?'); values.push(lastName); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email || null); }
        if (phone) { updates.push('phone = ?'); values.push(phone); }
        if (birthday !== undefined) { updates.push('birth_date = ?'); values.push(birthday || null); }
        if (gender) { updates.push('gender = ?'); values.push(gender); }
        if (status) { updates.push('status = ?'); values.push(status); }

        if (phone) {
            const phoneRegex = /^0[567]\d{8}$/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Le numéro de téléphone doit contenir 10 chiffres et commencer par 05, 06 ou 07'
                });
            }
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