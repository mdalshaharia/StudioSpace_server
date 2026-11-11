import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const PORT = process.env.PORT || 8000;

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    return client;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

app.use(cors({
  origin: [
    "http://localhost:3000",                
    "https://studio-space-ivory.vercel.app" 
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const mongoClient = await connectToMongoDB();
if (!mongoClient) {
  throw new Error("MongoDB client is not available");
}
const db = mongoClient.db("studio-space");
const studioCollection = db.collection("studios");
const studioBookingCollection = db.collection("studio-bookings");
const myStudioListingCollection = db.collection("my-listings");
const uploadsCollection = db.collection("uploads");

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token ?? req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).send({ msg: "Unauthorized! Invalid or expired token." });
  }
};

app.post("/auth/login", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ msg: "Token is required." });
  }
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ success: true });
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
  });
  res.json({ success: true });
});

app.get("/studios", async (req, res) => {
  const result = await studioCollection.find().toArray();
  res.send(result);
});

app.post("/studios", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await studioCollection.insertOne(data);
  res.send(result);
});

app.put("/studios/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const result = await studioCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );
  res.json({
    success: true,
    message: "Studio updated successfully",
    result
  });
});

app.delete("/studios/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId ?? req.user?.sub ?? req.query.userId;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid studio id." });
  }

  try {
    const result = await studioCollection.deleteOne({
      _id: new ObjectId(id),
      ownerId: userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Studio not found or you don't have permission to delete it.",
      });
    }

    res.json({ message: "Studio deleted successfully", result });
  } catch (err) {
    console.error("Failed to delete studio:", err);
    res.status(500).json({ message: "Failed to delete studio" });
  }
});

app.get("/studios/:id", async (req, res) => {
  const { id } = req.params;
  const result = await studioCollection.findOne({
    _id: new ObjectId(id) || id,
  });
  res.send(result);
});

app.post("/studio-bookings", verifyToken, async (req, res) => {
  const { studioId, date, startTime, endTime } = req.body;

  if (!studioId || !date || !startTime || !endTime) {
    return res.status(400).json({ message: "studioId, date, startTime and endTime are required." });
  }

  try {
    const conflict = await studioBookingCollection.findOne({
      studioId,
      date,
      status: { $in: ["Pending", "Confirmed"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflict) {
      return res.status(409).json({
        message: `That time clashes with an existing booking (${conflict.startTime}–${conflict.endTime} on ${date}). Please pick a different slot.`,
      });
    }

    const result = await studioBookingCollection.insertOne(req.body);
    res.send(result);
  } catch (err) {
    console.error("Failed to create booking:", err);
    res.status(500).json({ message: "Failed to create booking." });
  }
});

app.get("/studio-bookings/studio/:studioId", verifyToken, async (req, res) => {
  const { studioId } = req.params;
  const { date } = req.query;
  const query = { studioId, status: { $in: ["Pending", "Confirmed"] } };
  if (date) query.date = date;

  const result = await studioBookingCollection.find(query).toArray();
  res.send(result);
});

app.get("/studio-bookings/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  const result = await studioBookingCollection.find({ userId: userId }).toArray();
  res.send(result);
})

app.delete("/studio-bookings/:studioId", verifyToken, async (req, res) => {
  const { studioId } = req.params;
  const { userId, date, startTime, endTime } = req.query;

  if (!userId || !startTime || !endTime) {
    return res.status(400).json({ message: "userId, startTime and endTime are required." });
  }

  try {
    const result = await studioBookingCollection.deleteOne({
      studioId: studioId,
      userId: userId,
      ...(date ? { date } : {}),
      startTime: startTime,
      endTime: endTime,
    });

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
  const result = await myStudioListingCollection.find({ ownerId: userId }).toArray();
  res.send(result);
})

app.post("/my-listings", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await myStudioListingCollection.insertOne(data);
  res.send(result);
});

app.delete("/my-listings/:studioId", verifyToken, async (req, res) => {
  const { studioId } = req.params;
  const { userId } = req.query;

  try {
    const result = await myStudioListingCollection.deleteOne({
      studioId: studioId,
      ownerId: userId,
    });

    res.json(result);
  } catch (err) {
    console.error("Failed to delete listings:", err);
    res.status(500).json({ error: "Failed to delete listings" });
  }
});

app.get("/uploads/:ownerId", verifyToken, async (req, res) => {
  const { ownerId } = req.params;
  const result = await uploadsCollection.find({ ownerId }).toArray();
  res.send(result);
});

app.post("/uploads", verifyToken, async (req, res) => {
  const { ownerId, url } = req.body;
  if (!url) {
    return res.status(400).json({ message: "Image url is required." });
  }
  const result = await uploadsCollection.insertOne({
    ownerId: ownerId ?? req.user?.sub ?? "",
    url,
    createdAt: new Date().toISOString(),
  });
  res.send(result);
});

app.get("/", (req, res) => {
  res.send({ message: "Server is running fine!" });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT);
}

export default app
