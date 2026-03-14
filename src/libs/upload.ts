import { S3Client, DeleteObjectCommand, PutObjectCommandInput, PutObjectCommand } from '@aws-sdk/client-s3';


//Configs
import { AWS_BUCKET_NAME, AWS_BUCKET_REGION, AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY, } from '../config';

//S3 Configuration
export const s3 = new S3Client({
  region: AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export function getS3UploadParams(
  key: string,
  buffer: Buffer,
  mimetype: string
): PutObjectCommandInput {
  return {
    Bucket: AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  };
}

export function generateS3Url(key: string): string {
  return `https://s3.${AWS_BUCKET_REGION}.amazonaws.com/${AWS_BUCKET_NAME}/${encodeURIComponent(key)}`;
}

//File upload function
export const uploadFileToS3 = async (filename: string, buffer: Buffer, mimetype: string): Promise<string> => {
  const uploadParams = getS3UploadParams(filename, buffer, mimetype);
  await s3.send(new PutObjectCommand(uploadParams));
  return generateS3Url(filename);
};

//Delete file from the bucket
export async function deleteFileFromS3(fileUrl: string): Promise<boolean> {
  const match = fileUrl.match(
    /https:\/\/(.+?)\.s3\.(.+?)\.amazonaws\.com\/(.+)/
  );

  if (!match) return false;

  const [, bucket, region, key] = match;

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);
  return response.$metadata.httpStatusCode === 204;
}
