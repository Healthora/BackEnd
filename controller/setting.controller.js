import { pool } from '../database.js';


export const updateProfilSetting = async (req, res, next) => {
    try {
        const { email, firstName, lastName, phone, specialty } = req.body;
        const doctorId = req.doctor.doctorId; 

        if(!email|| !firstName|| !lastName|| !phone|| !specialty) {
            return res.status(404).json({
                success: false,
                message: 'Veuillez remplir tous les champs obligatoires'
            })
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)) {
            return res.status(404).json({
                success: false,
                message: 'email invalide'
            });
        }

        if(phone.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'numero invalid'
            })
        }

        const [existingUser] = await pool.query(
            'SELECT id FROM doctors WHERE email = ? AND id != ?',
            [email, doctorId]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email déjà utilisé par un autre médecin'
            });
        }
        
        const [result] = await pool.query(`
            UPDATE doctors
            SET email = ?,
            first_name = ?,
            last_name = ?,
            phone = ?,
            specialty = ?
            WHERE id = ?
        `, [email, firstName, lastName, phone, specialty, doctorId]);

        if (result.affectedRows > 0) {
            const [updatedUser] = await pool.query(
                'SELECT id, email, first_name, last_name, phone, specialty FROM doctors WHERE id = ?',
                [doctorId]
            );

            res.status(200).json({
                success: true,
                message: 'Profil mis à jour avec succès',
                data: {
                    doctorId: updatedUser[0].id,
                    email: updatedUser[0].email,
                    firstName: updatedUser[0].first_name,
                    lastName: updatedUser[0].last_name,
                    phone: updatedUser[0].phone,
                    specialty: updatedUser[0].specialty
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Médecin non trouvé ou aucune modification effectuée'
            });
        }
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour des informations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}