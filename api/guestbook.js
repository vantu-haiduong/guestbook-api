import { MongoClient } from "mongodb";

let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(process.env.MONGODB_URI);
  clientPromise = client.connect();
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("guestbook");
    const collection = db.collection("messages");

    if (req.method === "POST") {
      const { name, email, message } = req.body || {};

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const doc = {
        name: name || "Ẩn danh",
        email: email || null,   // 👈 thêm email
        message,
        createdAt: new Date(),
      };

      await collection.insertOne(doc);
      return res.status(201).json({ success: true, doc });
    }

    if (req.method === "GET") {
      const messages = await collection
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      return res.status(200).json(messages);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
