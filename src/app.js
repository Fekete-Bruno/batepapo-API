import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
dotenv.config();

const participantsSchema = joi.object({
    name: joi.string().required().min(1)
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/participants',(req,res)=>{
    const participant = req.body;

    const validation = participantsSchema.validate(participant,{ abortEarly: false });
    if(validation.error){
        console.log(validation.error.details.map((detail)=>{return detail.message}));
        return res.sendStatus(422);
    }

    return res.sendStatus(201);
});

app.listen(5000,()=>console.log("Listening on port 5000..."));