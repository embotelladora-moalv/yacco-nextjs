import { IFileStorage } from "@/core/use-cases/shared/IFileStorage";
import { adminStorage } from "@/services/firebase/admin";

export class FirebaseFileStorage implements IFileStorage {
  async saveFile(path: string, content: Buffer | string, contentType: string): Promise<void> {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error("Falta FIREBASE_STORAGE_BUCKET");
    const bucket = adminStorage.bucket(bucketName);
    await bucket.file(path).save(content, { contentType });
  }
}
