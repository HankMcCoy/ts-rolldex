import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
	if (cachedClient) return cachedClient;
	cachedClient = new S3Client({
		region: "auto",
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
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
			Bucket: env.R2_BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export async function deleteObject(key: string): Promise<void> {
	await getClient().send(
		new DeleteObjectCommand({
			Bucket: env.R2_BUCKET,
			Key: key,
		}),
	);
}

const PUBLIC_BASE_URL = env.R2_PUBLIC_BASE_URL.replace(/\/$/, "");

export function publicUrlFor(key: string): string {
	return `${PUBLIC_BASE_URL}/${key}`;
}
