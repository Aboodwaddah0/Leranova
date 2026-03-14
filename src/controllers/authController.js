import {
  registerOrganization,
  loginOrganization,
  loginUser,
} from '../services/authService.js';

 export const register = async (req, res) => {
  try {
    const result = await registerOrganization(req.body);

    return res.status(201).json({
      message: 'Organization registered successfully and is pending approval',
      data: result,
    });
  } catch (error) {
   return res.status(500).json({message:"Server Error"})
  }
};

  export const login = async (req, res) => {
  try {
    const result = await loginOrganization(req.body);

    return res.status(200).json({
      message: 'Organization logged in successfully',
      data: result,
    });
  } catch (error) {
   return res.status(500).json({message:"Server Error"})
  }
};

export const loginUserController=async (req,res)=>{
  try{
     const result = await loginUser(req.body);
      return res.status(200).json({
      message: 'User logged in successfully',
      data: result,
    });
  }catch (error){
      return res.status(500).json({message:"Server Error"})
  }
}





