import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database.js';


export const signUp = async (req, res, next) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            phone,
            specialty
        } = req.body;

        // Validation des champs requis
        if (!firstName || !lastName || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs obligatoires doivent être remplis'
            });
        }

        // Validation du format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Format d\'email invalide'
            });
        }

        // Validation du mot de passe (min 8 caractères, 1 majuscule, 1 chiffre)
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre'
            });
        }

        // Vérifier si l'email existe déjà
        const [existingDoctors] = await pool.query(
            'SELECT id FROM doctors WHERE email = ?',
            [email]
        );

        if (existingDoctors.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cet email est déjà utilisé'
            });
        }

        // Hash du mot de passe
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Créer le médecin
        const [result] = await pool.query(
            `INSERT INTO doctors 
            (email, password, first_name, last_name, phone, specialty) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [email, passwordHash, firstName, lastName, phone, specialty]
        );

        const doctorId = result.insertId;

        // Générer un token JWT
        const token = jwt.sign(
            {
                doctorId: doctorId,
                email: email
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Compte créé avec succès',
            data: {
                doctorId: doctorId,
                email: email,
                firstName: firstName,
                lastName: lastName,
                specialty: specialty,
                token: token
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du compte',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


export const signIn = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validation des champs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        // Récupérer le médecin
        const [doctors] = await pool.query(
            `SELECT 
                id, 
                email, 
                password, 
                first_name, 
                last_name,
                phone,
                specialty,
                created_at
            FROM doctors
            WHERE email = ?`,
            [email]
        );

        if (doctors.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        const doctor = doctors[0];

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, doctor.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Générer un token JWT
        const token = jwt.sign(
            {
                doctorId: doctor.id,
                email: doctor.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Connexion réussie',
            data: {
                doctorId: doctor.id,
                email: doctor.email,
                firstName: doctor.first_name,
                lastName: doctor.last_name,
                phone: doctor.phone,
                specialty: doctor.specialty,
                createdAt: doctor.created_at,
                token: token
            }   
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la connexion',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


export const signOut = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Déconnexion réussie'
        });

    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la déconnexion',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


export const getCurrentDoctor = async (req, res, next) => {
    try {
        const doctorId = req.doctor.doctorId;

        const [doctors] = await pool.query(
            `SELECT 
                id, 
                email, 
                first_name, 
                last_name,
                phone,
                specialty,
                created_at,
                updated_at
            FROM doctors
            WHERE id = ?`,
            [doctorId]
        );

        if (doctors.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Médecin non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            data: doctors[0]
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du médecin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};