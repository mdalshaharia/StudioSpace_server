import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";
const app = express();
const PORT = 8000;

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

app.use(cors());
app.use(express.json());

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studio-space");
const studioCollection = db.collection("studios"); 
const studioBookingCollection = db.collection("studio-bookings"); 






app.get("/studios", async (req, res) => {
  const result = await studioCollection.find().toArray();
  res.send(result);
});

app.get("/studios/:id", async (req, res) => {
  const { id } = req.params;
  const result = await studioCollection.findOne({
    _id: new ObjectId(id),
  });
  res.send(result);
})

app.post("/studio-bookings", async (req, res) => {
  const data = req.body;
  const result = await studioBookingCollection.insertOne(data);
  console.log(result);
  res.send(result);
});












//http://localhost:8000/my-bookings/

app.get("/", (req, res) => {
  res.send({ message: "Server is running fine!" });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

export default app