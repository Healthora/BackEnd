import { pool } from '../database.js';

export const createAppointment = async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            cabinet_id,
            appointment_date,
            appointment_time,
            visit_type,
            notes
        } = req.body;

        if (!patient_id || !doctor_id || !cabinet_id || !appointment_date || !visit_type) {
            return res.status(400).json({
                success: false,
                message: 'Veuillez remplir tous les champs obligatoires'
            });
        }

        const status = 'nouveau';
        const validStatuses = ['nouveau', 'confirme', 'ne_repond_pas', 'reprogramme', 'absent', 'suivi', 'termine'];

        const reqStatus = req.body.status;
        const finalStatus = (reqStatus && validStatuses.includes(reqStatus)) ? reqStatus : 'nouveau';

        let finalNotes = notes || '';
        if (appointment_time) {
            finalNotes = `[Time: ${appointment_time}] ${finalNotes}`;
        }

        const [result] = await pool.query(
            `INSERT INTO appointments 
            (doctor_id, patient_id, cabinet_id, appointment_date, status, visit_type, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [doctor_id, patient_id, cabinet_id, appointment_date, finalStatus, visit_type, finalNotes]
        );

        res.status(201).json({
            success: true,
            message: 'Rendez-vous créé avec succès',
            data: {
                id: result.insertId,
                ...req.body,
                status: finalStatus,
                notes: finalNotes
            }
        });

    } catch (error) {
        console.error('Erreur lors de la création du rendez-vous:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du rendez-vous',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const getAppointments = async (req, res) => {
    try {
        const { doctorId } = req.params;

        if (!doctorId) {
            return res.status(400).json({
                success: false,
                message: 'Doctor ID is required'
            });
        }

        const [appointments] = await pool.query(
            `SELECT 
                a.*,
                p.first_name as patient_first_name,
                p.last_name as patient_last_name,
                p.phone as patient_phone,
                p.email as patient_email,
                p.gender as patient_gender
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ?
            ORDER BY a.appointment_date DESC, a.created_at DESC`,
            [doctorId]
        );

        // Helper to extract time from notes if I put it there
        const processedAppointments = appointments.map(app => {
            let time = '00:00';
            // Simple regex to extract [Time: HH:MM] from notes
            const timeMatch = app.notes ? app.notes.match(/\[Time: (\d{1,2}:\d{2})\]/) : null;
            if (timeMatch) {
                time = timeMatch[1];
            }
            return {
                ...app,
                time // Add time field for frontend
            };
        });

        res.status(200).json({
            success: true,
            data: processedAppointments
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des rendez-vous:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des rendez-vous',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [result] = await pool.query(
            'UPDATE appointments SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rendez-vous non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Statut mis à jour avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour',
            error: error.message
        });
    }
};

export const updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            appointment_date,
            visit_type,
            status,
            notes
        } = req.body;

        // Check if appointment exists
        const [existing] = await pool.query('SELECT * FROM appointments WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rendez-vous non trouvé'
            });
        }

        const updates = [];
        const values = [];

        if (appointment_date) {
            updates.push('appointment_date = ?');
            values.push(appointment_date);
        }
        if (visit_type) {
            updates.push('visit_type = ?');
            values.push(visit_type);
        }
        if (status) {
            updates.push('status = ?');
            values.push(status);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée à mettre à jour'
            });
        }

        values.push(id);

        await pool.query(
            `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.status(200).json({
            success: true,
            message: 'Rendez-vous mis à jour avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du rendez-vous:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour',
            error: error.message
        });
    }
};

