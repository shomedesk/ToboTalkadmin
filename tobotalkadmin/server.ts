import express from "express";
import cors from "cors";
import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Multer setup for temporary storage
  const upload = multer({ dest: "uploads/" });

  // API Route for Upload
  app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
    try {
      const file = req.file;
      const { endpoint, accessKeyId, secretAccessKey, bucket, directory } = req.body;

      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const s3Client = new S3Client({
        region: "auto",
        endpoint: endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });

      let cleanDir = directory || "";
      if (cleanDir && !cleanDir.endsWith("/")) cleanDir += "/";
      if (cleanDir.startsWith("/")) cleanDir = cleanDir.substring(1);

      const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
      const key = `${cleanDir}${fileName}`;

      const fileStream = fs.createReadStream(file.path);

      const parallelUploads3 = new Upload({
        client: s3Client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: fileStream,
          ContentType: file.mimetype,
        },
      });

      await parallelUploads3.done();

      // Clean up temp file
      fs.unlinkSync(file.path);

      const { r2_public_url } = req.body;
      const finalPublicUrl = r2_public_url || endpoint;

      const publicUrl = finalPublicUrl.includes("cloudflarestorage.com")
        ? `${finalPublicUrl}/${bucket}/${key}`
        : `${finalPublicUrl.endsWith("/") ? finalPublicUrl : finalPublicUrl + "/"}${key}`;

      res.json({ url: publicUrl });
    } catch (error) {
      console.error("Server upload error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
