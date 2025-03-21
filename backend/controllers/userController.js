import {User} from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
    try {
        const {fullName, username, password, confirmPassword, gender} = req.body;
        console.log(req.body);

        if(!fullName || !username || !password || !confirmPassword || !gender) {
            return res.status(400).json({message: "Please fill in all fields."});
        }

        if(password !== confirmPassword){
            return res.status(400).json({message: "Passwords do not match."});
        }

        const user = await User.findOne({username})
        if(user){
            return res.status(400).json({message: "Username already exists."});
        }

        const hashPassword = await bcrypt.hash(password, 10);

        //profilePhoto 
        const maleProfilePhoto = `https://avatar.iran.liara.run/public/boy?username=${username}`;
        const femaleProfilePhoto = `https://avatar.iran.liara.run/public/girl?username=${username}`;
        await User.create({
            fullName,
            username,
            password : hashPassword,
            gender,
            profilePhoto : (gender == 'male') ? maleProfilePhoto : femaleProfilePhoto,
        })

        // console.log(data);
        return res.status(200).json({
            message: "Account created successfully",
            success: true
        })

    }catch(err) {
        console.error(err);
    }
};

export const login = async (req, res) => {
    try{
        const {username, password} = req.body;
        if(!username || !password){
            return res.status(400).json({message: "Please fill in all fields."});
        }

        const user = await User.findOne({username});
        if(!user){
            return res.status(400).json({message: "Invalid username or password.", success: false});
        }
        
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if(!isPasswordMatch){
            return res.status(400).json({message: "Invalid password.", success: false});
        }

        const tokenData = {
            userId: user.id,
        }
        const token = jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {expiresIn: '1d'});

        return res.status(200)
            .cookie('token', token, {
                maxAge: 24 * 60 * 60 * 1000, // 1 day
                httpOnly: true,
                sameSite: 'lax',  // Changed from 'strict' to 'lax'
                secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
                path: '/'  // Ensure cookie is available for all paths
            })
            .json({
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                profilePhoto: user.profilePhoto
            });

    }catch(err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const logout = (req, res) => {
    try {
        res.status(200).cookie('token', "", {maxAge: 0}).json({
            message : "You have been logged out"
        })
    }catch(err){
        console.log(err);
    }
}

export const getOtherUsers = async (req, res) => {    
    try {
        const loggedInUserId = req.id;
        const otherUsers = await User.find({_id: {$ne: loggedInUserId}}).select("-password");
        return res.status(200).json(otherUsers);
    }catch(err){
        console.log(err);
    }
}

export const getAuthStatus = async (req, res) => {
    try {
        const user = await User.findById(req.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        return res.status(200).json({
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            profilePhoto: user.profilePhoto
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
