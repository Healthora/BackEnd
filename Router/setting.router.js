import { Router } from "express";
import { updateProfilSetting } from '../controller/setting.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const settingRouter = Router();

settingRouter.put('/handleSendProfilSetting', verifyToken, updateProfilSetting)


export default settingRouter;