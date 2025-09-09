import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
let db;

// Kết nối MongoDB (giữ connection khi hot reload trên Vercel)
async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("guestbook"); // Tên DB
  }
  return db;
}

export default async function handler(req, res) {
  // ✅ CORS: chỉ cho phép domain frontend của bạn
  res.setHeader("Access-Control-Allow-Origin", "https://vantu-haiduong.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const db = await connectDB();
    const wishes = db.collection("wishes");

    if (req.method === "GET") {
      const allWishes = await wishes.find().sort({ _id: -1 }).toArray();
      return res.status(200).json(allWishes);
    }

    if (req.method === "POST") {
      const { name, email, content, captcha } = req.body;

      if (!name || !content) {
        return res.status(400).json({ error: "Tên và lời chúc không được để trống" });
      }
      if (content.length < 10) {
        return res.status(400).json({ error: "Lời chúc phải nhiều hơn 10 ký tự" });
      }

      // ✅ Xác minh captcha
      const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`,
      });
      const data = await verify.json();
      if (!data.success) {
        return res.status(400).json({ error: "Captcha verification failed" });
      }

      const newWish = { name, email, content, createdAt: new Date() };
      await wishes.insertOne(newWish);

      return res.status(201).json({ message: "Gửi lời chúc thành công!", wish: newWish });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Lỗi server:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
