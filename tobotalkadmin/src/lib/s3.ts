import { S3Client } from "@aws-sdk/client-s3";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Default fallback from env
const defaultEndpoint = import.meta.env.VITE_R2_ENDPOINT;
const defaultAccessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const defaultSecretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;

export async function getS3Client() {
  // Try to get dynamic config from Firestore first
  try {
    const configDoc = await getDoc(doc(db, "admin_config", "config"));
    if (configDoc.exists()) {
      const data = configDoc.data();
      if (data.r2_endpoint && data.r2_access_key_id && data.r2_secret_access_key) {
        return {
          client: new S3Client({
            region: "auto",
            endpoint: data.r2_endpoint,
            forcePathStyle: true,
            credentials: {
              accessKeyId: data.r2_access_key_id,
              secretAccessKey: data.r2_secret_access_key,
            },
          }),
          bucket: data.r2_bucket || import.meta.env.VITE_R2_BUCKET,
          directory: data.r2_directory || import.meta.env.VITE_R2_DIRECTORY,
          publicUrl: data.r2_public_url || data.r2_endpoint
        };
      }
    }
  } catch (e) {
    console.error("Error fetching R2 config from Firestore:", e);
  }

  // Fallback to env
  return {
    client: new S3Client({
      region: "auto",
      endpoint: defaultEndpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: defaultAccessKeyId,
        secretAccessKey: defaultSecretAccessKey,
      },
    }),
    bucket: import.meta.env.VITE_R2_BUCKET,
    directory: import.meta.env.VITE_R2_DIRECTORY,
    publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || defaultEndpoint
  };
}
