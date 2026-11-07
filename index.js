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

/* one shared JWKS client — creating it per-request would re-fetch keys
   from the auth server on every call */
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }

  try {
    await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    // invalid or expired token is an auth failure, not a server error
    return res.status(401).send({ msg: "Unauthorized! Invalid or expired token." });
  }
};



app.get("/studios", async (req, res) => {
  const result = await studioCollection.find().toArray();
  res.send(result);
});



app.post("/studios", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await studioCollection.insertOne(data);
  // console.log(result);
  res.send(result);
});


app.put("/studios/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  console.log(updatedData)

    const result = await studioCollection.updateOne(
      { _id: new ObjectId(id) }, // Match by document _id
      { $set: updatedData }      // Overwrite/update the fields provided in the body
    );
    console.log(result)
    res.json({ 
      success: true, 
      message: "Booking updated successfully", 
      result 
    });
});

app.delete("/studios/:studioId", verifyToken, async (req, res) => {
  const { studioId } = req.params;
  const { userId } = req.query; // Grabbing userId from query parameters
  console.log( 'from delete' ,studioId, userId)

  try {
    const result = await studioCollection.deleteOne({
      _id: new ObjectId(studioId),
      ownerId : userId, // Matches both fields for security and accuracy
    });
    console.log("Delete result:", result);
    res.json(result);
  } catch (err) {
    console.error("Failed to delete studio:", err);
    res.status(500).json({ error: "Failed to delete studio" });
  }
});

app.get("/studios/:id", async (req, res) => {
  const { id } = req.params;
  const result = await studioCollection.findOne({
    _id: new ObjectId(id),
  });
  res.send(result);
})

app.post("/studio-bookings", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await studioBookingCollection.insertOne(data);
  // console.log(result);
  res.send(result);
});

app.get("/studio-bookings/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  const userIdString = userId.toString();
  // console.log(userId);
  const result = await studioBookingCollection.find({ userId: userId }).toArray();
  // console.log(result);
  res.send(result);
})

app.delete("/studio-bookings/:studioId", verifyToken, async (req, res) => {
  const { studioId } = req.params;
  const { userId } = req.query; // Grabbing userId from query parameters

  try {
    const result = await studioBookingCollection.deleteOne({
      studioId: studioId,
      userId: userId, // Matches both fields for security and accuracy
    });

    // console.log("Delete result:", result);
    res.json(result);
  } catch (err) {
    console.error("Failed to delete booking:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

app.patch("/studio-bookings/:bookingId", verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const data = req.body;
  const result = await studioBookingCollection.updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: data },
  );
  res.json(result);
});

app.get("/my-listings/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  // const userIdString = userId.toString();
  // console.log(userId);
  const result = await myStudioListingCollection.find({ ownerId: userId }).toArray();
  // console.log(result);
  res.send(result);
})

app.post("/my-listings", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await myStudioListingCollection.insertOne(data);
  // console.log(result);
  res.send(result);
});

app.delete("/my-listings/:studioId", verifyToken, async (req, res) => {
  const { studioId } = req.params;
  const { userId } = req.query; // Grabbing userId from query parameters

  try {
    const result = await myStudioListingCollection.deleteOne({
      studioId: studioId,
      ownerId: userId, // Matches both fields for security and accuracy
    });

    // console.log("Delete result:", result);
    res.json(result);
  } catch (err) {
    console.error("Failed to delete listings:", err);
    res.status(500).json({ error: "Failed to delete listings" });
  }
});









//http://localhost:8000/my-bookings/

app.get("/", (req, res) => {
  res.send({ message: "Server is running fine!" });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

export default app