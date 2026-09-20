import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { ok, internalError, validationError } from '../lib/responses';

const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || 'back2life-uploads-dev';

const s3Client = new S3Client({ region: REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    let contentType = 'application/octet-stream';
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        if (body.contentType) {
          contentType = body.contentType;
        }
      } catch {
        return validationError('Request body must be valid JSON');
      }
    }

    const fileExtension = contentType === 'image/jpeg' ? '.jpg' : contentType === 'image/png' ? '.png' : '';
    const key = `uploads/${uuidv4()}${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // URL expires in 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    const fileUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;

    return ok({
      uploadUrl,
      fileUrl,
      expiresIn: 900,
    });
  } catch (error) {
    console.error('[getUploadUrl] Unexpected error:', error);
    return internalError('generating upload URL');
  }
};
