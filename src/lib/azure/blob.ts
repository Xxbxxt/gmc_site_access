import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const SAS_EXPIRY_MINUTES = 15;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseConnectionString(connectionString: string): {
  accountName: string;
  accountKey: string;
} {
  const accountName = /AccountName=([^;]+)/.exec(connectionString)?.[1];
  const accountKey = /AccountKey=([^;]+)/.exec(connectionString)?.[1];
  if (!accountName || !accountKey) {
    throw new Error("Invalid AZURE_STORAGE_CONNECTION_STRING");
  }
  return { accountName, accountKey };
}

let cachedClient: BlobServiceClient | undefined;
let cachedCredential: StorageSharedKeyCredential | undefined;

function getBlobServiceClient(): BlobServiceClient {
  if (!cachedClient) {
    cachedClient = BlobServiceClient.fromConnectionString(
      requireEnv("AZURE_STORAGE_CONNECTION_STRING"),
    );
  }
  return cachedClient;
}

function getSharedKeyCredential(): StorageSharedKeyCredential {
  if (!cachedCredential) {
    const { accountName, accountKey } = parseConnectionString(
      requireEnv("AZURE_STORAGE_CONNECTION_STRING"),
    );
    cachedCredential = new StorageSharedKeyCredential(accountName, accountKey);
  }
  return cachedCredential;
}

export type UploadBlobInput = {
  engagementId: string;
  docType: string;
  file: File;
};

export async function uploadBlob(input: UploadBlobInput): Promise<string> {
  const containerClient = getBlobServiceClient().getContainerClient(
    requireEnv("AZURE_STORAGE_CONTAINER_NAME"),
  );
  await containerClient.createIfNotExists();

  const blobPath = `engagements/${input.engagementId}/${input.docType}/${input.file.name}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

  const buffer = Buffer.from(await input.file.arrayBuffer());
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: input.file.type },
  });

  return blockBlobClient.url;
}

function parseBlobUrl(blobUrl: string): {
  containerName: string;
  blobPath: string;
} {
  const url = new URL(blobUrl);
  const [, containerName, ...blobPathParts] = url.pathname.split("/");
  return { containerName, blobPath: blobPathParts.join("/") };
}

export async function deleteBlob(blobUrl: string): Promise<void> {
  const { containerName, blobPath } = parseBlobUrl(blobUrl);
  const containerClient =
    getBlobServiceClient().getContainerClient(containerName);
  await containerClient.getBlockBlobClient(blobPath).deleteIfExists();
}

export async function generateSasUrl(blobUrl: string): Promise<string> {
  const { containerName, blobPath } = parseBlobUrl(blobUrl);

  const containerClient =
    getBlobServiceClient().getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

  const expiresOn = new Date(Date.now() + SAS_EXPIRY_MINUTES * 60 * 1000);
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    getSharedKeyCredential(),
  ).toString();

  return `${blockBlobClient.url}?${sasToken}`;
}
