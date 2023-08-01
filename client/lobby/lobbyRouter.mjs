import express from 'express';
import dotenv from 'dotenv';
dotenv.config({
    path: './dishesRouter/raadkey.env'
});


const router = express.Router();



router.post(`/lobby/url`,(req,res)=>{
 console.log('my ms : is');
 // pool.query("INSERT INTO users (msgss) VALUES (?))",
 //  [msgs],
 //      (error, results) => {
 //      console.log(msgs);
 //  });

})


export default router;