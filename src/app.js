import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
import { stripHtml } from 'string-strip-html';
dotenv.config();

const participantSchema = joi.object({name:joi.string().required().min(1)});
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
let collectionM;
let collectionP
mongoClient.connect().then(()=>{
    db=mongoClient.db("test");
    collectionP = db.collection('participants');
    collectionM = db.collection('messages');
});


const interval = 15000;
const tenSeconds = 10000;

setInterval(async() => {
    try {
        const participants = await collectionP.find().toArray();
        const date = Date.now();
        await collectionP.deleteMany({"lastStatus":{$lt:date-tenSeconds}});
        const oldParticipants = participants.filter((p)=>(p.lastStatus<date-tenSeconds));
        const messages = [];
        oldParticipants.forEach(p => {
            messages.push({
                from:p.name,
                to:"Todos",
                text:"sai da sala...",
                type:"status",
                time: dayjs(date).format('HH:mm:ss')
            });
        });
        if(messages.length>0){
            await collectionM.insertMany(messages);
        }
    } catch (error) {
        console.error(error);
    }
}, interval);

app.delete('/messages/:messageId',async(req,res)=>{
    const userReq =  req.headers.user;
    const user = stripHtml(userReq).result.trim();
    const messageId = req.params.messageId;
    try {
        const message = await collectionM.find({_id: ObjectId(messageId)}).toArray();
        if(!message){
            console.log('404')
            return res.sendStatus(404);
        }
        if(message[0].from!==user){
            return res.sendStatus(401);
        }
        await collectionM.deleteOne({"_id": ObjectId(messageId)});
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }

    return res.sendStatus(200);

});

app.get('/participants',async (req,res)=>{
    try {
        const participants = await collectionP.find().toArray();
        res.send(participants);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);   
    }
});

app.get('/messages',async(req,res)=>{
    const limit = parseInt(req.query.limit);
    const userReq =  req.headers.user;
    const user = stripHtml(userReq).result.trim();
    try {
        const allMessages = await collectionM.find().toArray();
        const messages = allMessages.filter((mes)=>{
            if(mes.from===user||mes.to===user||mes.to==="Todos"||mes.type==="message"){
                return true
            }
        });
        if(limit){
            messages.reverse();
            return res.send(messages.filter((e,index)=>{return index<limit;}).reverse());
        }
        return res.send(messages);
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
});

app.post('/participants',async(req,res)=>{
    const { name } = req.body;
    const nameStrip = stripHtml(name).result.trim();
    const participant = { name:nameStrip }

    const validation = participantSchema.validate(participant,{ abortEarly: false });
    if(validation.error){
        console.error(validation.error.details.map((detail)=>{return detail.message}));
        return res.sendStatus(422);
    }

    try {
        const isRepeated = await collectionP.findOne(participant);
        if(isRepeated){
            console.error("REPEATED USERNAME");
            return res.sendStatus(409);
        }
        const time = Date.now()
        await collectionP.insertOne({...participant,lastStatus:time });
        await collectionM.insertOne({
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

    const fromStrip = stripHtml(from).result.trim();
    const toStrip = stripHtml(to).result.trim();
    const textStrip = stripHtml(text).result.trim();
    const typeStrip = stripHtml(type).result.trim();

    const message = { from:fromStrip, to:toStrip, text:textStrip, type:typeStrip };
    const validation = messagesSchema.validate(message,{ abortEarly: false });
    if(validation.error){
        console.error(validation.error.details.map((detail)=>{return detail.message}));
        return res.sendStatus(422);
    }

    try {
        const isParticipant = await collectionP.findOne({name: from});
        if(!isParticipant){
            console.error("NOT A PARTICIPANT");
            return res.sendStatus(422);
        }
        const date = Date.now();
        message.time = dayjs(date).format('HH:mm:ss');
        await collectionM.insertOne(message);
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }

    return res.sendStatus(201);
});

app.post('/status',async(req,res)=>{
    const userReq = req.headers.user;
    const user = stripHtml(userReq).result.trim();
    try {
        const participant = await collectionP.findOne({name: user});
        if(!participant){
            console.error("NOT A PARTICIPANT");
            return res.sendStatus(404);
        }
        const date = Date.now();
        await collectionP.updateOne(
            {name:user},
            {$set:{lastStatus:date}}
        );
        return res.sendStatus(200);
    } catch (error) {
        console.error(error);
        return res.sendStatus(500);
    }
});

app.listen(5000,()=>console.log("Listening on port 5000..."));