import 'dotenv/config';
import { CreateBucketCommand, PutBucketPolicyCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { s3, BUCKET_NAME, STORAGE_ENDPOINT } from '../config/storage';

async function init() {
  console.log(`Checking for bucket "${BUCKET_NAME}" at ${STORAGE_ENDPOINT}...`);

  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`Bucket "${BUCKET_NAME}" already exists.`);
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`Bucket "${BUCKET_NAME}" not found. Creating...`);
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`Bucket "${BUCKET_NAME}" created successfully.`);
    } else {
      throw error;
    }
  }

  // Profile photos and chat media are served by plain URL. KYC videos (users/<id>/kyc/*) are
  // identity documents and stay private — they are only reachable through signed URLs.
  console.log(`Setting read policy for "${BUCKET_NAME}" (photos + chat public, KYC private)...`);
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadPhotosAndChat',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [
          `arn:aws:s3:::${BUCKET_NAME}/users/*/photos/*`,
          `arn:aws:s3:::${BUCKET_NAME}/chats/*`,
        ],
      },
    ],
  };

  await s3.send(new PutBucketPolicyCommand({
    Bucket: BUCKET_NAME,
    Policy: JSON.stringify(policy),
  }));

  console.log('Storage initialization complete.');
}

init().catch((error) => {
  console.error('Storage initialization failed:', error?.message || error);
  console.error('Is MinIO running? Start it with: minio server ~/minio_data --console-address :9001');
  process.exit(1);
});
