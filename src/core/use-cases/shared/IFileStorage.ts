export interface IFileStorage {
  saveFile(path: string, content: Buffer | string, contentType: string): Promise<void>;
}
