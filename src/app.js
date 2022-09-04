import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
dotenv.config();

const participantsSchema = joi.object({
    name: joi.string().required().min(1)
});
const messagesSchema = joi.object({
    from: joi.string().required().min(1),
    to: joi.string().required().min(1),
    text: joi.string().required().min(1),
    type: joi.string().required().valid("message","private_message")
});

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI); 

let db;
mongoClient.connect().then(()=>{
    db=mongoClient.db("test");
});

app.get('/participants',async (req,res)=>{
    try {
        const participants = await db.collection("participants").find().toArray();
        res.send(participants);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);   
    }
});

app.post('/participants',async(req,res)=>{
    // To-DO: Change to {name}
    const participant = req.body;

    const validation = participantsSchema.validate(participant,{ abortEarly: false });
    if(validation.error){
        console.error(validation.error.details.map((detail)=>{return detail.message}));
        return res.sendStatus(422);
    }

    try {
        const isRepeated = await db.collection("participants").findOne(participant);
        if(isRepeated){
            console.error("REPEATED USERNAME");
            return res.sendStatus(409);
        }
        const time = Date.now()
        await db.collection('participants').insertOne({...participant,lastStatus:time });
        await db.collection('messages').insertOne({
            from:participant.name,
            to:'Todos',
            text:'entra na sala...',
            type:'status',
            time:dayjs(time).format('HH:mm:ss'),
        });
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }

    return res.sendStatus(201);
});


app.post('/messages',async (req,res)=>{
    const from = req.headers.user;
    const { to, text, type } = req.body;
    const message = { from, to, text, type };
    const validation = messagesSchema.validate(message,{ abortEarly: false });
    if(validation.error){
        console.error(validation.error.details.map((detail)=>{return detail.message}));
        return res.sendStatus(422);
    }

    try {
        const isParticipant = await db.collection("participants").findOne({name: from});
        if(!isParticipant){
            console.error("NOT A PARTICIPANT");
            return res.sendStatus(422);
        }
        const date = Date.now();
        message.time = dayjs(date).format('HH:mm:ss');
        console.log(message);

    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }

    return res.sendStatus(201);

});


app.listen(5000,()=>console.log("Listening on port 5000..."));