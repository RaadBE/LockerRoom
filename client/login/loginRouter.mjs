import express from 'express';
import dotenv from 'dotenv';
dotenv.config({
    path: './dishesRouter/raadkey.env'
});




const loginRouter = express.Router();