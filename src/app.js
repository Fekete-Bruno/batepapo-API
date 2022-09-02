import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());

app.listen(5000,()=>console.log("Listening on port 5000..."));