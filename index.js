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
const myStudioListingCollection = db.collection("my-listings"); 






app.get("/studios", async (req, res) => {
  const result = await studioCollection.find().toArray();
  res.send(result);
});


app.post("/studios", async (req, res) => {
  const data = req.body;
  const result = await studioCollection.insertOne(data);
  console.log(result);
  res.send(result);
});

app.get("/studios/:id", async (req, res) => {
  const { id } = req.params;
  const result = await studioCollection.findOne({
    _id: new ObjectId(id),
  });
  res.send(result);
})

app.put("/studios/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid studio id." });
  }
  const data = req.body;
  const result = await studioCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: data }
  );
  if (result.matchedCount === 0) {
    return res.status(404).json({ message: "Studio not found." });
  }
  res.json(result);
});

app.delete("/studios/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid studio id." });
  }
  const result = await studioCollection.deleteOne({
    _id: new ObjectId(id),
  });
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Studio not found." });
  }
  res.json(result);
});

app.post("/studio-bookings", async (req, res) => {
  const data = req.body;
  const result = await studioBookingCollection.insertOne(data);
  console.log(result);
  res.send(result);
});

app.get("/studio-bookings/:userId", async (req, res) => {
  const { userId } = req.params;
  const userIdString = userId.toString();
  console.log(userId);
  const result = await studioBookingCollection.find({ userId: userId }).toArray();
  console.log(result);
  res.send(result);
})

app.delete("/studio-bookings/:productId", async (req, res) => {
  const { productId } = req.params;
  const result = await studioBookingCollection.deleteOne({
    productId: productId
  });
  res.json(result);
});

app.patch("/studio-bookings/:bookingId", async (req, res) => {
  const { bookingId } = req.params;
  const data = req.body;
  const result = await studioBookingCollection.updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: data },
  );
  res.json(result);
});

app.get("/my-listings/:userId", async (req, res) => {
  const { userId } = req.params;
  // const userIdString = userId.toString();
  console.log(userId);
  const result = await myStudioListingCollection.find({ ownerId: userId }).toArray();
  console.log(result);
  res.send(result);
})

app.post("/my-listings", async (req, res) => {
  const data = req.body;
  const result = await myStudioListingCollection.insertOne(data);
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