import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import { ensureDir } from "../lib/fs.js";

export class DocumentRepository {
  constructor(metadataFile) {
    this.metadataFile = metadataFile;
    ensureDir(path.dirname(this.metadataFile));
    if (!fs.existsSync(this.metadataFile)) {
      fs.writeFileSync(this.metadataFile, "[]", "utf8");
    }
  }

  async readAll() {
    const raw = await fsPromises.readFile(this.metadataFile, "utf8");
    return JSON.parse(raw);
  }

  async writeAll(documents) {
    await fsPromises.writeFile(this.metadataFile, JSON.stringify(documents, null, 2), "utf8");
  }

  async list() {
    const documents = await this.readAll();
    return documents.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getById(documentId) {
    const documents = await this.readAll();
    return documents.find((document) => document.id === documentId) || null;
  }

  async create(document) {
    const documents = await this.readAll();
    documents.push(document);
    await this.writeAll(documents);
    return document;
  }

  async update(documentId, updater) {
    const documents = await this.readAll();
    const index = documents.findIndex((document) => document.id === documentId);

    if (index === -1) {
      return null;
    }

    const nextValue =
      typeof updater === "function" ? updater(documents[index]) : { ...documents[index], ...updater };
    documents[index] = nextValue;
    await this.writeAll(documents);
    return nextValue;
  }

  async remove(documentId) {
    const documents = await this.readAll();
    const existing = documents.find((document) => document.id === documentId) || null;
    const filtered = documents.filter((document) => document.id !== documentId);
    await this.writeAll(filtered);
    return existing;
  }
}
