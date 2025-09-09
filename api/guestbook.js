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
      const { name, email, message, captcha } = req.body || {};

      // Validate dữ liệu
      if (!name || !message) {
        return res.status(400).json({ error: "Tên và lời chúc không được để trống" });
      }
      if (message.length < 10) {
        return res.status(400).json({ error: "Lời chúc phải ít nhất 10 ký tự" });
      }

      // Kiểm tra captcha
      const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`,
      });
      const data = await verify.json();
      if (!data.success) {
        return res.status(400).json({ error: "Captcha verification failed" });
      }

      // Lưu vào MongoDB
      const doc = {
        name: name.trim(),
        email: email || null,
        message: message.trim(),
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
