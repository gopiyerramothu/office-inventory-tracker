import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  RekognitionClient,
  DetectLabelsCommand,
} from "@aws-sdk/client-rekognition";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const rekognition = new RekognitionClient({});
const TABLE = process.env.TABLE_NAME;
const BUCKET = process.env.IMAGE_BUCKET;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export const handler = async (event) => {
  const { httpMethod, resource, body, queryStringParameters, pathParameters } =
    event;

  try {
    // GET /items — list all inventory
    if (httpMethod === "GET" && resource === "/items") {
      const { Items = [] } = await ddb.send(
        new ScanCommand({ TableName: TABLE })
      );
      return { statusCode: 200, headers, body: JSON.stringify(Items) };
    }

    // POST /items — add new item
    if (httpMethod === "POST" && resource === "/items") {
      const data = JSON.parse(body);
      const item = {
        id: randomUUID(),
        name: data.name,
        category: data.category || "General",
        addedBy: data.addedBy || "Anonymous",
        imageUrl: data.imageUrl || null,
        notes: data.notes || "",
        createdAt: new Date().toISOString(),
      };
      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }

    // DELETE /items/{id}
    if (httpMethod === "DELETE" && resource === "/items/{id}") {
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { id: pathParameters.id },
        })
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ deleted: true }),
      };
    }

    // GET /upload-url — get presigned URL for image upload
    if (httpMethod === "GET" && resource === "/upload-url") {
      const key = `uploads/${randomUUID()}.jpg`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 300 }
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ uploadUrl: url, key }),
      };
    }

    // POST /detect — detect equipment from image using Rekognition
    if (httpMethod === "POST" && resource === "/detect") {
      const { key } = JSON.parse(body);
      const result = await rekognition.send(
        new DetectLabelsCommand({
          Image: { S3Object: { Bucket: BUCKET, Name: key } },
          MaxLabels: 10,
          MinConfidence: 70,
        })
      );
      const labels = (result.Labels || []).map((l) => ({
        name: l.Name,
        confidence: Math.round(l.Confidence),
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ labels }) };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
