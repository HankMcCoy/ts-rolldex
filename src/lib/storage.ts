import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
	if (cachedClient) return cachedClient;
	const accountId = requireEnv("R2_ACCOUNT_ID");
	cachedClient = new S3Client({
		region: "auto",
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
			secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
		},
	});
	return cachedClient;
}

export async function uploadObject(
	key: string,
	body: Uint8Array,
	contentType: string,
): Promise<void> {
	await getClient().send(
		new PutObjectCommand({
			Bucket: requireEnv("R2_BUCKET"),
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export async function deleteObject(key: string): Promise<void> {
	await getClient().send(
		new DeleteObjectCommand({
			Bucket: requireEnv("R2_BUCKET"),
			Key: key,
		}),
	);
}

export function publicUrlFor(key: string): string {
	const base = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
	return `${base}/${key}`;
}
