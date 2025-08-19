import User from "../models/user.js";
import bcrrypt from "bcrypt"
import jwt from 'jsonwebtoken'

export function createUser(req, res){

const hashpassword = bcrrypt.hashSync(req.body.password, 10)

    const user = new User(
        {
            email: req.body.email,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            password: hashpassword
        }
    )

    user.save().then(
        ()=>{
            res.json({
                message: "User created successfully"
            })
        }
    ).catch(
        ()=>{
            res.json({
                message: "failed to create user"
            })
        }
    )
}

export function loginUser(req, res){

    User.findOne(
        {
            email : req.body.email
        }
    ).then(
        (user)=>{
            if(user == null){
                res.status(404).json(
                    {
                        message : "User not found!!!"
                    }
                )
            }else{
                const isPasswordMatching = bcrrypt.compareSync(req.body.password, user.password)
                if(isPasswordMatching){

                    const token = jwt.sign(
                        {
                            email: user.email,
                            firstname: user.firstname,
                            lastname: user.lastname,
                            role: user.role,
                            isEmailVarified: user.isEmailVarified
                        },
                        process.env.JWT_SECRET
                    )

                    res.json(
                        {
                            message: "Login successfull",
                            token: token,
                            user: {
                                email: user.email,
                                firstname: user.firstname,
                                lastname: user.lastname,
                                role: user.role,
                                isEmailVerified: user.isEmailVarified
                            }
                        }
                    )
                }else{
                    res.status(401).json(
                        {
                            message: "Invalid password"
                        }
                    )
                }
            }
        }
    )
}

export function isAdmin(req){
    if(req.user == null){
        return false;
    }
    if(req.user.role != "admin"){
        return false;
    }

    return true;
}

export function isCustomer(req){
    if(req.user == null){
        return false;
    }
    if(req.user.role != "user"){
        return false;
    }

    return true;
}